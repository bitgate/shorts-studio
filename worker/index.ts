import { ReelApi, ReelApiError, type Job } from "../src/lib/reelapi";
import { parseShortRequest } from "./validate";

interface Env {
  REELAPI_KEY?: string;
  REELAPI_BASE_URL?: string;
  ACCESS_CODE?: string;
}

const JOB_ID = /^job_[a-z0-9]{20}$/;
const MAX_BODY_BYTES = 16_384;

export default {
  async fetch(request, env): Promise<Response> {
    const { pathname } = new URL(request.url);

    const denied = await checkAccessCode(request, env);
    if (denied) return denied;

    if (!env.REELAPI_KEY) {
      return fail(500, "MISSING_API_KEY", "REELAPI_KEY is not set. Put it in .dev.vars locally, or run `wrangler secret put REELAPI_KEY`.");
    }

    const reel = new ReelApi({ apiKey: env.REELAPI_KEY, baseUrl: env.REELAPI_BASE_URL || undefined });

    try {
      if (pathname === "/api/shorts") {
        return request.method === "POST" ? await createShort(request, reel) : fail(405, "METHOD_NOT_ALLOWED", "Use POST");
      }

      const jobId = pathname.match(/^\/api\/jobs\/([^/]+)$/)?.[1];
      if (jobId) {
        return request.method === "GET" ? await getJob(jobId, reel) : fail(405, "METHOD_NOT_ALLOWED", "Use GET");
      }

      return fail(404, "NOT_FOUND", "No such endpoint");
    } catch (error) {
      return upstreamFailure(error, pathname);
    }
  },
} satisfies ExportedHandler<Env>;

async function createShort(request: Request, reel: ReelApi): Promise<Response> {
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) return fail(413, "PAYLOAD_TOO_LARGE", "Request body is too large");

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return fail(400, "INVALID_JSON", "Body must be JSON");
  }

  const parsed = parseShortRequest(raw);
  if (!parsed.ok) {
    const message = parsed.issues.map((issue) => `${issue.path || "body"}: ${issue.message}`).join("; ");
    return json({ error: { code: "INVALID_REQUEST", message, issues: parsed.issues } }, 400);
  }

  // The browser polls /api/jobs/:id, so we only need the job id back
  const job = await reel.createShort(parsed.request, { wait: 0 });

  const { style, aspect, language, duration_s } = parsed.request;
  log("short_created", { job: job.id, mode: parsed.request.script ? "script" : "topic", style, aspect, language, duration_s });

  return json({ job }, 202);
}

async function getJob(id: string, reel: ReelApi): Promise<Response> {
  if (!JOB_ID.test(id)) return fail(404, "NOT_FOUND", "unknown job");

  const job = await reel.getJob(id);
  const running = job.status === "queued" || job.status === "running";

  if (!running) {
    log("short_finished", { job: job.id, status: job.status, error: job.error?.code, seconds: elapsedSeconds(job) });
  }

  return json({ job }, running ? 202 : 200);
}

async function checkAccessCode(request: Request, env: Env): Promise<Response | null> {
  if (!env.ACCESS_CODE) return null;

  const given = request.headers.get("x-access-code");
  if (!given) return fail(401, "ACCESS_CODE_REQUIRED", "Enter the access code to generate.");
  if (!(await sameText(given, env.ACCESS_CODE))) return fail(401, "ACCESS_CODE_INVALID", "That access code didn't work.");

  return null;
}

// Hashing first gives equal-length buffers, so the comparison leaks nothing
async function sameText(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);

  return crypto.subtle.timingSafeEqual(left, right);
}

function upstreamFailure(error: unknown, route: string): Response {
  if (!(error instanceof ReelApiError)) {
    console.error(JSON.stringify({ event: "worker_error", route, error: String(error) }));
    return fail(500, "INTERNAL", "Something went wrong on this server");
  }

  console.error(JSON.stringify({ event: "reelapi_error", route, status: error.status, code: error.code, message: error.message }));

  if (error.status === 401) return fail(500, "INVALID_API_KEY", "reelapi rejected REELAPI_KEY. Check the secret.");
  if (error.status === 0) return fail(502, "UPSTREAM_UNREACHABLE", "Couldn't reach reelapi. Try again in a moment.");

  const issues = error.issues.length > 0 ? { issues: error.issues } : {};
  return json({ error: { code: error.code, message: error.message, ...issues } }, error.status);
}

function elapsedSeconds(job: Job): number | null {
  if (!job.finished_at) return null;
  return Math.round((Date.parse(job.finished_at) - Date.parse(job.created_at)) / 1000);
}

function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...fields }));
}

function fail(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, status);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}
