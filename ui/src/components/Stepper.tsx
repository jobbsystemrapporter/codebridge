import { Check, FolderGit2, MessagesSquare, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Welcome", icon: Sparkles },
  { label: "Projects", icon: FolderGit2 },
  { label: "ChatGPT", icon: MessagesSquare },
  { label: "Security", icon: ShieldCheck },
];

export function Stepper({ current }: { current: number }) {
  return (
    <aside className="hidden h-full w-72 shrink-0 flex-col bg-sidebar p-7 text-sidebar-foreground md:flex">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-primary text-[13px] font-semibold text-primary-foreground">
          CB
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">CodeBridge</div>
          <div className="text-xs text-sidebar-foreground/60">Local coding bridge</div>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-1.5">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === current;
          const done = i < current;
          return (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active && "bg-sidebar-accent text-sidebar-accent-foreground",
                !active && !done && "text-sidebar-foreground/55"
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border text-[11px]",
                  done && "border-sidebar-primary bg-sidebar-primary text-sidebar-primary-foreground",
                  active && "border-sidebar-ring",
                  !active && !done && "border-sidebar-border"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <Icon className="size-4 opacity-80" />
              <span className="font-medium">{s.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3.5 py-3 text-xs">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
        </span>
        <div className="leading-snug">
          <div className="font-semibold">Local service</div>
          <div className="text-sidebar-foreground/55">Protected on this Mac</div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-sidebar-foreground/45">
        <Zap className="size-3" />
        ChatGPT is the AI. CodeBridge is the bridge.
      </div>
    </aside>
  );
}
