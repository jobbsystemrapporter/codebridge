import { ChevronDown, CircleCheck, CircleX } from "lucide-react";
import type { Status } from "@/lib/api";

export function TechDetails({ status, endpoint }: { status: Status | null; endpoint: string | null }) {
  return (
    <details className="group rounded-xl border bg-card px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted-foreground">
        Technical details
        <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-4 space-y-3 text-[13px]">
        <div className="grid gap-2 sm:grid-cols-2">
          {status?.doctor.checks.map((c) => (
            <div key={c.name} className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              {c.ok ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              ) : (
                <CircleX className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="truncate text-muted-foreground">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
        {endpoint && (
          <p>
            Connection address:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px]">{endpoint}</code>
          </p>
        )}
        {status && status.config.allowedRoots.length > 0 && (
          <div>
            <div className="mb-1.5 font-medium">Allowed project folders</div>
            {status.config.allowedRoots.map((p) => (
              <code key={p} className="mb-1 block truncate rounded bg-muted px-2 py-1 font-mono text-[12px]">
                {p}
              </code>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
