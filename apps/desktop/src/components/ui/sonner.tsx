import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconInfoCircleFilled,
} from "@tabler/icons-react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

import { Spinner } from "@/components/ui/spinner";

function Toaster(props: ToasterProps) {
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
      theme="system"
      {...props}
    />
  );
}

export { Toaster };
