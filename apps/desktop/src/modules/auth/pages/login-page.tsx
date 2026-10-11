import { LoginForm } from "@/modules/auth/components/login-form";

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-10 px-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold text-balance">Welcome back</h1>
        <p className="text-pretty text-muted-foreground">
          Log in with your student ID to keep rehearsing.
        </p>
      </div>

      <LoginForm />
    </main>
  );
}
