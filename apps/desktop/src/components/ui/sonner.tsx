import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconInfoCircleFilled,
} from "@tabler/icons-react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

import { Spinner } from "@/components/ui/spinner";
import { useIsDark } from "@/lib/theme";

function Toaster(props: ToasterProps) {
  const isDark = useIsDark();

  return (
    <Sonner
      icons={{
        error: <IconCircleXFilled className="size-4" />,
        info: <IconInfoCircleFilled className="size-4" />,
        loading: <Spinner className="size-4" />,
        success: <IconCircleCheckFilled className="size-4" />,
        warning: <IconAlertTriangleFilled className="size-4" />,
      }}
      richColors
      theme={isDark ? "dark" : "light"}
      {...props}
    />
  );
}

export { Toaster };
