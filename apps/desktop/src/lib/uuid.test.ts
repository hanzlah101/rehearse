import { expect, test } from "bun:test";

import { uuidv7 } from "@/lib/uuid";

test("uuidv7 is a valid v7 UUID that sorts by creation time", async () => {
  const first = uuidv7();
  await Bun.sleep(2);
  const second = uuidv7();

  expect(first).toMatch(
    /^[\da-f]{8}-[\da-f]{4}-7[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u
  );
  expect(first < second).toBe(true);
});
