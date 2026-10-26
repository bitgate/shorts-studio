/**
 * reelsdk client. Zero dependencies: runs anywhere with fetch and Web Crypto
 * (Node 20+, Bun, Deno, Cloudflare Workers, browsers). Copy this file as is.
 *
 * Docs: https://api.reelsdk.com/llms.txt
 * Schema: https://api.reelsdk.com/openapi.json
 */

export const DEFAULT_BASE_URL = "https://api.reelsdk.com";

export const ASPECTS = ["9:16", "1:1", "16:9"] as const;
export const SHORT_STYLES = [
  "cinematic",
  "photoreal",
  "anime",
  "3d-cartoon",
  "watercolor",
  "comic",
  "dark-documentary",
  "oil-painting",
] as const;
export const SHORT_LANGUAGES = ["en", "es", "fr", "ja", "zh", "ko"] as const;
export const SHORT_STAGES = ["planning", "images", "voice", "rendering"] as const;
export const MUSIC_MOODS = [
  "auto",
  "none",
  "lofi",
  "chill",
  "upbeat",
  "cinematic",
  "dramatic",
  "dark",
  "energetic",
  "inspiring",
] as const;
export const CAPTION_PRESETS = ["bold", "karaoke", "minimal"] as const;
export const EN_VOICES = [
  "amalthea", "andromeda", "apollo", "arcas", "aries", "asteria", "athena", "atlas", "aurora", "callista",
  "cora", "cordelia", "delia", "draco", "electra", "harmonia", "helena", "hera", "hermes", "hyperion",
  "iris", "janus", "juno", "jupiter", "luna", "mars", "minerva", "neptune", "odysseus", "ophelia",
  "orion", "orpheus", "pandora", "phoebe", "pluto", "saturn", "thalia", "theia", "vesta", "zeus",
] as const;
export const ES_VOICES = [
  "sirio", "nestor", "carina", "celeste", "alvaro", "diana", "aquila", "selena", "estrella", "javier",
] as const;
export const DEFAULT_VOICES = { en: "luna", es: "aquila" } as const;

export type Aspect = (typeof ASPECTS)[number];
export type ShortStyle = (typeof SHORT_STYLES)[number];
export type ShortLanguage = (typeof SHORT_LANGUAGES)[number];
export type ShortStage = (typeof SHORT_STAGES)[number];
export type MusicMood = (typeof MUSIC_MOODS)[number];
export type CaptionPreset = (typeof CAPTION_PRESETS)[number];
export type EnVoice = (typeof EN_VOICES)[number];
export type EsVoice = (typeof ES_VOICES)[number];
export type Quality = "draft" | "standard" | "high";

export interface CaptionStyle {
  preset?: CaptionPreset;
  font?: "Montserrat" | "Anton" | "Bebas Neue" | "Poppins";
  position?: "top" | "middle" | "bottom" | "center";
  /** Words on screen at once, 1..8 */
  max_words?: number;
  uppercase?: boolean;
  /** "#RRGGBB" */
  text_color?: string;
  highlight_color?: string;
  outline_color?: string;
  /** Scale, 0.5..2 */
  size?: number;
}

export interface Word {
  word: string;
  /** Seconds */
  start: number;
  end: number;
}

type TopicOrScript =
  | { topic: string; script?: string }
  | { script: string; topic?: string };

/** POST /v1/shorts. `script` is read verbatim and wins over `topic`, which then only steers the visuals. */
export type ShortRequest = TopicOrScript & {
  /** Target length in topic mode, 15..90. Default 45 */
  duration_s?: number;
  aspect?: Aspect;
  style?: ShortStyle;
  language?: ShortLanguage | `${ShortLanguage}-${string}`;
  /** English or Spanish voice; ignored for fr/ja/zh/ko */
  voice?: EnVoice | EsVoice;
  music?: MusicMood;
  /** Defaults to the style's preset; `false` turns captions off */
  captions?: boolean | CaptionPreset | CaptionStyle;
  webhook_url?: string;
};

type AudioSource = string | { url: string; volume?: number };

export interface SlideshowRequest {
  images: Array<string | { url: string; seconds?: number | null }>;
  /** "1080x1920" or an aspect like "9:16" */
  size?: string;
  width?: number;
  height?: number;
  fps?: number;
  seconds_per_image?: number | null;
  /** "fade", "slideleft", "random", "none" ... */
  transition?: string | { type: string; seconds?: number };
  motion?: "none" | "kenburns" | boolean;
  fit?: "cover" | "contain";
  /** A URL, or `{ text, voice }` to generate the speech */
  voiceover?: AudioSource | { text: string; voice?: EnVoice; volume?: number } | null;
  music?: AudioSource | null;
  /** Needs a voiceover */
  captions?: boolean | CaptionPreset | CaptionStyle | null;
  language?: string | null;
  quality?: Quality;
  webhook_url?: string;
}

