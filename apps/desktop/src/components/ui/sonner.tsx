import {
  IconAlertTriangleFilled,
  IconCircleCheckFilled,
  IconCircleXFilled,
  IconInfoCircleFilled,
  IconLoader2,
} from "@tabler/icons-react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      icons={{
        error: <IconCircleXFilled className="size-4" />,
        info: <IconInfoCircleFilled className="size-4" />,
        loading: <IconLoader2 className="size-4 animate-spin" />,
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
