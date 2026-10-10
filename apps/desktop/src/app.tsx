import { useState } from "react";
import { Label, TextField } from "react-aria-components";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function App() {
  const [topic, setTopic] = useState("");

  return (
    <div className="flex min-h-svh flex-col">
      {/* Doubles as the window's title bar (macOS overlay style). */}
      <header
        data-tauri-drag-region
        className="flex h-12 shrink-0 items-center justify-center"
      >
        <span className="pointer-events-none font-heading text-sm font-semibold">
          Rehearse
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 px-8 pb-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-5xl font-semibold text-balance">
            What are you rehearsing today?
          </h1>
          <p className="text-lg text-pretty text-muted-foreground">
            Name the talk, pitch, or meeting you want to practice.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <TextField
            className="flex flex-1 flex-col gap-2"
            onChange={setTopic}
            value={topic}
          >
            <Label className="text-sm font-medium">Topic</Label>
            <Input placeholder="Quarterly results for the leadership team" />
          </TextField>
          <Button size="lg" isDisabled={topic.trim() === ""}>
            Start rehearsal
          </Button>
        </div>
      </main>
    </div>
  );
}

export default App;
