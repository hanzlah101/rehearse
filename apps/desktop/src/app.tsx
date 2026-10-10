import { useState } from "react";
import { Label, TextField } from "react-aria-components";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function App() {
  const [topic, setTopic] = useState("");

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-10 px-8">
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
  );
}

export default App;
