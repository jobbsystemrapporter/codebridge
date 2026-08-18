import { useEffect, useState } from "react";
import {
  ArrowDown,
  BookOpen,
  CheckCircle2,
  Code2,
  FlaskConical,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConnectGuide } from "@/components/ConnectGuide";
import { TechDetails } from "@/components/TechDetails";
import { WorkspacePanel } from "@/components/WorkspacePanel";
import { api, type HistoryEntry, type Status } from "@/lib/api";

interface Props {
  status: Status;
  onRefresh: () => Promise<void>;
}

const CAPABILITIES = [
  {
    icon: BookOpen,
    title: "Read & understand",
    text: "ChatGPT can read allowed projects, inspect files and explain how the code works.",
  },
  {
    icon: Code2,
    title: "Edit code",
    text: "ChatGPT can create and update files inside the allowed projects.",
  },
  {
    icon: FlaskConical,
    title: "Test & inspect",
    text: "Approved project commands, tests and Git checks run through CodeBridge.",
  },
  {
    icon: ShieldCheck,
    title: "You stay in control",
    text: "Access is limited to the projects and safety rules you chose.",
  },
];

const EXAMPLES = [
  "Show me my projects",
  "Open this project and explain its structure",
  "Find the bug, fix it and run the tests",
  "Show me what changed in Git",
];

const CHAIN = [
  "ChatGPT",
  "Custom GPT Action",
  "Secure CodeBridge connection",
  "CodeBridge on your Mac",
  "Allowed project",
  "Result back to ChatGPT",
];

export function Ready({ status, onRefresh }: Props) {
  const connected = !!status.config.chatgpt.connected;
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (!connected) return;
    void api<HistoryEntry[]>("/api/history")
      .then(setHistory)
      .catch(() => {});
  }, [connected]);

  if (!connected) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">ONE LAST STEP</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Almost done.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Your projects and safety settings are ready. Finish the ChatGPT connection below.
        </p>
        <div className="mt-7">
          <ConnectGuide onConnected={onRefresh} />
        </div>
        <div className="mt-6 max-w-2xl">
          <TechDetails status={status} endpoint={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Badge className="gap-1.5 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
        </span>
        READY
      </Badge>

      <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
        CodeBridge is ready.
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        You can now use CodeBridge from ChatGPT. Open your CodeBridge GPT and ask it to show
        your projects.
      </p>

      <div className="mt-8 rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-lg">
        <h2 className="text-lg font-semibold">Start coding</h2>
        <p className="mt-1 text-sm text-sidebar-foreground/70">
          Try these prompts in your CodeBridge GPT:
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((p) => (
            <code
              key={p}
              className="rounded-lg bg-white/5 px-3 py-2.5 text-[13px] leading-snug text-sidebar-foreground/90"
            >
              “{p}”
            </code>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="p-5">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4.5" />
                </div>
                <div className="text-[15px] font-semibold">{c.title}</div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{c.text}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold">How it works</h2>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl border bg-card px-4 py-3.5">
          {CHAIN.map((part, i) => (
            <span key={part} className="flex items-center gap-1.5">
              {i > 0 && <ArrowDown className="size-3 rotate-[-90deg] text-muted-foreground/60" />}
              <span className="rounded-lg bg-muted px-2.5 py-1.5 text-[12.5px] font-medium">
                {part}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <WorkspacePanel roots={status.config.allowedRoots} />
      </div>

      {history.length > 0 && (
        <Card className="mt-4 p-5">
          <h3 className="text-sm font-semibold">Recent activity</h3>
          <ul className="mt-3 space-y-1.5">
            {history.slice(0, 5).map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex items-center gap-2 text-[13px]">
                <CheckCircle2 className="size-3.5 shrink-0 text-primary/70" />
                <span className="text-muted-foreground">
                  {new Date(h.at).toLocaleTimeString()}
                </span>
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">
                  {h.action}
                </code>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-6 max-w-2xl">
        <TechDetails status={status} endpoint={null} />
      </div>

      <div className="mt-8 flex items-center gap-2 text-[13px] text-muted-foreground">
        <GitBranch className="size-4" />
        ChatGPT is the AI. CodeBridge is the secure bridge to your Mac.
      </div>
    </div>
  );
}
