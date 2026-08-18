import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MousePointerClick,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, copyText, openExternal, type ActionSetup, type Guide } from "@/lib/api";

interface Props {
  onConnected: () => Promise<void>;
}

function CopyField({
  id,
  label,
  value,
  multiline,
  secret,
}: {
  id: string;
  label: string;
  value: string;
  multiline?: boolean;
  secret?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(!secret);

  async function onCopy() {
    await copyText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const cls =
    "mt-2 w-full rounded-lg border bg-background px-3 py-2.5 font-mono text-[13px] text-foreground";

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
          {copied ? <Check className="mr-1.5 size-3.5 text-primary" /> : <Copy className="mr-1.5 size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {multiline ? (
        <textarea id={id} readOnly value={value} rows={6} className={`${cls} resize-y`} />
      ) : (
        <div className="relative">
          <Input
            id={id}
            readOnly
            value={value}
            type={visible ? "text" : "password"}
            className="pr-10 font-mono text-[13px]"
          />
          {secret && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={visible ? "Hide secret" : "Show secret"}
            >
              {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {step}
        </span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </Card>
  );
}

function Illustration({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/50 p-4">
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      {label && (
        <p className="mt-3 text-[11px] text-muted-foreground/70">{label}</p>
      )}
    </div>
  );
}

function Screenshot({ name, alt }: { name: string; alt: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) return null;
  return (
    <img
      src={`/guide-images/${name}`}
      alt={alt}
      onError={() => setMissing(true)}
      className="w-full rounded-lg border"
    />
  );
}

function PrivacyField({ setup }: { setup: ActionSetup }) {
  const [url, setUrl] = useState(setup.privacyPolicyUrl || "");
  const [saved, setSaved] = useState(false);
  async function save() {
    try {
      await api("/api/chatgpt/setup", {
        method: "PUT",
        body: JSON.stringify({ baseUrl: setup.baseUrl, privacyPolicyUrl: url.trim() }),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch {
      setSaved(false);
    }
  }
  return (
    <div>
      <Label htmlFor="privacyUrl" className="text-sm font-semibold">
        Privacy policy URL (only needed for public GPT sharing)
      </Label>
      <div className="mt-2 flex gap-2">
        <Input
          id="privacyUrl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/privacy"
          className="font-mono text-[13px]"
        />
        <Button type="button" variant="outline" onClick={save}>
          {saved ? "Saved ✓" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export function ConnectGuide({ onConnected }: Props) {
  const [guide, setGuide] = useState<Guide | null>(null);
  const [phase, setPhase] = useState<"loading" | "ngrok" | "gpt">("loading");
  const [authtoken, setAuthtoken] = useState("");
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [schemaRevealed, setSchemaRevealed] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    try {
      const g = await api<Guide>("/api/chatgpt/guide", { method: "POST", body: "{}" });
      setGuide(g);
      setPhase(g.steps[0]?.action === "ngrok" ? "ngrok" : "gpt");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the connection guide.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function startTransport() {
    if (!authtoken.trim()) return;
    setStarting(true);
    setError("");
    try {
      await api("/api/transport/start", {
        method: "POST",
        body: JSON.stringify({ authtoken: authtoken.trim() }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the secure connection.");
    } finally {
      setStarting(false);
    }
  }

  async function checkConnection() {
    setChecking(true);
    setError("");
    try {
      const s = await api<{ config: { chatgpt: { connected: boolean } } }>("/api/status");
      if (s.config.chatgpt.connected) await onConnected();
      else
        setError(
          "Not connected yet. Ask your custom GPT to “Check CodeBridge connection”, then try again."
        );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check the connection.");
    } finally {
      setChecking(false);
    }
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your next step…
      </div>
    );
  }

  if (phase === "ngrok") {
    const step = guide?.steps[0];
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">CONNECT CODEBRIDGE</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          Give ChatGPT a private address to this Mac.
        </h2>
        <p className="mt-3 max-w-xl text-muted-foreground">
          This uses the ngrok service and is <strong>not</strong> the OpenAI API. CodeBridge
          starts and owns the connection itself — no terminal or CLI needed.
        </p>

        <Card className="mt-7 max-w-xl p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <h3 className="text-base font-semibold">Get your connection code</h3>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Sign in or create a free ngrok account, then copy the connection code shown for your
            account.
          </p>
          <Button
            className="mt-4"
            onClick={() => openExternal(step?.url || "https://dashboard.ngrok.com/get-started/your-authtoken")}
          >
            <ExternalLink className="mr-2 size-4" />
            Open ngrok
          </Button>

          <div className="mt-6 border-t pt-5">
            <Label htmlFor="ngrokToken" className="text-sm font-semibold">
              2 · Paste the connection code here
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="ngrokToken"
                type="password"
                value={authtoken}
                onChange={(e) => setAuthtoken(e.target.value)}
                placeholder="Paste here"
                autoComplete="off"
                className="font-mono text-[13px]"
              />
              <Button onClick={startTransport} disabled={starting || !authtoken.trim()}>
                {starting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
                {starting ? "Connecting…" : "Connect securely"}
              </Button>
            </div>
          </div>
          {error && <p className="mt-3 text-[13px] font-medium text-destructive">{error}</p>}
        </Card>
        <Screenshot name="ngrok-authtoken.png" alt="ngrok dashboard with your connection code" />
      </div>
    );
  }

  const setup = guide?.setup as ActionSetup | undefined;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
      <div>
        <p className="text-xs font-medium tracking-widest text-muted-foreground">CONNECT CHATGPT</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">
          One step at a time. Do only what this page asks.
        </h2>
      </div>

      <Section step="1" title="Fill in your custom GPT">
        <p className="text-sm text-muted-foreground">
          Open the GPT editor, then copy these three prepared fields into the matching boxes.
        </p>
        <Button variant="outline" onClick={() => openExternal("https://chatgpt.com/gpts/editor")}>
          <ExternalLink className="mr-2 size-4" />
          Open GPT editor
        </Button>
        {setup && (
          <div className="grid gap-4 sm:grid-cols-2">
            <CopyField id="gptName" label="Name" value="CodeBridge" />
            <CopyField
              id="gptDescription"
              label="Description"
              value="Code with ChatGPT directly in the projects on your Mac through CodeBridge."
            />
            <div className="sm:col-span-2">
              <CopyField id="gptInstructions" label="Instructions" value={setup.instructions} multiline />
            </div>
            <div className="sm:col-span-2">
              <PrivacyField setup={setup} />
            </div>
          </div>
        )}
        <Screenshot name="chatgpt-editor.png" alt="ChatGPT GPT editor" />
      </Section>

      <Section step="2" title="Turn on Code Interpreter & Data Analysis">
        <p className="text-sm text-muted-foreground">
          Scroll to <strong>Features</strong> in the GPT editor. Make sure{" "}
          <strong>Code Interpreter &amp; Data Analysis</strong> has a checkmark, then go to{" "}
          <strong>Actions</strong> directly below it.
        </p>
        <Illustration label="Illustration only — use the real controls in ChatGPT.">
          <div className="font-medium text-foreground">Features</div>
          <div className="flex items-center gap-2">
            <Check className="size-4 text-primary" /> Web search
          </div>
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1.5 font-medium text-foreground">
            <Check className="size-4 text-primary" /> Code Interpreter &amp; Data Analysis
            <span className="ml-auto text-[11px] text-muted-foreground">← turn this on</span>
          </div>
        </Illustration>
        <Screenshot name="chatgpt-features.png" alt="Features with Code Interpreter enabled" />
      </Section>

      <Section step="3" title="Create the CodeBridge Action">
        <p className="text-sm text-muted-foreground">
          Under <strong>Actions</strong>, click <strong>Create new action</strong>. When the
          Action page is open, come back here.
        </p>
        <Button variant="outline" onClick={() => openExternal("https://chatgpt.com/gpts/editor")}>
          <ExternalLink className="mr-2 size-4" />
          Open GPT editor again
        </Button>
        <Button onClick={() => setSchemaRevealed(true)} disabled={schemaRevealed}>
          <MousePointerClick className="mr-2 size-4" />
          {schemaRevealed ? "Action page opened" : "I opened the Action page →"}
        </Button>
        <Screenshot name="chatgpt-create-action.png" alt="Create new action in ChatGPT" />
      </Section>

      {schemaRevealed && setup && (
        <>
          <Section step="4" title="Paste the Action schema">
            <p className="text-sm text-muted-foreground">
              On the Action page, find <strong>Schema</strong>, remove the example schema, and
              paste this prepared CodeBridge schema.
            </p>
            <CopyField
              id="actionSchema"
              label="Schema"
              value={JSON.stringify(setup.schema, null, 2)}
              multiline
            />
            <Screenshot name="chatgpt-schema.png" alt="ChatGPT Action Schema field" />
          </Section>

          <Section step="5" title="Set Authentication">
            <Illustration label="Illustration only — use the real controls in ChatGPT.">
              <div className="font-medium text-foreground">Authentication</div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Type: <strong>API Key</strong>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Authorization: <strong>Bearer</strong>
              </div>
            </Illustration>
            <Screenshot name="chatgpt-auth.png" alt="Authentication API Key Bearer" />
            <p className="text-sm text-muted-foreground">
              Then paste the private CodeBridge connection secret below into the{" "}
              <strong>API Key</strong> field and click <strong>Save</strong>.
            </p>
            <CopyField id="actionSecret" label="Connection secret" value={setup.secret} secret />
            <p className="rounded-lg bg-muted/60 px-3 py-2.5 text-[13px] text-muted-foreground">
              This is a CodeBridge connection secret — <strong>not</strong> an OpenAI API key.
              Never paste an OpenAI API key here.
            </p>
          </Section>

          <Section step="6" title="Test the connection">
            <p className="text-sm text-muted-foreground">
              Save the GPT and ask it: <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">Check CodeBridge connection</code>.
              When it answers that CodeBridge is connected, click below.
            </p>
            <Button onClick={checkConnection} disabled={checking}>
              {checking ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Check connection
            </Button>
            {error && <p className="text-[13px] font-medium text-destructive">{error}</p>}
          </Section>
        </>
      )}
    </div>
  );
}
