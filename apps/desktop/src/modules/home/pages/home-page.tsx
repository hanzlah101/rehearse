import { useState } from "react";
import { Label, TextField } from "react-aria-components";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLogout } from "@/modules/auth/actions/logout";
import { useSession } from "@/modules/auth/queries/session";

export function HomePage() {
  const [topic, setTopic] = useState("");
  const { student } = useSession();
  const logout = useLogout();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-10 px-8 pb-12">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{student.name}</p>
        <Button
          isLoading={logout.isPending}
          onPress={() => {
            logout.mutate();
          }}
          size="sm"
          variant="ghost"
        >
          Log out
        </Button>
      </div>

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
