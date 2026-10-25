import {
  ASPECTS,
  CAPTION_PRESETS,
  EN_VOICES,
  ES_VOICES,
  MUSIC_MOODS,
  SHORT_LANGUAGES,
  SHORT_STYLES,
  type Aspect,
  type CaptionPreset,
  type EnVoice,
  type EsVoice,
  type MusicMood,
  type ShortLanguage,
  type ShortRequest,
  type ShortStyle,
} from "../lib/reelapi";
import { DURATIONS } from "./options";

export type CaptionChoice = "auto" | "off" | CaptionPreset;

export interface Settings {
  mode: "topic" | "script";
  topic: string;
  script: string;
  style: ShortStyle;
  duration: number;
  aspect: Aspect;
  language: ShortLanguage;
  enVoice: EnVoice;
  esVoice: EsVoice;
  music: MusicMood;
  captions: CaptionChoice;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: "topic",
  topic: "",
  script: "",
  style: "cinematic",
  duration: 45,
  aspect: "9:16",
  language: "en",
  enVoice: "luna",
  esVoice: "aquila",
  music: "auto",
  captions: "auto",
};

export function toRequest(settings: Settings): ShortRequest {
  const voice = settings.language === "en" ? settings.enVoice : settings.language === "es" ? settings.esVoice : undefined;
  const captions: CaptionPreset | false | undefined =
    settings.captions === "off" ? false : settings.captions === "auto" ? undefined : settings.captions;

  const options = {
    style: settings.style,
    aspect: settings.aspect,
    language: settings.language,
    music: settings.music,
    ...(voice ? { voice } : {}),
    ...(captions === undefined ? {} : { captions }),
  };

  if (settings.mode === "script") return { script: settings.script.trim(), ...options };
  return { topic: settings.topic.trim(), duration_s: settings.duration, ...options };
}

// Loads a past request back into the form
export function fromRequest(request: ShortRequest, current: Settings): Settings {
  return sanitizeSettings({
    ...current,
    mode: request.script ? "script" : "topic",
    ...(request.script ? { script: request.script } : { topic: request.topic }),
    style: request.style,
    aspect: request.aspect,
    language: request.language,
    music: request.music,
    duration: request.duration_s ?? current.duration,
    captions: request.captions === false ? "off" : typeof request.captions === "string" ? request.captions : "auto",
    ...(request.language === "es" ? { esVoice: request.voice } : { enVoice: request.voice }),
  });
}

// Stored settings can be stale or hand-edited, so every field is checked
export function sanitizeSettings(raw: unknown): Settings {
  const input = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

  return {
    mode: pick(input.mode, ["topic", "script"] as const, DEFAULT_SETTINGS.mode),
    topic: typeof input.topic === "string" ? input.topic : "",
    script: typeof input.script === "string" ? input.script : "",
    style: pick(input.style, SHORT_STYLES, DEFAULT_SETTINGS.style),
    duration: pick(input.duration, DURATIONS, 45),
    aspect: pick(input.aspect, ASPECTS, DEFAULT_SETTINGS.aspect),
    language: pick(input.language, SHORT_LANGUAGES, DEFAULT_SETTINGS.language),
    enVoice: pick(input.enVoice, EN_VOICES, DEFAULT_SETTINGS.enVoice),
    esVoice: pick(input.esVoice, ES_VOICES, DEFAULT_SETTINGS.esVoice),
    music: pick(input.music, MUSIC_MOODS, DEFAULT_SETTINGS.music),
    captions: pick(input.captions, ["auto", "off", ...CAPTION_PRESETS] as const, DEFAULT_SETTINGS.captions),
  };
}
