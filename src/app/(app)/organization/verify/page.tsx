import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/pitchlink/back-link";
import { OrganizationVerifyForm } from "./verify-form";

export default async function OrganizationVerifyPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "organization") {
    redirect("/dashboard");
  }

  const { data: verification } = await supabase
    .from("organization_verifications")
    .select("status, org_name")
    .eq("organization_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-sm px-6 py-12">
      <BackLink href="/dashboard" label="Back to dashboard" />

      <h1 className="mt-3 text-xl font-semibold text-gray-900">
        Organization verification
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        Before you can post tournament or event listings to the local feed,
        we confirm your organization. An admin reviews every request.
      </p>

      <div className="mt-8">
        {verification?.status === "pending" ? (
          <p className="text-sm text-gray-600">
            Your request to verify{" "}
            <span className="font-medium text-gray-900">
              {verification.org_name}
            </span>{" "}
            is under review.
          </p>
        ) : verification?.status === "approved" ? (
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">
              {verification.org_name}
            </span>{" "}
            is verified. You can now post tournament and event listings to
            the local feed.
          </p>
        ) : (
          <>
            {verification?.status === "rejected" ? (
              <p className="mb-4 text-sm text-amber-800">
                Your last request wasn&rsquo;t approved. You can submit
                again with more detail below.
              </p>
            ) : null}
            <OrganizationVerifyForm />
          </>
        )}
      </div>
    </main>
  );
}
