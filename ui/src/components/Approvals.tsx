import { AlertCircle } from "lucide-react";
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
import type { ApprovalItem } from "@/lib/api";

export function approvalDetail(item: ApprovalItem): string {
  const cmd = [item.executable, ...(item.args || [])].filter(Boolean).join(" ");
  const lines = [item.kind && item.kind !== "legacy-shell" ? `Command: ${cmd}` : cmd, `Workspace: ${item.cwd || "—"}`];
  return lines.filter(Boolean).join("\n\n");
}

interface Props {
  item: ApprovalItem | null;
  onDecide: (allow: boolean) => Promise<void>;
}

export function Approvals({ item, onDecide }: Props) {
  return (
    <AlertDialog open={!!item} onOpenChange={() => void onDecide(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-500" />
            CodeBridge approval
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed">
            {item ? approvalDetail(item) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => void onDecide(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onDecide(true)}>Allow once</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
