import { Suspense } from "react";
import { Section } from "@/components/layout/section";
import { LoginForm } from "@/components/modules/auth/login-form";

export default function LoginPage() {
  return (
    <Section
      className="flex items-center justify-center py-8 sm:py-16"
      render={
        <main>
          <Suspense
            fallback={
              <div className="flex h-[400px] w-full max-w-md items-center justify-center">
                Carregando...
              </div>
            }
          >
            <LoginForm />
          </Suspense>
        </main>
      }
    />
  );
}
