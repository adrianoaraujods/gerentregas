import { Section } from "@/components/layout/section";
import { ResetPasswordForm } from "@/components/modules/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Section
      className="flex items-center justify-center py-8 sm:py-16"
      render={
        <main>
          <ResetPasswordForm token={token} />
        </main>
      }
    />
  );
}
