import logo from "@/assets/logo.svg";

// Shown while the root route checks the session on launch.
export function SplashPage() {
  return (
    <main
      aria-busy="true"
      className="flex min-h-svh items-center justify-center"
    >
      <img src={logo} alt="Rehearse" className="size-20" />
    </main>
  );
}
