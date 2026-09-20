/**
 * OAuth 2.0 dla aplikacji desktopowej (PKCE + loopback), tylko scope drive.file.
 * - klient C2C: plugins/c2c-slides/google/oauth-client.json (publiczny, zgodnie z dokumentacją Google dla installed apps)
 * - własny klient użytkownika (BYO): <dataDir>/oauth-client.json lub env C2C_OAUTH_CLIENT_FILE
 * - tokeny: <dataDir>/tokens.json (chmod 600)
 * - Google Picker dla aplikacji desktopowych: parametry prompt=consent&trigger_onepick=true
 */
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, unlinkSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { dataDir, pluginRoot } from "../paths.js";

export const SCOPES = ["https://www.googleapis.com/auth/drive.file"];

interface ClientConfig { client_id: string; client_secret?: string }
interface StoredTokens { access_token: string; refresh_token?: string; expiry: number; scope: string; account?: string }

function clientFile(): { path: string; source: "byo" | "c2c" } {
  const env = process.env.C2C_OAUTH_CLIENT_FILE;
  if (env && existsSync(env)) return { path: env, source: "byo" };
  const byo = join(dataDir(), "oauth-client.json");
  if (existsSync(byo)) return { path: byo, source: "byo" };
  return { path: join(pluginRoot(), "google", "oauth-client.json"), source: "c2c" };
}

export function loadClient(): ClientConfig & { source: "byo" | "c2c" } {
  const { path, source } = clientFile();
  if (!existsSync(path)) {
    throw new Error(`Brak konfiguracji klienta OAuth (${path}). Zobacz docs/google-cloud-setup.md.`);
  }
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const c = raw.installed ?? raw.web ?? raw;
  if (!c.client_id || String(c.client_id).includes("REPLACE")) {
    throw new Error(`Klient OAuth w ${path} nie jest skonfigurowany (client_id). Zobacz docs/google-cloud-setup.md.`);
  }
  return { client_id: c.client_id, client_secret: c.client_secret, source };
}

const tokensPath = (): string => join(dataDir(), "tokens.json");

export function loadTokens(): StoredTokens | undefined {
  const p = tokensPath();
  if (!existsSync(p)) return undefined;
  try { return JSON.parse(readFileSync(p, "utf8")) as StoredTokens; } catch { return undefined; }
}

function saveTokens(t: StoredTokens): void {
  const p = tokensPath();
  writeFileSync(p, JSON.stringify(t, null, 2), { mode: 0o600 });
  chmodSync(p, 0o600);
}

export function logout(): void {
  const p = tokensPath();
  if (existsSync(p)) unlinkSync(p);
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url.replace(/&/g, "^&")] : [url];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    child.on("error", () => { /* użytkownik otworzy URL ręcznie */ });
    child.unref();
  } catch { /* ignore */ }
}

const b64url = (buf: Buffer): string => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export interface LoginOptions {
  /** Otwórz Google Picker po zgodzie, by użytkownik wskazał istniejące pliki (daje do nich dostęp pod drive.file). */
  picker?: boolean;
  pickerMimeTypes?: string[];
  pickerMultiple?: boolean;
  /** ms; domyślnie 5 minut */
  timeoutMs?: number;
  /** wywoływane z URL, który należy pokazać użytkownikowi */
  onAuthUrl?: (url: string) => void;
}

export interface LoginResult { account?: string; pickedFileIds: string[] }

