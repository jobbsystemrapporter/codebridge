import { useState } from "react";
import { CheckCircle2, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  current: "safe" | "developer";
  onSave: (mode: "safe" | "developer") => Promise<void>;
  onBack: () => void;
}

export function Security({ current, onSave, onBack }: Props) {
  const [mode, setMode] = useState<"safe" | "developer">(current || "safe");
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    try {
      await onSave(mode);
    } finally {
      setBusy(false);
    }
  }

  const options = [
    {
      value: "safe" as const,
      icon: ShieldCheck,
      title: "Safe mode",
      text: "Recommended. Commands that change state require your approval, and destructive operations always ask first.",
      recommended: true,
    },
    {
      value: "developer" as const,
      icon: SlidersHorizontal,
      title: "Developer mode",
      text: "More permissive for power users. Destructive commands still require approval.",
      recommended: false,
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-xs font-bold tracking-[0.2em] text-primary/70">SAFE BY DEFAULT</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
        You stay in control.
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Choose how much CodeBridge may do without asking you first.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const Icon = o.icon;
          const selected = mode === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setMode(o.value)}
              className={cn(
                "relative rounded-xl border bg-card p-5 text-left shadow-sm transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/25"
                  : "hover:border-primary/50"
              )}
            >
              {o.recommended && (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">
                  Recommended
                </span>
              )}
              <div className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-base font-semibold">
                {o.title}
                {selected && <CheckCircle2 className="size-4 text-primary" />}
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{o.text}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={finish} disabled={busy}>
          {busy ? "Saving…" : "Finish setup"}
        </Button>
      </div>
    </div>
  );
}
