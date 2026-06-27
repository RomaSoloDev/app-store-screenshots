import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { ProjectMeta } from "@/lib/types";

export const dynamic = "force-dynamic";

const PROJECTS_DIR = "projects";
const REGISTRY_FILE = "index.json";

function projectsDir() {
  return path.join(process.cwd(), PROJECTS_DIR);
}

function registryPath() {
  return path.join(projectsDir(), REGISTRY_FILE);
}

async function resolveProjectFile(id: string | null): Promise<string> {
  const effectiveId = id || "default";
  try {
    const raw = await fs.readFile(registryPath(), "utf8");
    const projects = JSON.parse(raw) as ProjectMeta[];
    const project = projects.find((p) => p.id === effectiveId);
    if (project) return path.join(projectsDir(), project.file);
  } catch { /* fall through */ }
  // Fallback: derive filename deterministically so new projects can write
  // their file before the registry catches up.
  const file = effectiveId === "default" ? "default.json" : `${effectiveId}.json`;
  return path.join(projectsDir(), file);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const filePath = await resolveProjectFile(id);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return NextResponse.json({ ok: true, state: parsed });
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return NextResponse.json({ ok: true, state: null });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const filePath = await resolveProjectFile(id);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Keep the project registry name + updatedAt in sync with the appName.
  const appName = (body as Record<string, unknown>).appName;
  if (id && id !== "default" && typeof appName === "string") {
    try {
      const raw = await fs.readFile(registryPath(), "utf8");
      const projects = JSON.parse(raw) as ProjectMeta[];
      const idx = projects.findIndex((p) => p.id === id);
      if (idx !== -1) {
        projects[idx] = { ...projects[idx], name: appName, updatedAt: Date.now() };
        await fs.writeFile(registryPath(), JSON.stringify(projects, null, 2) + "\n", "utf8");
      }
    } catch { /* ignore — registry sync is best-effort */ }
  }

  try {
    // Ensure the projects/ directory exists before writing.
    await fs.mkdir(projectsDir(), { recursive: true });
    const pretty = JSON.stringify(body, null, 2) + "\n";
    await fs.writeFile(filePath, pretty, "utf8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
