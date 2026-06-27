"use client";
import * as React from "react";
import { Check, ChevronDown, Copy, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { ProjectMeta } from "@/lib/types";

type Props = {
  projects: ProjectMeta[];
  activeProjectId: string;
  disabled?: boolean;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
};

export function ProjectSwitcher({
  projects,
  activeProjectId,
  disabled,
  onSwitch,
  onCreate,
  onDuplicate,
  onDelete,
  onRename,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const startRename = (e: React.MouseEvent, project: ProjectMeta) => {
    e.stopPropagation();
    setRenamingId(project.id);
    setRenameValue(project.name);
    // Focus the input after the dropdown re-renders.
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const cancelRename = () => {
    setRenamingId(null);
  };

  const handleRenameKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") cancelRename();
    e.stopPropagation();
  };

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpen(false);
    onDuplicate(id);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 max-w-[160px] gap-1.5 px-2 text-xs font-medium"
          disabled={disabled}
          title="Switch project"
        >
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{activeProject?.name ?? "Project"}</span>
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64" onCloseAutoFocus={(e) => e.preventDefault()}>
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const isRenaming = renamingId === project.id;

          return (
            <DropdownMenuItem
              key={project.id}
              className="group flex items-center gap-2 pr-1"
              onSelect={(e) => {
                if (isRenaming) { e.preventDefault(); return; }
                if (!isActive) onSwitch(project.id);
                setOpen(false);
              }}
            >
              <Check
                className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-primary" : "text-transparent"}`}
              />

              {isRenaming ? (
                <Input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={handleRenameKey}
                  onBlur={commitRename}
                  onClick={(e) => e.stopPropagation()}
                  className="h-6 flex-1 border-primary px-1 py-0 text-xs"
                />
              ) : (
                <span className="flex-1 truncate text-sm">{project.name}</span>
              )}

              <span className="ml-auto flex shrink-0 gap-0.5">
                {isRenaming ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                    title="Cancel rename"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={(e) => startRename(e, project)}
                      title="Rename project"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={(e) => handleDuplicate(e, project.id)}
                      title="Duplicate project"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-30"
                  onClick={(e) => handleDelete(e, project.id)}
                  disabled={projects.length <= 1}
                  title={projects.length <= 1 ? "Can't delete the last project" : "Delete project"}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </span>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="gap-2 text-sm"
          onSelect={(e) => {
            e.preventDefault();
            setOpen(false);
            onCreate();
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          New project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
