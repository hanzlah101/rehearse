import { useState } from "react";
import { Label, TextField } from "react-aria-components";

import logo from "@/assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { setDark, useIsDark } from "@/lib/theme";

function App() {
  const [topic, setTopic] = useState("");
  const isDark = useIsDark();

  return (
    <div className="flex min-h-svh flex-col">
      {/* Doubles as the window's title bar (macOS overlay style). */}
      <header
        data-tauri-drag-region
        className="relative flex h-12 shrink-0 items-center justify-center"
      >
        <div className="pointer-events-none flex items-center gap-2">
          <img src={logo} alt="" className="size-6" />
          <span className="font-heading text-sm font-semibold">Rehearse</span>
        </div>
        <Switch
          className="absolute right-4"
          isSelected={isDark}
          onChange={setDark}
          size="sm"
        >
          Dark mode
        </Switch>
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
