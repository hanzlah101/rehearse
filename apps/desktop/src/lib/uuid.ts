// UUID v7: a millisecond timestamp first, so ids sort by creation time (and
// sync later without collisions, PLAN §7.2), then random bits from v4.
export function uuidv7() {
  const time = Date.now().toString(16).padStart(12, "0");
  const random = crypto.randomUUID().replaceAll("-", "");

  // random[16] is already v4's RFC variant digit (8–b), so it's kept as is.
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-7${random.slice(13, 16)}-${random.slice(16, 20)}-${random.slice(20, 32)}`;
}
