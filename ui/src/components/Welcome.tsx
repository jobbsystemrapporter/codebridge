import { CheckCircle2, FolderLock, History, ShieldCheck, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  { icon: FolderLock, title: "Local-first", text: "Your projects stay on this Mac until you choose to share them with ChatGPT." },
  { icon: ShieldCheck, title: "Project boundaries", text: "Only folders you explicitly allow are ever visible to ChatGPT." },
  { icon: TerminalSquare, title: "Command approvals", text: "Risky actions ask you first, with an Allow once / Cancel choice." },
  { icon: History, title: "Audit history", text: "Every file, Git and command action is recorded locally." },
];

export function Welcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-xs font-bold tracking-[0.2em] text-primary/70">CODEBRIDGE</p>
      <h1 className="mt-3 max-w-xl font-display text-5xl font-medium tracking-tight text-balance sm:text-6xl">
        Your code. Your ChatGPT.{" "}
        <span className="text-gradient">Connected.</span>
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        CodeBridge gives ChatGPT a safe place to work with projects on this computer —
        no terminal, no MCP, no developer setup.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <Card key={f.title} className="p-4">
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="text-sm font-semibold">{f.title}</div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{f.text}</p>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-xl border bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          CodeBridge stores its local configuration privately in <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[12px]">~/.codebridge</code>.
          Nothing is exposed until you choose project folders.
        </p>
      </div>

      <div className="mt-8">
        <Button size="lg" onClick={onNext}>
          Get started
          <span aria-hidden>→</span>
        </Button>
      </div>
    </div>
  );
}
