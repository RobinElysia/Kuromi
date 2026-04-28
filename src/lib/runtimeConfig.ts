export type KuromiDataMode = "server" | "browser";

export interface AdminCredential {
  username: string;
  passwordHash: string;
}

const configuredDataMode = String(import.meta.env.VITE_KUROMI_DATA_MODE ?? "").trim().toLowerCase();

export const ADMIN_CREDENTIALS: AdminCredential[] = [
  {
    username: "RobinElysia",
    passwordHash: String(import.meta.env.VITE_KUROMI_ADMIN_ROBIN_HASH ?? "").trim().toLowerCase(),
  },
  {
    username: "Meow",
    passwordHash: String(import.meta.env.VITE_KUROMI_ADMIN_MEOW_HASH ?? "").trim().toLowerCase(),
  },
].filter((item) => item.username && item.passwordHash);

export const ADMIN_USERNAMES = new Set(["RobinElysia", "Meow"]);

export const KUROMI_DATA_MODE: KuromiDataMode =
  configuredDataMode === "server" || configuredDataMode === "browser"
    ? configuredDataMode
    : "server";

export const RESERVED_NICKNAMES = new Set(["访客", "guest", "admin", "administrator"]);
