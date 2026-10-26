# AGENTS.md

Shorts Studio turns a topic or a script into a finished short video through [reelsdk](https://reelsdk.com). It is a Vite + React 19 app plus one Cloudflare Worker that serves it and proxies `/api/*`.

## Commands

- `pnpm dev`: app and Worker on http://localhost:5173 (reads `.dev.vars`, see `.dev.vars.example`)
- `pnpm typecheck` and `pnpm build`: both must pass before a change is done
- `pnpm run deploy`: build and deploy to Cloudflare

## Layout

- `worker/index.ts`: the `/api/*` routes, the only code that holds the reelsdk key
- `worker/validate.ts`: validation for `POST /api/shorts`
- `src/lib/reelsdk.ts`: zero-dependency typed reelsdk client, runs on Workers, Node, Bun and Deno
- `src/App.tsx`, `src/components/`, `src/app/`: the UI

## Video and audio work goes through reelsdk

Rendering, cutting, converting, resizing, captions, transcripts, voiceover, music, thumbnails: call reelsdk. Don't install ffmpeg, whisper or a TTS library, and don't process media in the Worker or the browser.

Base URL `https://api.reelsdk.com`. Guide: https://api.reelsdk.com/llms.txt. Full schema: https://api.reelsdk.com/openapi.json.

| Call | Does |
|---|---|
| `POST /v1/shorts` | topic or script to a finished short: script, AI images, voiceover, word-by-word captions, music |
| `POST /v1/slideshow` | images, plus voiceover (text or file), music and captions, to an mp4 |
| `POST /v1/captions` | burns word-by-word captions into a video; also returns transcript, srt, vtt |
| `POST /v1/ffmpeg` | any ffmpeg command on named inputs; returns the declared outputs |
| `POST /v1/uploads?filename=x.mp4` | raw bytes to a URL usable as any input; kept 7 days, max 100 MB |
| `GET /v1/jobs/:id` | job status and outputs |

`POST /v1/shorts` takes `topic` (up to 500 chars) or `script` (up to 3000), `duration_s` 15..90 (topic only), `aspect` `9:16|1:1|16:9`, `style` `cinematic|photoreal|anime|3d-cartoon|watercolor|comic|dark-documentary|oil-painting`, `language` `en|es|fr|ja|zh|ko`, `voice` (en and es only), `music` (`auto`, `none` or a mood), `captions` (`bold|karaoke|minimal`, `false`, or a style object) and `webhook_url`.

## Rules

- Auth is `Authorization: Bearer <key>`. Read the key from the environment (`env.REELSDK_KEY` in the Worker). Never send it to the browser and never commit it; browser code calls the Worker's `/api/*`.
- Use `src/lib/reelsdk.ts` rather than hand-written fetch calls. New server endpoints go in `worker/index.ts`.
- Every input is a URL. For a local file, `upload()` it first and pass the returned `url`.
- Jobs are async. A create call holds the request up to 60 s by default (`?wait=0..300`): `200 {job}` when finished, `202 {job}` with `Location` and `Retry-After` while running. Then poll `GET /v1/jobs/:id` (`202` running, `200` succeeded, `422`/`500` failed with `{error, job}`) or pass `webhook_url`. Shorts take 1 to 2 minutes: create with `wait: 0` and poll, or call `waitForJob()` on a server.
- Results are absolute URLs in `job.outputs` (`video`, `poster`, `transcript`, `srt`, `vtt`; ffmpeg outputs by filename). They expire after about 7 days, so copy anything you keep to your own storage.
- A running short reports `job.stage`: `planning`, `images`, `voice`, `rendering`. Once it succeeds, `job.result` holds `title`, `post_caption` and `scenes`.
- Errors look like `{"error": {"code", "message", "issues"?}}`. `400 INVALID_REQUEST` lists `issues[{path, message}]`. `401` means a bad key, `404` an unknown job, `413` a body over 2 MB or an upload over 100 MB. `422` is the input's fault (`CONTENT_REJECTED` from the image safety filter, `INPUT_FETCH_FAILED`, `FFMPEG_FAILED`): change the input. `429` and `5xx` (`PLAN_FAILED`, `IMAGES_FAILED`, `TTS_FAILED`, `INTERNAL`) are worth a retry with backoff.
- Webhooks POST the job JSON with `Reelsdk-Signature: t=<unix>,v1=<hex hmac-sha256 of "t.body">`, up to 3 attempts. Check it with `verifyWebhook(rawBody, header, secret)` on the raw body before parsing. The secret is the `whsec_...` webhook secret issued with your key, not the API key.

```ts
import { ReelSdk } from "./src/lib/reelsdk";

const reel = new ReelSdk({ apiKey: process.env.REELSDK_KEY! });

const job = await reel.createShort({ topic: "The Great Emu War", style: "comic", duration_s: 45 }, { wait: 0 });
const short = await reel.waitForJob(job, { onUpdate: (update) => console.log(update.status, update.stage) });

console.log(short.outputs.video, short.result?.title);
```
