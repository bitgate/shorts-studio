import {
  ASPECTS,
  CAPTION_PRESETS,
  EN_VOICES,
  ES_VOICES,
  MUSIC_MOODS,
  SHORT_LANGUAGES,
  SHORT_STYLES,
  type Issue,
  type ShortRequest,
} from "../src/lib/reelsdk";

export const TOPIC_MAX = 500;
export const SCRIPT_MAX = 3000;

type Parsed = { ok: true; request: ShortRequest } | { ok: false; issues: Issue[] };

// Whitelists what the browser may send, so nothing else (like webhook_url) reaches the API
export function parseShortRequest(raw: unknown): Parsed {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, issues: [{ path: "", message: "Expected a JSON object" }] };
  }

  const input = raw as Record<string, unknown>;
  const issues: Issue[] = [];

  const topic = text(input, "topic", TOPIC_MAX, issues);
  const script = text(input, "script", SCRIPT_MAX, issues);
  if (!topic && !script && issues.length === 0) issues.push({ path: "topic", message: "Enter a topic or a script" });

  const style = oneOf(input, "style", SHORT_STYLES, issues);
  const aspect = oneOf(input, "aspect", ASPECTS, issues);
  const language = oneOf(input, "language", SHORT_LANGUAGES, issues);
  const music = oneOf(input, "music", MUSIC_MOODS, issues);

  const voices = language === "es" ? ES_VOICES : language === undefined || language === "en" ? EN_VOICES : null;
  const voice = voices ? oneOf(input, "voice", voices, issues) : undefined;

  let duration_s: number | undefined;
  if (input.duration_s !== undefined) {
    const value = input.duration_s;
    if (typeof value === "number" && Number.isInteger(value) && value >= 15 && value <= 90) duration_s = value;
    else issues.push({ path: "duration_s", message: "Must be a whole number of seconds from 15 to 90" });
  }

  let captions: false | (typeof CAPTION_PRESETS)[number] | undefined;
  if (input.captions !== undefined) {
    if (input.captions === false || CAPTION_PRESETS.includes(input.captions as never)) captions = input.captions as typeof captions;
    else issues.push({ path: "captions", message: `Must be false or one of ${CAPTION_PRESETS.join(", ")}` });
  }

  if (issues.length > 0) return { ok: false, issues };

  const options = { style, aspect, language, music, voice, captions, duration_s: script ? undefined : duration_s };
  const request = (script ? { script, topic, ...options } : { topic: topic!, ...options }) as ShortRequest;

  return { ok: true, request: JSON.parse(JSON.stringify(request)) };
}

function text(input: Record<string, unknown>, key: string, max: number, issues: Issue[]): string | undefined {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    issues.push({ path: key, message: "Must be text" });
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed.length > max) issues.push({ path: key, message: `Keep it under ${max} characters` });
  return trimmed || undefined;
}

function oneOf<T extends string>(input: Record<string, unknown>, key: string, allowed: readonly T[], issues: Issue[]): T | undefined {
  const value = input[key];
  if (value === undefined) return undefined;
  if (allowed.includes(value as T)) return value as T;

  issues.push({ path: key, message: `Must be one of ${allowed.join(", ")}` });
  return undefined;
}
