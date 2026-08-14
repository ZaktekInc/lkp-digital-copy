import type { D1DatabaseLike } from "./service";

export function getDatabase(): D1DatabaseLike {
  const database = globalThis.__LKP_D1__ as D1DatabaseLike | undefined;
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Keep `.openai/hosting.json` d1 set to `DB`.",
    );
  }
  return database;
}
