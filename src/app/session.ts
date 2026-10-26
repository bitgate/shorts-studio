import type { Issue, ReelSdkError, ShortJob, ShortRequest } from "../lib/reelsdk";
import { SCRIPT_MAX, TOPIC_MAX } from "./options";
import type { Settings } from "./settings";

export type Session =
  | { phase: "creating"; request: ShortRequest; startedAt: number }
  | { phase: "create-failed"; request: ShortRequest; error: ReelSdkError }
  | {
      phase: "tracking";
      request: ShortRequest;
      id: string;
      createdAt: number;
      job: ShortJob | null;
      expired: boolean;
      stalled: boolean;
      pollError: ReelSdkError | null;
    };

export type FieldName = "topic" | "script" | "style" | "duration" | "aspect" | "language" | "voice" | "music" | "captions" | "form";
export type FieldErrors = Partial<Record<FieldName, string>>;

const FIELD_BY_PATH: Record<string, FieldName> = {
  topic: "topic",
  script: "script",
  style: "style",
  duration_s: "duration",
  aspect: "aspect",
  language: "language",
  voice: "voice",
  music: "music",
  captions: "captions",
};

export function isRunning(job: { status: string }): boolean {
  return job.status === "queued" || job.status === "running";
}

export function validate(settings: Settings): FieldErrors | null {
  const field = settings.mode;
  const value = settings[field].trim();
  const max = field === "script" ? SCRIPT_MAX : TOPIC_MAX;

  if (!value) return { [field]: field === "script" ? "Paste a script first" : "Enter a topic first" };
  if (value.length > max) return { [field]: `Keep it under ${max} characters` };
  return null;
}

export function issuesToFields(issues: Issue[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const root = issue.path.split(/[.[]/)[0] ?? "";
    const field = FIELD_BY_PATH[root] ?? "form";
    errors[field] ??= field === "form" && issue.path ? `${issue.path}: ${issue.message}` : issue.message;
  }

  return errors;
}
