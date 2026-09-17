import { Section } from "@/components/layout/section";
import { LoginForm } from "@/components/modules/auth/login-form";

export default function LoginPage() {
  return (
    <Section
      className="flex items-center justify-center py-8 sm:py-16"
      render={
        <main>
          <LoginForm />
        </main>
      }
    />
  );
}
