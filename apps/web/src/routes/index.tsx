import { createFileRoute } from "@tanstack/react-router";

function Home() {
  return (
    <main>
      <h1>Rehearse</h1>
    </main>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});
