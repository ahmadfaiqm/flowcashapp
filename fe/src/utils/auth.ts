import type { AuthSession, CompanyData, UserRecord } from "../types";
import { seedAccounts, seedEntries } from "./accounting";

const USERS_KEY = "akuntansi.users";
const SESSION_KEY = "akuntansi.session";
const DATA_PREFIX = "akuntansi.data.";

/**
 * Hashing kata sandi dengan SHA-256 + salt tetap. Ini memisahkan profil
 * pengguna pada aplikasi ini secara wajar, namun bukan pengganti sistem
 * autentikasi sisi server yang sesungguhnya (tidak ada pembatasan
 * percobaan login, rotasi salt per pengguna, atau pemulihan kata sandi).
 */
export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode("akuntansi-salt-v1:" + password);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function loadUsers(): Record<string, UserRecord> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUsers(users: Record<string, UserRecord>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function loadCompanyData(username: string): CompanyData | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + username);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCompanyData(username: string, data: CompanyData): void {
  localStorage.setItem(DATA_PREFIX + username, JSON.stringify(data));
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function seedCompanyData(companyName: string): CompanyData {
  return { companyName, accounts: seedAccounts(), entries: seedEntries() };
}