export interface CaptionsRequest {
  video_url: string;
  style?: CaptionPreset | CaptionStyle;
  language?: string | null;
  /** Bring your own timings and skip transcription */
  words?: Word[] | null;
  quality?: Quality;
  webhook_url?: string;
}

export interface FfmpegRequest {
  /** filename -> URL, downloaded into the working directory */
  inputs?: Record<string, string>;
  /** argv after `ffmpeg`; an array is safer than a string */
  args: string[] | string;
  /** Files to return, e.g. ["out.mp4"] */
  outputs?: string[];
  timeout_s?: number;
  webhook_url?: string;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface Job<Output extends string = string, Result = unknown> {
  id: string;
  op: "shorts" | "slideshow" | "captions" | "ffmpeg";
  status: JobStatus;
  /** Shorts only, while running */
  stage?: ShortStage | null;
  created_at: string;
  finished_at: string | null;
  duration_s: number | null;
  /** Output name -> public URL. Files expire after 7 days */
  outputs: Partial<Record<Output, string>>;
  result?: Result | null;
  error: { code: string; message: string } | null;
  usage: {
    output_seconds: number;
    audio_seconds: number;
    tts_characters: number;
    images?: number;
  };
  poll_url: string;
}

export interface ShortResult {
  title: string;
  post_caption: string;
  scenes: Array<{ narration: string; image: string }>;
}

export type ShortJob = Job<"video" | "poster" | "transcript" | "srt" | "vtt", ShortResult>;
export type VideoJob = Job<"video" | "transcript" | "srt" | "vtt" | "ass", null>;
export type FfmpegJob = Job<string, null>;

export interface Upload {
  url: string;
  bytes: number;
  content_type: string;
  expires_at: string;
}

export interface Issue {
  path: string;
  message: string;
}

export class ReelSdkError extends Error {
  /** HTTP status; 0 when the request never got a response */
  readonly status: number;
  readonly code: string;
  readonly issues: Issue[];
  /** The failed job, when the error is a job failure */
  readonly job: Job | null;

  constructor(status: number, code: string, message: string, issues: Issue[] = [], job: Job | null = null) {
    super(message);
    this.name = "ReelSdkError";
    this.status = status;
    this.code = code;
    this.issues = issues;
    this.job = job;
  }

