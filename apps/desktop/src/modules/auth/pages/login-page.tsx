import loginDark from "@/assets/login-dark.webp";
import loginLight from "@/assets/login-light.webp";
import logo from "@/assets/logo.svg";
import { LoginForm } from "@/modules/auth/components/login-form";

export function LoginPage() {
  return (
    <main className="flex flex-1 lg:grid lg:grid-cols-2">
      <figure className="relative hidden overflow-hidden lg:block">
        <img
          src={loginLight}
          alt=""
          className="absolute inset-0 size-full object-cover dark:hidden"
        />
        <img
          src={loginDark}
          alt=""
          className="absolute inset-0 hidden size-full object-cover dark:block"
        />
        <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-8 xl:p-12">
          <h1 className="max-w-lg text-4xl font-semibold text-balance xl:text-5xl">
            Your next great talk starts here.
          </h1>
          <p className="max-w-md text-lg text-pretty text-foreground/80">
            Record a take, see what slipped, say it again.
          </p>
        </figcaption>
      </figure>

      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 xl:px-16">
        <div className="flex w-full max-w-100 flex-col gap-10">
          <div className="flex flex-col gap-5">
            <img src={logo} alt="" className="size-10" />
            <div className="flex flex-col gap-2">
              <h2 className="text-3xl font-semibold text-balance">
                Welcome back
              </h2>
              <p className="text-pretty text-muted-foreground">
                Log in with the student ID and password from your instructor.
              </p>
            </div>
          </div>

          <LoginForm />

          <p className="text-sm text-muted-foreground">
            No account? Ask your instructor to add you.
          </p>
        </div>
      </div>
    </main>
  );
}
