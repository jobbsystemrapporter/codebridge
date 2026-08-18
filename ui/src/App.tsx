import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Approvals, approvalDetail } from "@/components/Approvals";
import { Projects } from "@/components/Projects";
import { Ready } from "@/components/Ready";
import { Security } from "@/components/Security";
import { Stepper } from "@/components/Stepper";
import { Welcome } from "@/components/Welcome";
import {
  api,
  initSession,
  nativeAvailable,
  requestNativeApproval,
  trashApp,
  type ApprovalItem,
  type Status,
} from "@/lib/api";

const STEPS = ["Welcome", "Projects", "ChatGPT", "Security", "Ready"];

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [step, setStep] = useState(0);
  const [fatal, setFatal] = useState("");
  const [pendingApproval, setPendingApproval] = useState<ApprovalItem | null>(null);
  const [confirmAction, setConfirmAction] = useState<"erase" | "uninstall" | null>(null);
  const [uninstalled, setUninstalled] = useState(false);
  const processingApproval = useRef(false);

  const refresh = useCallback(async () => {
    const s = await api<Status>("/api/status");
    setStatus(s);
    return s;
  }, []);

  const load = useCallback(async () => {
    try {
      await initSession();
      const s = await refresh();
      if (s.config.chatgpt.connected && s.config.setupComplete) setStep(4);
      else if (s.config.chatgpt.connected) setStep(3);
      else if (s.config.allowedRoots.length) setStep(2);
      else setStep(0);
    } catch (e) {
      setFatal(e instanceof Error ? e.message : "Could not start CodeBridge.");
    }
  }, [refresh]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll for approval requests while on the Ready screen.
  useEffect(() => {
    if (step !== 4) return;
    let stopped = false;

    const tick = async () => {
      if (processingApproval.current) return;
      try {
        const { items } = await api<{ items: ApprovalItem[] }>("/api/approvals");
        if (stopped || !items.length) return;
        processingApproval.current = true;
        const item = items[0];
        if (nativeAvailable()) {
          const allow = await requestNativeApproval(approvalDetail(item));
          await api("/api/approvals/decide", {
            method: "POST",
            body: JSON.stringify({ id: item.id, allow }),
          });
          processingApproval.current = false;
        } else {
          setPendingApproval(item);
          processingApproval.current = false;
        }
      } catch {
        processingApproval.current = false;
      }
    };

    void tick();
    const t = window.setInterval(tick, 1500);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [step]);

  async function decideApproval(allow: boolean) {
    const item = pendingApproval;
    setPendingApproval(null);
    if (!item) return;
    try {
      await api("/api/approvals/decide", {
        method: "POST",
        body: JSON.stringify({ id: item.id, allow }),
      });
    } catch {
      // Approval will expire server-side; nothing else to do.
    }
  }

  async function addRoot(path: string) {
    await api("/api/workspaces", { method: "POST", body: JSON.stringify({ path }) });
    await refresh();
  }

  async function removeRoot(path: string) {
    await api("/api/workspaces", { method: "DELETE", body: JSON.stringify({ path }) });
    await refresh();
  }

  async function saveSecurity(mode: "safe" | "developer") {
    await api("/api/config", {
      method: "PATCH",
      body: JSON.stringify({ securityMode: mode, setupComplete: true }),
    });
    await refresh();
    setStep(4);
  }

  async function reset() {
    await api("/api/config", {
      method: "PATCH",
      body: JSON.stringify({ securityMode: "safe", setupComplete: false }),
    });
    await refresh();
    setStep(0);
  }

  async function eraseAll() {
    try {
      await api("/api/reset", { method: "POST", body: JSON.stringify({ confirm: true }) });
      toast.success("All CodeBridge data has been erased.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not erase CodeBridge data.");
    }
  }

  async function uninstall() {
    try {
      await api("/api/uninstall", { method: "POST", body: JSON.stringify({ confirm: true }) });
      if (nativeAvailable()) {
        await trashApp();
      } else {
        setUninstalled(true);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not uninstall CodeBridge.");
    }
  }

  const connected = !!status?.config.chatgpt.connected;
  const eyebrow = step === 4 && connected ? "CODEBRIDGE · READY" : `SETUP · ${step + 1} OF 5`;

  function next() {
    if (step === 1 && !status?.config.allowedRoots.length) return;
    if (step === 3) return; // Security finishes via saveSecurity
    setStep((s) => Math.min(4, s + 1));
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (uninstalled) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-lg bg-destructive/10 text-destructive">
            <RotateCcw className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            CodeBridge has been removed.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            All local CodeBridge data (configuration, secrets, logs and workspaces) has been
            erased. Your project files were never touched. Move CodeBridge.app to the Trash and
            empty it to finish the removal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <Stepper current={step} />

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between gap-3 border-b bg-background px-6 py-3 md:px-12">
          <div className="flex items-center gap-2 md:hidden">
            <div className="grid size-7 place-items-center rounded-lg bg-primary text-[11px] font-extrabold text-primary-foreground">
              CB
            </div>
            <span className="text-xs font-medium tracking-widest text-muted-foreground">
              {eyebrow}
            </span>
          </div>
          <div className="hidden text-xs font-medium tracking-widest text-muted-foreground md:block">
            {eyebrow}
          </div>
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <RotateCcw className="mr-1.5 size-3.5" />
                  Start over
                  <ChevronDown className="ml-1 size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => void reset()}>
                  Start over (keep projects)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setConfirmAction("erase")}>
                  Erase all data & start fresh
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setConfirmAction("uninstall")}
                >
                  Uninstall CodeBridge…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 md:px-8 md:py-14">
          {fatal ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
              <h1 className="text-xl font-semibold">CodeBridge could not start.</h1>
              <p className="mt-2 text-sm text-muted-foreground">{fatal}</p>
              <Button className="mt-5" onClick={load}>
                Try again
              </Button>
            </div>
          ) : !status ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-6 h-32 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {step === 0 && <Welcome onNext={next} />}
              {step === 1 && (
                <Projects
                  roots={status.config.allowedRoots}
                  onAdd={addRoot}
                  onRemove={removeRoot}
                  onNext={next}
                  onBack={back}
                />
              )}
              {step === 2 && (
                <Ready
                  status={status}
                  onRefresh={async () => {
                    const s = await refresh();
                    if (s.config.chatgpt.connected) setStep(s.config.setupComplete ? 4 : 3);
                  }}
                />
              )}
              {step === 3 && (
                <Security
                  current={status.config.securityMode}
                  onSave={saveSecurity}
                  onBack={back}
                />
              )}
              {step === 4 && (
                <Ready
                  status={status}
                  onRefresh={async () => {
                    await refresh();
                  }}
                />
              )}
            </>
          )}
        </div>
      </main>

      <Approvals item={pendingApproval} onDecide={decideApproval} />
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "erase" ? "Erase all CodeBridge data?" : "Uninstall CodeBridge?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "erase"
                ? "This permanently deletes your configuration, project list, connection secrets, audit history and workspaces. Your project files are never touched."
                : "This erases all CodeBridge data and moves CodeBridge.app to the Trash. Your project files are never touched. The app will quit."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const action = confirmAction;
                setConfirmAction(null);
                if (action === "erase") void eraseAll();
                if (action === "uninstall") void uninstall();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirmAction === "erase" ? "Erase everything" : "Uninstall"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Toaster richColors position="top-right" />
    </div>
  );
}