  /** Network errors, 429 and 5xx; a failed job on our side is safe to submit again */
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export interface ReelSdkOptions {
  apiKey: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface CreateOptions {
  /** Seconds to hold the request open for the result, 0..300. The API defaults to 60 */
  wait?: number;
  signal?: AbortSignal;
}

export interface WaitOptions {
  /** Default 15 minutes */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Called with every poll, e.g. to show `job.stage` */
  onUpdate?: (job: Job) => void;
}

export interface UploadOptions {
  contentType?: string;
  signal?: AbortSignal;
}

type Answer = { status: number; data: unknown };

export class ReelSdk {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor({ apiKey, baseUrl = DEFAULT_BASE_URL, fetch: fetchImpl = globalThis.fetch }: ReelSdkOptions) {
    if (!apiKey) throw new Error("reelsdk: apiKey is required");

    this.#apiKey = apiKey;
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#fetch = fetchImpl.bind(globalThis);
  }

  /**
   * Creates jobs return the job in whatever state it is in when `wait` runs out.
   * A job that failed inside the wait comes back with status "failed", not as a throw.
   * They are never retried here: a lost response could otherwise create a duplicate job.
   */
  createShort(input: ShortRequest, options?: CreateOptions): Promise<ShortJob> {
    return this.#create("/v1/shorts", input, options);
  }

  slideshow(input: SlideshowRequest, options?: CreateOptions): Promise<VideoJob> {
    return this.#create("/v1/slideshow", input, options);
  }

  captions(input: CaptionsRequest, options?: CreateOptions): Promise<VideoJob> {
    return this.#create("/v1/captions", input, options);
  }

  ffmpeg(input: FfmpegRequest, options?: CreateOptions): Promise<FfmpegJob> {
    return this.#create("/v1/ffmpeg", input, options);
  }

  /** Returns the job in any state; throws only when the request itself fails (404 unknown job, 401, network) */
  async getJob<J extends Job = Job>(id: string, options: { signal?: AbortSignal } = {}): Promise<J> {
    const { data } = await this.#readJob(id, options.signal);
    return data as J;
  }

  /** Polls with backoff until the job succeeds. Throws a ReelSdkError carrying the job when it fails */
  async waitForJob<J extends Job>(jobOrId: J | string, options: WaitOptions = {}): Promise<J> {
    const { timeoutMs = 15 * 60_000, signal, onUpdate } = options;

    if (typeof jobOrId !== "string" && jobOrId.status === "succeeded") return jobOrId;

    const id = typeof jobOrId === "string" ? jobOrId : jobOrId.id;
    const deadline = Date.now() + timeoutMs;
    let delay = 1_000;
    let failures = 0;

    while (true) {
      try {
        const { status, data } = await this.#readJob(id, signal);
        const job = data as J;
        failures = 0;
        onUpdate?.(job);

        if (job.status === "succeeded") return job;
        if (job.status === "failed") {
          throw new ReelSdkError(status, job.error?.code ?? "JOB_FAILED", job.error?.message ?? "Job failed", [], job);
        }
      } catch (error) {
        // A blip while polling shouldn't end a two-minute wait
        const transient = error instanceof ReelSdkError && !error.job && error.retryable;
        if (!transient || ++failures > 5) throw error;
      }

      if (Date.now() + delay > deadline) {
        throw new ReelSdkError(0, "WAIT_TIMEOUT", `Job ${id} did not finish within ${timeoutMs} ms`);
      }

      await sleep(delay, signal);
      delay = Math.min(delay * 1.5, failures ? 15_000 : 5_000);
    }
  }

  /** Stores a local file for 7 days and returns a URL to pass as any input. Max 100 MB */
  async upload(data: Blob | ArrayBuffer | Uint8Array<ArrayBuffer>, filename: string, options: UploadOptions = {}): Promise<Upload> {
    const contentType = options.contentType || (data instanceof Blob && data.type) || "application/octet-stream";
    const query = new URLSearchParams({ filename });

    const { data: upload } = await this.#send(`/v1/uploads?${query}`, {
      method: "POST",
      headers: { "content-type": contentType },
      body: data,
      signal: options.signal,
    });

    return upload as Upload;
  }

  async #create<J extends Job>(path: string, input: object, options: CreateOptions = {}): Promise<J> {
    const query = options.wait === undefined ? "" : `?wait=${options.wait}`;

    const { data } = await this.#send(path + query, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal: options.signal,
    });

    return data as J;
  }

  #readJob(id: string, signal?: AbortSignal): Promise<Answer> {
    return this.#send(`/v1/jobs/${encodeURIComponent(id)}`, { signal });
  }

  // Unwraps `{ job }`; failed jobs arrive as 422/500 with the job attached, which is an answer, not an error
  async #send(path: string, init: RequestInit): Promise<Answer> {
    let response: Response;

    try {
      response = await this.#fetch(this.#baseUrl + path, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${this.#apiKey}` },
      });
    } catch (cause) {
      if (init.signal?.aborted) throw cause;
      throw new ReelSdkError(0, "NETWORK_ERROR", `Could not reach reelsdk: ${describe(cause)}`);
    }

    const text = await response.text();
    const body = parseJson(text);
    const job = isRecord(body) && isRecord(body.job) ? (body.job as unknown as Job) : null;

    if (job) return { status: response.status, data: job };
    if (response.ok) return { status: response.status, data: body };

    const error = isRecord(body) && isRecord(body.error) ? body.error : {};
    throw new ReelSdkError(
      response.status,
      typeof error.code === "string" ? error.code : `HTTP_${response.status}`,
      typeof error.message === "string" ? error.message : text.slice(0, 200) || response.statusText,
      Array.isArray(error.issues) ? (error.issues as Issue[]) : [],
    );
  }
}

/**
 * Checks a webhook's `Reel-Signature: t=<unix>,v1=<hex>` header, an HMAC-SHA256 of `${t}.${rawBody}`.
 * `secret` is your key's `whsec_...` webhook secret, not the API key. Pass the raw body, before JSON.parse.
 */
export async function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const fields = signatureHeader.split(",").map((part) => part.trim().split("="));
  const timestamp = Number(fields.find(([key]) => key === "t")?.[1]);
  const signatures = fields.filter(([key]) => key === "v1").map(([, value]) => value ?? "");

  if (!Number.isInteger(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signed = encoder.encode(`${timestamp}.${rawBody}`);

  for (const signature of signatures) {
    const bytes = hexToBytes(signature);
    if (bytes && (await crypto.subtle.verify("HMAC", key, bytes, signed))) return true;
  }

  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
