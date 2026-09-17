import { Section } from "@/components/layout/section";
import { RegisterForm } from "@/components/modules/auth/register-form";

export default function RegisterPage() {
  return (
    <Section
      className="flex items-center justify-center py-8 sm:py-16"
      render={
        <main>
          <RegisterForm />
        </main>
      }
    />
  );
}
