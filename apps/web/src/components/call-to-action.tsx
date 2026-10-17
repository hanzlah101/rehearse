import { InstallCommand } from "@/components/install-command";
import { BlurFade } from "@/components/ui/blur-fade";

export function CallToAction() {
  return (
    <BlurFade className="mt-28 sm:mt-36" duration={0.7} inView>
      <h2 className="text-5xl leading-none font-bold font-stretch-condensed sm:text-6xl">
        Practise your next talk tonight.
      </h2>
      <div className="mt-8">
        <InstallCommand />
      </div>
    </BlurFade>
  );
}
