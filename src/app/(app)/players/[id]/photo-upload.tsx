"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { setPlayerPhoto } from "../actions";

const MAX_DIMENSION = 512;
const MAX_BYTES = 2 * 1024 * 1024;

async function resizeToJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process this image.");
  }
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process this image."))),
      "image/jpeg",
      0.85
    );
  });
}

export function PhotoUpload({
  playerId,
  parentId,
  currentPhotoUrl,
}: {
  playerId: string;
  parentId: string;
  currentPhotoUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const resized = await resizeToJpeg(file);
      if (resized.size > MAX_BYTES) {
        throw new Error("This photo is too large even after resizing.");
      }

      const path = `${parentId}/${playerId}.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("player-photos")
        .upload(path, resized, { upsert: true, contentType: "image/jpeg" });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      await setPlayerPhoto(playerId, path);

      const { data: signedUrl } = await supabase.storage
        .from("player-photos")
        .createSignedUrl(path, 3600);

      setPreview(signedUrl?.signedUrl ?? null);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload this photo."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 overflow-hidden rounded-full bg-slate-100">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-400 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
