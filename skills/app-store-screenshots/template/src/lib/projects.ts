"use client";
import { useCallback, useEffect, useState } from "react";
import { ACTIVE_PROJECT_KEY, DEFAULT_PROJECT_ID } from "./constants";
import type { ProjectMeta } from "./types";

async function apiFetchProjects(): Promise<ProjectMeta[]> {
  const resp = await fetch("/api/projects", { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = (await resp.json()) as { ok: boolean; projects: ProjectMeta[] };
  if (!json.ok) throw new Error("Failed to load projects");
  return json.projects;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [activeProjectId, _setActiveProjectId] = useState<string>(DEFAULT_PROJECT_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetchProjects()
      .then((list) => {
        setProjects(list);
        // Restore last-used project from localStorage (if it still exists).
        const stored =
          typeof window !== "undefined"
            ? window.localStorage.getItem(ACTIVE_PROJECT_KEY)
            : null;
        const validId =
          stored && list.some((p) => p.id === stored)
            ? stored
            : list[0]?.id ?? DEFAULT_PROJECT_ID;
        _setActiveProjectId(validId);
      })
      .catch(() => {
        // Fallback: show a single default project so the editor can still work.
        const now = Date.now();
        setProjects([
          { id: DEFAULT_PROJECT_ID, name: "My App", file: "app-store-screenshots.json", createdAt: now, updatedAt: now },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const setActiveProjectId = useCallback((id: string) => {
    _setActiveProjectId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    }
  }, []);

  const createProject = useCallback(async (name?: string): Promise<ProjectMeta | null> => {
    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name?.trim() || "New Project" }),
      });
      const json = (await resp.json()) as { ok: boolean; project: ProjectMeta };
      if (!json.ok) return null;
      setProjects((prev) => [...prev, json.project]);
      return json.project;
    } catch {
      return null;
    }
  }, []);

  const duplicateProject = useCallback(async (id: string): Promise<ProjectMeta | null> => {
    try {
      const resp = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ copyFrom: id }),
      });
      const json = (await resp.json()) as { ok: boolean; project: ProjectMeta };
      if (!json.ok) return null;
      setProjects((prev) => {
        // Insert the copy right after the original.
        const idx = prev.findIndex((p) => p.id === id);
        const next = [...prev];
        next.splice(idx === -1 ? next.length : idx + 1, 0, json.project);
        return next;
      });
      return json.project;
    } catch {
      return null;
    }
  }, []);

  const renameProject = useCallback(async (id: string, name: string): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Optimistic update.
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p)),
    );
    try {
      await fetch("/api/projects", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, name: trimmed }),
      });
    } catch { /* ignore — optimistic update already applied */ }
  }, []);

  const deleteProject = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const resp = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        const json = (await resp.json()) as { ok: boolean; error?: string };
        if (!json.ok) return false;

        setProjects((prev) => {
          const remaining = prev.filter((p) => p.id !== id);
          // If the active project was deleted, switch to the first remaining one.
          _setActiveProjectId((cur) => {
            if (cur !== id) return cur;
            const next = remaining[0]?.id ?? DEFAULT_PROJECT_ID;
            if (typeof window !== "undefined") {
              window.localStorage.setItem(ACTIVE_PROJECT_KEY, next);
            }
            return next;
          });
          return remaining;
        });
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  // Keep local project name in sync when the user renames the app inside the editor.
  const syncProjectName = useCallback((id: string, name: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
    );
  }, []);

  return {
    projects,
    activeProjectId,
    loading,
    setActiveProjectId,
    createProject,
    duplicateProject,
    renameProject,
    deleteProject,
    syncProjectName,
  };
}