/** Pełny przebieg logowania w przeglądarce. Zwraca też pliki wskazane w Pickerze. */
export async function login(opts: LoginOptions = {}): Promise<LoginResult> {
  const client = loadClient();
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  return new Promise<LoginResult>((resolve, reject) => {
    const server = createServer();
    const timer = setTimeout(() => { server.close(); reject(new Error("Upłynął czas oczekiwania na logowanie w przeglądarce.")); }, opts.timeoutMs ?? 5 * 60_000);

    server.on("request", async (req, res) => {
      try {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        if (url.pathname !== "/oauth2callback") { res.writeHead(404).end(); return; }
        if (url.searchParams.get("state") !== state) { res.writeHead(400).end("Nieprawidłowy state."); return; }
        const err = url.searchParams.get("error");
        if (err) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page("Logowanie przerwane", `Google zwróciło błąd: ${escapeHtml(err)}. Możesz zamknąć tę kartę.`));
          const hint = err === "org_internal" ? " Logowanie działa tylko kontem Google w domenie createdtocreate.pl. W przeglądarce wybierz konto fundacji (nie prywatne ani firmowe) i spróbuj ponownie." : err === "admin_policy_enforced" ? " Administrator Google Workspace blokuje tę aplikację dla tego konta; zaloguj się kontem fundacji @createdtocreate.pl." : "";
          throw new Error(`Google OAuth: ${err}.${hint}`);
        }
        const code = url.searchParams.get("code");
        if (!code) { res.writeHead(400).end("Brak kodu."); return; }
        const picked = (url.searchParams.get("picked_file_ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        const addr = server.address();
        const port = typeof addr === "object" && addr ? addr.port : 0;
        const tokens = await exchangeCode(client, code, verifier, `http://127.0.0.1:${port}/oauth2callback`);
        const account = await fetchAccountEmail(tokens.access_token).catch(() => undefined);
        saveTokens({ ...tokens, account });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(page("Połączono z Google", `Konto ${escapeHtml(account ?? "")} jest połączone z C2C Slides. Możesz zamknąć tę kartę i wrócić do Claude.`));
        clearTimeout(timer);
        setTimeout(() => server.close(), 200);
        resolve({ account, pickedFileIds: picked });
      } catch (e) {
        clearTimeout(timer);
        setTimeout(() => server.close(), 200);
        reject(e);
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      const redirect = `http://127.0.0.1:${port}/oauth2callback`;
      const params = new URLSearchParams({
        client_id: client.client_id,
        redirect_uri: redirect,
        response_type: "code",
        scope: SCOPES.join(" "),
        access_type: "offline",
        code_challenge: challenge,
        code_challenge_method: "S256",
        state,
        prompt: "consent",
      });
      if (opts.picker) {
        params.set("trigger_onepick", "true");
        if (opts.pickerMultiple) params.set("allow_multiple", "true");
        if (opts.pickerMimeTypes?.length) params.set("mimetypes", opts.pickerMimeTypes.join(","));
      }
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      opts.onAuthUrl?.(authUrl);
      openBrowser(authUrl);
    });
  });
}

async function exchangeCode(client: ClientConfig, code: string, verifier: string, redirect: string): Promise<StoredTokens> {
  const body = new URLSearchParams({
    client_id: client.client_id,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirect,
  });
  if (client.client_secret) body.set("client_secret", client.client_secret);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok) throw new Error(`Wymiana kodu OAuth nie powiodła się: ${JSON.stringify(j)}`);
  return {
    access_token: String(j.access_token),
    refresh_token: j.refresh_token ? String(j.refresh_token) : undefined,
    expiry: Date.now() + Number(j.expires_in ?? 3600) * 1000,
    scope: String(j.scope ?? SCOPES.join(" ")),
  };
}

async function refresh(client: ClientConfig, t: StoredTokens): Promise<StoredTokens> {
  if (!t.refresh_token) throw new Error("Brak refresh tokenu. Zaloguj się ponownie (c2c_login).");
  const body = new URLSearchParams({ client_id: client.client_id, refresh_token: t.refresh_token, grant_type: "refresh_token" });
  if (client.client_secret) body.set("client_secret", client.client_secret);
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok) {
    if (j.error === "invalid_grant") logout();
    throw new Error(`Odświeżenie tokenu nie powiodło się (${String(j.error)}). Zaloguj się ponownie (c2c_login).`);
  }
  const next: StoredTokens = { ...t, access_token: String(j.access_token), expiry: Date.now() + Number(j.expires_in ?? 3600) * 1000 };
  saveTokens(next);
  return next;
}

/** Ważny access token (odświeża, jeśli trzeba). */
export async function getAccessToken(): Promise<string> {
  const t = loadTokens();
  if (!t) throw new Error("Nie jesteś zalogowany do Google. Użyj narzędzia c2c_login.");
  if (t.expiry - Date.now() > 60_000) return t.access_token;
  return (await refresh(loadClient(), t)).access_token;
}

async function fetchAccountEmail(accessToken: string): Promise<string | undefined> {
  // drive.file pozwala odczytać about.user (bez dodatkowych scope'ów)
  const r = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) return undefined;
  const j = (await r.json()) as { user?: { emailAddress?: string } };
  return j.user?.emailAddress;
}

export function authStatus(): { loggedIn: boolean; account?: string; clientSource: "byo" | "c2c" | "missing"; scopes: string[] } {
  const t = loadTokens();
  let clientSource: "byo" | "c2c" | "missing" = "missing";
  try { clientSource = loadClient().source; } catch { /* missing */ }
  return { loggedIn: !!t?.refresh_token, account: t?.account, clientSource, scopes: t ? t.scope.split(" ") : [] };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:linear-gradient(165deg,#1D2E60,#222A3F);color:#FFF8F2;font-family:Inter,system-ui,sans-serif}
main{max-width:520px;padding:48px}h1{font-family:"Golos Text",Inter,system-ui;font-size:32px;margin:0 0 16px}p{font-size:16px;line-height:1.6;color:#ECD3BE}
.bar{width:80px;height:4px;border-radius:2px;background:linear-gradient(165deg,#A37A5C,#ECD3BE);margin-bottom:24px}</style></head>
<body><main><div class="bar"></div><h1>${escapeHtml(title)}</h1><p>${body}</p></main></body></html>`;
}
