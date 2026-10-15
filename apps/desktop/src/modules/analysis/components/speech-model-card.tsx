import {
  IconAlertCircleFilled,
  IconCircleArrowDownFilled,
  IconCircleCheckFilled,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatNumber } from "@/lib/format";
import {
  checkSpeechModel,
  downloadSpeechModel,
  useSpeechModel,
} from "@/modules/analysis/lib/model";
import type { SpeechModel } from "@/modules/analysis/lib/model";

const MODEL_SIZE = "1.66 GB";

async function startDownload() {
  try {
    await downloadSpeechModel();
  } catch {
    // Failures land in the store, which the card and dialog show.
  }
}

function DownloadProgress({
  model,
}: {
  model: Extract<SpeechModel, { status: "downloading" }>;
}) {
  const { downloadedBytes, totalBytes } = model;
  // Rust checks the file's SHA-256 once every byte is in.
  const isVerifying = downloadedBytes >= totalBytes;

  return (
    <Progress
      isIndeterminate={isVerifying}
      label={isVerifying ? "Checking the download" : "Downloading"}
      maxValue={totalBytes}
      value={downloadedBytes}
      valueLabel={
        isVerifying
          ? undefined
          : `${formatBytes(downloadedBytes)} of ${formatBytes(totalBytes)} · ${formatNumber(downloadedBytes / totalBytes, { maximumFractionDigits: 0, style: "percent" })}`
      }
    />
  );
}

function ModelDialogContent({ model }: { model: SpeechModel }) {
  if (model.status === "ready") {
    return (
      <>
        <DialogHeader>
          <IconCircleCheckFilled className="size-8 text-primary" />
          <DialogTitle>Speech model ready</DialogTitle>
          <DialogDescription>
            Your talks are analysed on this computer from now on.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose variant="default">Done</DialogClose>
        </DialogFooter>
      </>
    );
  }

  if (model.status === "failed") {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Download stopped</DialogTitle>
          <DialogDescription>
            What’s already downloaded is kept, so trying again picks up where it
            left off.
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <IconAlertCircleFilled />
          <AlertDescription>{model.error}</AlertDescription>
        </Alert>
        <DialogFooter>
          <DialogClose>Close</DialogClose>
          <Button
            onPress={() => {
              void startDownload();
            }}
          >
            Try again
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Downloading the speech model</DialogTitle>
        <DialogDescription>
          It turns your talks into text on this computer, so your voice never
          leaves it. Closing this window doesn’t stop the download.
        </DialogDescription>
      </DialogHeader>
      {model.status === "downloading" ? (
        <DownloadProgress model={model} />
      ) : (
        <Progress isIndeterminate label="Starting" />
      )}
      <DialogFooter>
        <DialogClose>Hide</DialogClose>
      </DialogFooter>
    </>
  );
}

// On the home page until the speech model is on this computer: Download opens
// a dialog with the progress; hiding it keeps the download going, and the
// card shows how far it got. Analysis also downloads it if needed, joining
// the same download.
export function SpeechModelCard() {
  const model = useSpeechModel();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function check() {
      try {
        await checkSpeechModel();
      } catch {
        // Unknown until analysis needs it, which downloads it then.
      }
    }
    void check();
  }, []);

  const card =
    model.status === "missing" ||
    model.status === "downloading" ||
    model.status === "failed";
  let action = "Download";
  if (model.status === "downloading") {
    action = "Show progress";
  } else if (model.status === "failed") {
    action = "Try again";
  }

  return (
    <>
      {card && (
        <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-4 ring-1 ring-border ring-inset dark:bg-input/10">
          {model.status === "failed" ? (
            <IconAlertCircleFilled
              aria-hidden
              className="size-6 shrink-0 text-destructive"
            />
          ) : (
            <IconCircleArrowDownFilled
              aria-hidden
              className="size-6 shrink-0 text-primary"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">
              {model.status === "failed"
                ? "Speech model download stopped"
                : "Speech model"}
            </p>
            <p className="text-sm text-muted-foreground">
              {model.status === "downloading"
                ? `Downloading · ${formatNumber(model.downloadedBytes / model.totalBytes, { maximumFractionDigits: 0, style: "percent" })}`
                : `Needed for feedback, downloaded once (${MODEL_SIZE}).`}
            </p>
          </div>
          <Button
            onPress={() => {
              setIsOpen(true);
              if (model.status !== "downloading") {
                void startDownload();
              }
            }}
            size="sm"
            variant={model.status === "downloading" ? "muted" : "default"}
          >
            {action}
          </Button>
        </div>
      )}

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen}>
        <ModelDialogContent model={model} />
      </Dialog>
    </>
  );
}
