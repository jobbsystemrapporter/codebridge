import { useState } from "react";
import { Folder, FolderOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chooseFolder } from "@/lib/api";

interface Props {
  roots: string[];
  onAdd: (path: string) => Promise<void>;
  onRemove: (path: string) => Promise<void>;
  onNext: () => void;
  onBack: () => void;
}

export function Projects({ roots, onAdd, onRemove, onNext, onBack }: Props) {
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(value: string) {
    const target = value.trim();
    if (!target) return;
    setBusy(true);
    setError("");
    try {
      await onAdd(target);
      setPath("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add that folder.");
    } finally {
      setBusy(false);
    }
  }

  async function browse() {
    const selected = await chooseFolder();
    if (selected) await add(selected);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <p className="text-xs font-medium tracking-widest text-muted-foreground">PROJECT ACCESS</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
        Choose where ChatGPT can work.
      </h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Add only folders that contain projects you want AI tools to access.
      </p>

      <div className="mt-7 space-y-2.5">
        {roots.length === 0 && (
          <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
            No project folders yet. Add one below.
          </div>
        )}
        {roots.map((p) => {
          const name = p.split("/").filter(Boolean).pop() || p;
          return (
            <div
              key={p}
              className="flex items-center gap-3.5 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Folder className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{p}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${name}`}
                onClick={() => onRemove(p)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-4 shadow-sm">
        <Label htmlFor="rootPath" className="text-sm font-semibold">
          Add a project folder
        </Label>
        <div className="mt-2.5 flex gap-2">
          <Input
            id="rootPath"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add(path)}
            placeholder="~/Developer or /Users/name/Projects"
            className="font-mono text-[13px]"
          />
          <Button variant="outline" onClick={browse} disabled={busy}>
            <FolderOpen className="mr-2 size-4" />
            Browse…
          </Button>
          <Button onClick={() => add(path)} disabled={busy}>
            <Plus className="mr-2 size-4" />
            Add
          </Button>
        </div>
        {error && <p className="mt-2 text-[13px] font-medium text-destructive">{error}</p>}
        <p className="mt-3 text-xs text-muted-foreground">
          Sensitive locations such as SSH keys, cloud credentials and Keychains are blocked
          even if requested.
        </p>
      </div>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button size="lg" onClick={onNext} disabled={roots.length === 0}>
          {roots.length ? "Continue" : "Add a folder first"}
        </Button>
      </div>
    </div>
  );
}
