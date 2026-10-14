import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="mt-24 flex items-center justify-between gap-4 border-t py-6 text-sm text-muted-foreground">
      <Logo className="text-sm text-foreground *:size-5" />
      <p>For macOS, Windows and Linux.</p>
    </footer>
  );
}
