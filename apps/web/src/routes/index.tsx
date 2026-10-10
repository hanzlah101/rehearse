import { createFileRoute } from "@tanstack/react-router";

const Home = () => (
  <main>
    <h1>Rehearse</h1>
  </main>
);

export const Route = createFileRoute("/")({
  component: Home,
});
