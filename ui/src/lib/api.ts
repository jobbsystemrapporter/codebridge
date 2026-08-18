export interface ChatGptState {
  connected: boolean;
  actionBaseUrl?: string;
  lastSeenAt?: string;
}

export interface Config {
  version: number;
  setupComplete: boolean;
  allowedRoots: string[];
  securityMode: "safe" | "developer";
  chatgpt: ChatGptState;
  transport?: { provider?: string; ngrokConfigured?: boolean };
  createdAt?: string;
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export interface Status {
  version: string;
  platform: string;
  config: Config;
  doctor: { healthy: boolean; ready: boolean; checks: DoctorCheck[] };
}

export interface PreflightCheck {
  id: string;
  ok: boolean;
  label: string;
}

export interface Preflight {
  ready: boolean;
  localReady: boolean;
  checks: PreflightCheck[];
  endpoint: string | null;
}

export interface ActionSetup {
  baseUrl: string;
  configured: boolean;
  secret: string;
  schema: unknown;
  instructions: string;
}

export interface GuideStep {
  title: string;
  action?: string;
  url?: string;
  detail?: string;
}

export interface Guide {
  mode: string;
  title: string;
  steps: GuideStep[];
  automatic: boolean;
  setup?: ActionSetup;
}

export interface ApprovalItem {
  id: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  type?: string;
  cwd?: string;
  executable?: string;
  args?: string[];
  kind?: string;
}

export interface WorktreeResult {
  id: string;
  path: string;
  project: string;
  branch: string;
}

export interface HistoryEntry {
  at: string;
  action: string;
  path?: string;
  command?: string;
}

let localToken = "";

export async function initSession(): Promise<void> {
  const r = await fetch("/api/session", { cache: "no-store" });
  if (!r.ok) throw new Error("CodeBridge service is not responding.");
  const d = (await r.json()) as { token?: string };
  localToken = d.token || "";
}

export async function api<T = unknown>(
  url: string,
  opts: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (localToken) headers["x-codebridge-token"] = localToken;
  const r = await fetch(url, { ...opts, headers, cache: "no-store" });
  const d = (await r.json().catch(() => ({}))) as { error?: string } & T;
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
}

export function nativeAvailable(): boolean {
  return !!(
    (window as unknown as { webkit?: { messageHandlers?: unknown } }).webkit
      ?.messageHandlers
  );
}

function nativeCall(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const w = window as unknown as {
    webkit?: {
      messageHandlers?: {
        codebridgeNative?: { postMessage: (p: unknown) => void };
      };
    };
  };
  if (!w.webkit?.messageHandlers?.codebridgeNative) return Promise.resolve(null);
  return new Promise((resolve) => {
    const handler = (e: Event) => {
      window.removeEventListener("codebridge-native-response", handler);
      resolve(((e as CustomEvent).detail as Record<string, unknown>) || null);
    };
    window.addEventListener("codebridge-native-response", handler);
    w.webkit!.messageHandlers!.codebridgeNative!.postMessage(payload);
  });
}

export async function chooseFolder(): Promise<string | null> {
  const r = await nativeCall({ action: "chooseFolder" });
  return r?.path ? String(r.path) : null;
}

export async function openExternal(url: string): Promise<void> {
  const r = await nativeCall({ action: "openExternal", url });
  if (r === null) window.open(url, "_blank", "noopener,noreferrer");
}

export async function requestNativeApproval(detail: string): Promise<boolean> {
  const r = await nativeCall({ action: "approve", title: "CodeBridge approval", detail });
  return !!r?.ok;
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard can be unavailable in WKWebView without focus; caller shows feedback.
  }
}
