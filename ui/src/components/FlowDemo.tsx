import { useEffect, useState } from "react";
import { Check, FileCode2, Loader2, MessageSquare, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";

// Reaching Ready tells the user the bridge works, but not what working looks like.
// This replays one real round trip — prompt in, hops across the bridge, answer back —
// so the capability cards above stop being abstract.

interface Scenario {
  prompt: string;
  icon: typeof FileCode2;
  work: string;
  answer: string;
}

const SCENARIOS: Scenario[] = [
  {
    prompt: "Show me my projects",
    icon: FileCode2,
    work: "listProjects",
    answer: "You have 1 allowed project. Want me to open it?",
  },
  {
    prompt: "Open this project and explain its structure",
    icon: FileCode2,
    work: "openWorkspace → readFile",
    answer: "It's a Vite app. Entry point is src/main.tsx, 14 components.",
  },
  {
    prompt: "Find the bug, fix it and run the tests",
    icon: Terminal,
    work: "writeFile → runCommand",
    answer: "Fixed the off-by-one in parseRange. 24 tests pass.",
  },
  {
    prompt: "Show me what changed in Git",
    icon: FileCode2,
    work: "gitStatus",
    answer: "3 files changed on branch main, nothing committed yet.",
  },
];

const HOPS = ["ChatGPT", "Action", "CodeBridge", "Your project"];

// Phase 0 prompt, 1 travelling, 2 working, 3 answered, 4 hold before the next one.
const PHASE_MS = [900, 1500, 1400, 2200, 700];

export function FlowDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const t = setTimeout(() => {
      if (phase === PHASE_MS.length - 1) {
        setIndex((i) => (i + 1) % SCENARIOS.length);
        setPhase(0);
      } else {
        setPhase((p) => p + 1);
      }
    }, PHASE_MS[phase]);
    return () => clearTimeout(t);
  }, [phase, reduced]);

  const scenario = SCENARIOS[index];
  const Icon = scenario.icon;

  // Reduced motion gets the finished state, never a moving one.
  const shown = reduced ? 3 : phase;
  const activeHop = shown === 1 ? 2 : shown >= 2 ? HOPS.length - 1 : 0;

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold">What it looks like in use</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Every request takes the same path, and nothing leaves the projects you allowed.
      </p>

      <Card className="mt-3 overflow-hidden p-5">
        {/* Prompt */}
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted">
            <MessageSquare className="size-3.5 text-muted-foreground" />
          </span>
          <div
            key={`p-${index}`}
            className="min-h-9 flex-1 rounded-lg rounded-tl-sm bg-muted px-3 py-2 text-[13px] animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            “{scenario.prompt}”
          </div>
        </div>

        {/* Hops */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5" aria-hidden>
          {HOPS.map((hop, i) => {
            const reachedHop = shown >= 1 && i <= activeHop;
            return (
              <span key={hop} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className="relative h-px w-6 overflow-hidden bg-border">
                    <span
                      className={`absolute inset-0 origin-left bg-primary transition-transform duration-500 ${
                        reachedHop ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </span>
                )}
                <span
                  className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-300 ${
                    reachedHop
                      ? "bg-primary/15 text-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {hop}
                </span>
              </span>
            );
          })}
        </div>

        {/* Work + answer. Height is reserved so the card never jumps between phases. */}
        <div className="mt-4 min-h-[4.5rem]">
          {shown === 2 && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground animate-in fade-in duration-200">
              <Loader2 className="size-3.5 animate-spin" />
              Running <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{scenario.work}</code> on your Mac
            </div>
          )}

          {shown >= 3 && (
            <div
              key={`a-${index}`}
              className="animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <div className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
                <Check className="size-3.5" />
                {scenario.work}
              </div>
              <div className="mt-1.5 flex items-start gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted">
                  <Icon className="size-3.5 text-muted-foreground" />
                </span>
                <div className="flex-1 rounded-lg rounded-tl-sm border bg-background px-3 py-2 text-[13px]">
                  {scenario.answer}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-1.5 border-t pt-3" aria-hidden>
          {SCENARIOS.map((s, i) => (
            <span
              key={s.prompt}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            Example — your GPT does this for real.
          </span>
        </div>
      </Card>
    </div>
  );
}
