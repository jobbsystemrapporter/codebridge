import { useState } from "react";
import { CheckCircle2, GitBranch, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { api, type WorktreeResult } from "@/lib/api";

interface Review {
  project: string;
  worktree: string;
  diff: string;
  stat: string;
  status: string;
}

export function WorkspacePanel({ roots }: { roots: string[] }) {
  const [result, setResult] = useState<WorktreeResult | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  async function create() {
    if (!roots.length) return;
    setBusy("create");
    try {
      const r = await api<WorktreeResult>("/api/worktree", {
        method: "POST",
        body: JSON.stringify({ project: roots[0] }),
      });
      setResult(r);
      setReview(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create workspace.");
    } finally {
      setBusy("");
    }
  }

  async function reviewChanges() {
    if (!result) return;
    setBusy("review");
    try {
      const r = await api<Review>("/api/worktree/review", {
        method: "POST",
        body: JSON.stringify({ project: result.project, worktree: result.path }),
      });
      setReview(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not review changes.");
    } finally {
      setBusy("");
    }
  }

  async function discard() {
    if (!result) return;
    setBusy("discard");
    try {
      await api("/api/worktree/discard", {
        method: "POST",
        body: JSON.stringify({ project: result.project, worktree: result.path }),
      });
      setResult(null);
      setReview(null);
      toast.success("Safe workspace discarded. Your original project was untouched.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not discard workspace.");
    } finally {
      setBusy("");
      setConfirmDiscard(false);
    }
  }

  async function apply() {
    if (!result) return;
    setBusy("apply");
    try {
      const r = await api<{ ok: boolean; branch: string }>("/api/worktree/apply", {
        method: "POST",
        body: JSON.stringify({ project: result.project, worktree: result.path }),
      });
      setResult(null);
      setReview(null);
      toast.success(`Changes from ${r.branch} applied to the project.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not apply changes.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Safe workspace</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Create an isolated Git worktree so ChatGPT&apos;s changes never touch your project
            directly.
          </p>
        </div>
        <Button onClick={create} disabled={busy !== "" || roots.length === 0}>
          {busy === "create" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <GitBranch className="mr-2 size-4" />}
          {result ? "New workspace" : "Create workspace"}
        </Button>
      </div>

      {result && (
        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4 text-primary" />
            Workspace ready
            <span className="ml-auto rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-foreground">
              {result.branch}
            </span>
          </div>
          <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">{result.path}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={reviewChanges} disabled={busy !== ""}>
              {busy === "review" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Review changes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmDiscard(true)} disabled={busy !== ""}>
              <Trash2 className="mr-2 size-3.5" />
              Discard
            </Button>
            <Button size="sm" onClick={apply} disabled={busy !== ""}>
              {busy === "apply" ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : null}
              Apply changes
            </Button>
          </div>
        </div>
      )}

      {review && (
        <div className="mt-4 space-y-3">
          {review.stat && (
            <pre className="max-h-44 overflow-auto rounded-lg bg-foreground p-3 text-[12px] leading-relaxed text-background">
              {review.stat}
            </pre>
          )}
          {review.diff && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-foreground p-3 font-mono text-[12px] leading-relaxed text-background">
              {review.diff}
            </pre>
          )}
          {!review.diff && !review.stat && (
            <p className="text-[13px] text-muted-foreground">No changes yet.</p>
          )}
        </div>
      )}

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              All changes in the safe workspace will be removed. Your original project is not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={discard} className="bg-destructive text-destructive-foreground">
              Discard workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
