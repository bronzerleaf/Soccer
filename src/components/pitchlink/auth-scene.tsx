"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// A soft, decorative gradient used whenever WebGL isn't available, fails
// to initialize, or the visitor has asked for reduced motion — same
// "outdoor pitch, goal in the distance" impression, just as a static
// image instead of an animated scene. Never shown alongside an error;
// this degrade is silent by design (AUTH_SCENE_SPEC.md).
function StaticFallback({ palette }: { palette: DayPalette }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `linear-gradient(to bottom, ${palette.sky} 0%, ${palette.sky} 55%, ${palette.pitch} 55%, ${palette.pitchFar} 100%)`,
      }}
    >
      <div
        className="absolute left-1/2 top-[62%] h-10 w-24 -translate-x-1/2 rounded-t-md border-2 border-white/70"
        style={{ borderBottom: "none" }}
      />
      <div className="absolute left-1/2 top-[78%] h-3 w-3 -translate-x-1/2 rounded-full bg-white/90" />
    </div>
  );
}

type DayPalette = {
  sky: string;
  pitch: string;
  pitchFar: string;
  ambient: number;
  ambientIntensity: number;
  sun: number;
  sunIntensity: number;
  fog: number;
};

// Real local time of day, nothing fabricated. No weather integration —
// that would need an external API this app doesn't have; time-of-day
// alone already satisfies "may silently adapt to local time."
function paletteForHour(hour: number): DayPalette {
  if (hour < 5 || hour >= 21) {
    return { sky: "#0b1524", pitch: "#0e2a1a", pitchFar: "#081a10", ambient: 0x3a4a6b, ambientIntensity: 0.55, sun: 0x8fa8ff, sunIntensity: 0.35, fog: 0x0b1524 };
  }
  if (hour < 7) {
    return { sky: "#3a3350", pitch: "#1f3d24", pitchFar: "#13291a", ambient: 0x6b5a7a, ambientIntensity: 0.7, sun: 0xffb27a, sunIntensity: 0.65, fog: 0x3a3350 };
  }
  if (hour < 17) {
    return { sky: "#bfe0f5", pitch: "#2f8a3e", pitchFar: "#1f6a2c", ambient: 0xffffff, ambientIntensity: 0.85, sun: 0xffffff, sunIntensity: 1.1, fog: 0xbfe0f5 };
  }
  if (hour < 19) {
    return { sky: "#e8a35a", pitch: "#28703a", pitchFar: "#194c25", ambient: 0xffcf9e, ambientIntensity: 0.75, sun: 0xffa14d, sunIntensity: 0.9, fog: 0xe8a35a };
  }
  return { sky: "#2c2a4a", pitch: "#173a22", pitchFar: "#0e2416", ambient: 0x554a7a, ambientIntensity: 0.6, sun: 0x8a6fd6, sunIntensity: 0.5, fog: 0x2c2a4a };
}

// A checker-ish soccer ball texture drawn on a canvas — procedural, per
// AUTH_SCENE_SPEC.md's "no external 3D model required."
function makeBallTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f5f5f3";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#1f2937";
  const cell = size / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if ((x + y) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildScene(container: HTMLDivElement, palette: DayPalette) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.fog, 14, 34);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  const baseCameraPos = new THREE.Vector3(0.4, 1.6, 7.5);
  camera.position.copy(baseCameraPos);
  camera.lookAt(0, 0.8, -10);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Pitch
  const pitchMat = new THREE.MeshStandardMaterial({ color: palette.pitch, roughness: 0.95 });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(40, 60), pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.z = -14;
  scene.add(pitch);

  // Halfway + goal-box lines (thin white boxes, cheap and crisp at any distance)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
  const halfway = new THREE.Mesh(new THREE.PlaneGeometry(14, 0.08), lineMat);
  halfway.rotation.x = -Math.PI / 2;
  halfway.position.set(0, 0.01, -4);
  scene.add(halfway);
  const goalBox = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.08), lineMat);
  goalBox.rotation.x = -Math.PI / 2;
  goalBox.position.set(0, 0.01, -16);
  scene.add(goalBox);
  [-3, 3].forEach((x) => {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 4), lineMat);
    side.rotation.x = -Math.PI / 2;
    side.position.set(x, 0.01, -18);
    scene.add(side);
  });

  // Goal: posts + crossbar + a loose net grid
  const goalGroup = new THREE.Group();
  goalGroup.position.set(0, 0, -20);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.4, metalness: 0.1 });
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10);
  const postL = new THREE.Mesh(postGeo, postMat);
  postL.position.set(-2.6, 1.1, 0);
  const postR = new THREE.Mesh(postGeo, postMat);
  postR.position.set(2.6, 1.1, 0);
  const crossbarGeo = new THREE.CylinderGeometry(0.06, 0.06, 5.2, 10);
  const crossbar = new THREE.Mesh(crossbarGeo, postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 2.2, 0);
  goalGroup.add(postL, postR, crossbar);

  const netMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  const netPoints: number[] = [];
  const netDepth = 1.1;
  for (let i = 0; i <= 10; i++) {
    const x = -2.6 + (i / 10) * 5.2;
    netPoints.push(x, 2.2, 0, x, 0, 0.02);
    netPoints.push(x, 2.2, 0, x, 2.2 - netDepth, netDepth);
  }
  for (let i = 0; i <= 6; i++) {
    const y = (i / 6) * 2.2;
    netPoints.push(-2.6, y, 0, 2.6, y, 0);
  }
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute("position", new THREE.Float32BufferAttribute(netPoints, 3));
  goalGroup.add(new THREE.LineSegments(netGeo, netMat));
  scene.add(goalGroup);

  // Ball
  const ballTexture = makeBallTexture();
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 20),
    new THREE.MeshStandardMaterial({ map: ballTexture, roughness: 0.6 })
  );
  const ballStart = new THREE.Vector3(-0.3, 0.28, 4.5);
  const ballEnd = new THREE.Vector3(0.15, 0.28, -19.3);
  ball.position.copy(ballStart);
  scene.add(ball);

  // Lights
  const ambient = new THREE.AmbientLight(palette.ambient, palette.ambientIntensity);
  const sun = new THREE.DirectionalLight(palette.sun, palette.sunIntensity);
  sun.position.set(-6, 10, 4);
  scene.add(ambient, sun);

  function resize() {
    const { clientWidth, clientHeight } = container;
    if (clientWidth === 0 || clientHeight === 0) return;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }
  resize();

  return { scene, camera, renderer, ball, ballStart, ballEnd, baseCameraPos, resize };
}

