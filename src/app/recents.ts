import { useCallback } from "react";
import type { JobStatus, ShortJob, ShortRequest, ShortStage } from "../lib/reelapi";
import { useStoredState } from "./storage";

export interface Recent {
  id: string;
  createdAt: number;
  request: ShortRequest;
  status: JobStatus | "expired";
  stage?: ShortStage | null;
  title?: string;
  poster?: string;
}

const MAX_RECENTS = 30;
export const OUTPUT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function useRecents() {
  const [items, setItems] = useStoredState<Recent[]>("shorts-studio:recents", [], sanitizeRecents);

  const add = useCallback(
    (recent: Recent) => setItems((list) => [recent, ...list.filter((item) => item.id !== recent.id)].slice(0, MAX_RECENTS)),
    [setItems],
  );

  const update = useCallback(
    (id: string, patch: Partial<Recent>) => setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item))),
    [setItems],
  );

  const remove = useCallback((id: string) => setItems((list) => list.filter((item) => item.id !== id)), [setItems]);
  const clear = useCallback(() => setItems([]), [setItems]);

  return { items, add, update, remove, clear };
}

export function summarize(job: ShortJob): Pick<Recent, "status" | "stage" | "title" | "poster"> {
  return {
    status: job.status,
    stage: job.stage ?? null,
    ...(job.result?.title ? { title: job.result.title } : {}),
    ...(job.outputs.poster ? { poster: job.outputs.poster } : {}),
  };
}

export function isExpired(recent: Recent): boolean {
  return recent.status === "expired" || Date.now() - recent.createdAt > OUTPUT_TTL_MS;
}

function sanitizeRecents(raw: unknown): Recent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Recent =>
      typeof item === "object" && item !== null && typeof item.id === "string" && typeof item.createdAt === "number" && typeof item.request === "object",
  );
}
