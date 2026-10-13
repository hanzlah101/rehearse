import { migrate } from "@/modules/common/db/migrate";
import { recoverAttempts } from "@/modules/history/lib/rehearsals";

// Thrown when the local database can't be opened, so the error page can say
// so instead of blaming the network.
export class LocalDataError extends Error {
  constructor(cause: unknown) {
    super(
      "Couldn’t open your saved rehearsals. Restart Rehearse to try again.",
      {
        cause,
      }
    );
    this.name = "LocalDataError";
  }
}

let opening: Promise<void> | undefined;

// Runs once per app launch (the root route awaits it): applies migrations,
// then cleans up after any recording the last run didn't finish.
export async function openDatabase() {
  opening ??= (async () => {
    try {
      await migrate();
      await recoverAttempts();
    } catch (error) {
      opening = undefined;
      throw new LocalDataError(error);
    }
  })();

  await opening;
}
