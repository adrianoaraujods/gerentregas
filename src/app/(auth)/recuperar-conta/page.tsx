import { Section } from "@/components/layout/section";
import { RecoverForm } from "@/components/modules/auth/recover-form";

export default function RecoverPage() {
  return (
    <Section
      className="flex items-center justify-center py-8 sm:py-16"
      render={
        <main>
          <RecoverForm />
        </main>
      }
    />
  );
}
