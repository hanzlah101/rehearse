import { createFileRoute } from "@tanstack/react-router";
import { MotionConfig } from "motion/react";

import { CallToAction } from "@/components/call-to-action";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";

function Home() {
  return (
    <MotionConfig reducedMotion="user">
      <Header />
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8 lg:px-12">
        <main>
          <Hero />
          <Features />
          <CallToAction />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

export const Route = createFileRoute("/")({
  component: Home,
});
