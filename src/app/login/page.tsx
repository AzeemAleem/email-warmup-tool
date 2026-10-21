import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-pacify-forest flex items-center justify-center ring-1 ring-pacify-gold/40">
            <span className="text-pacify-gold text-xl font-bold tracking-tight">
              P
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Pacify Packaging
          </h1>
          <p className="text-sm text-gray-400 mt-1.5">
            Sign in to your dashboard
          </p>
        </div>

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 shadow-2xl shadow-black/40">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
