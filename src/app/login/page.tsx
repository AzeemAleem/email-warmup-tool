import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle
          collapsed
          className="w-10 h-10 rounded-full border border-gray-700 bg-surface"
        />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-pacify-forest flex items-center justify-center ring-1 ring-pacify-gold/40">
            <span className="text-pacify-gold text-xl font-bold tracking-tight">
              P
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Pacify Packaging
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Sign in to your dashboard
          </p>
        </div>

        <div className="bg-surface border border-gray-700 rounded-xl p-6 shadow-[var(--shadow-card)]">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