const SHOT_DURATION_S = 3.2;
const PAUSE_S = 1.1;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl2") || canvas.getContext("webgl")));
  } catch {
    return false;
  }
}

export function AuthScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(() => !supportsWebGL());
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [palette] = useState(() => paletteForHour(new Date().getHours()));

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || failed) return;
    const container = containerRef.current;
    if (!container) return;

    let scene: ReturnType<typeof buildScene>;
    try {
      scene = buildScene(container, palette);
    } catch {
      // Deferred, not called synchronously in the effect body — this is
      // an unexpected runtime failure after the WebGL capability check
      // already passed, not the normal path.
      queueMicrotask(() => setFailed(true));
      return;
    }
    const { renderer, camera, ball, ballStart, ballEnd, baseCameraPos, resize } = scene;

    // Best-effort device-orientation parallax — no permission prompt is
    // ever requested (that needs a user gesture on iOS, and the spec
    // forbids any visible "enable 3D" control), so this simply does
    // nothing on platforms that require one.
    let tiltX = 0;
    let tiltY = 0;
    function onOrientation(event: DeviceOrientationEvent) {
      if (event.beta == null || event.gamma == null) return;
      tiltY = THREE.MathUtils.clamp(event.gamma, -25, 25) / 25;
      tiltX = THREE.MathUtils.clamp(event.beta - 60, -25, 25) / 25;
    }
    window.addEventListener("deviceorientation", onOrientation);

    let frameId = 0;
    let running = true;
    let start = performance.now();
    const cycle = SHOT_DURATION_S + PAUSE_S;

    function animate(now: number) {
      if (!running) return;
      const t = ((now - start) / 1000) % cycle;
      if (t <= SHOT_DURATION_S) {
        const p = t / SHOT_DURATION_S;
        const eased = p * p * (3 - 2 * p);
        ball.position.lerpVectors(ballStart, ballEnd, eased);
        ball.position.y = ballStart.y + Math.sin(p * Math.PI) * 0.9;
        ball.rotation.x -= 0.18 + p * 0.12;
        ball.rotation.z = Math.sin(p * Math.PI * 2) * 0.03;
      } else {
        ball.position.copy(ballStart);
      }

      camera.position.x = baseCameraPos.x + tiltY * 0.4;
      camera.position.y = baseCameraPos.y + tiltX * 0.25;
      camera.lookAt(0, 0.8, -10);

      renderer.render(scene.scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frameId);
      } else if (!running) {
        running = true;
        start = performance.now() - ((performance.now() - start) % (cycle * 1000));
        frameId = requestAnimationFrame(animate);
      }
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    document.addEventListener("visibilitychange", onVisibility);
    frameId = requestAnimationFrame(animate);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("deviceorientation", onOrientation);
      renderer.dispose();
      scene.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach((m) => m.dispose());
        }
      });
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [reducedMotion, failed, palette]);

  if (reducedMotion || failed) {
    return <StaticFallback palette={palette} />;
  }

  return <div ref={containerRef} className="absolute inset-0" aria-hidden="true" />;
}
