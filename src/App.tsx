import { useCallback, useEffect, useState } from "react";
import type { ShortRequest } from "./lib/reelsdk";
import { createShort, getJob, isAccessError, setAccessCode, toApiError } from "./app/api";
import { DEFAULT_SETTINGS, fromRequest, sanitizeSettings, toRequest, type Settings } from "./app/settings";
import { useStoredState } from "./app/storage";
import { isExpired, summarize, useRecents, type Recent } from "./app/recents";
import { isRunning, issuesToFields, validate, type FieldErrors, type Session } from "./app/session";
import { STYLES } from "./app/options";
import { Header } from "./components/Header";
import { Composer } from "./components/Composer";
import { Monitor, previewDetails } from "./components/Monitor";
import { Recents } from "./components/Recents";
import { AccessDialog } from "./components/AccessDialog";
import { cn } from "./components/ui";

const POLL_MS = 3000;
const MAX_POLL_FAILURES = 6;

interface AccessPrompt {
  invalid: boolean;
  retry: () => void;
}

export default function App() {
  const [settings, setSettings] = useStoredState("shorts-studio:settings", DEFAULT_SETTINGS, sanitizeSettings);
  const [session, setSession] = useState<Session | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [access, setAccess] = useState<AccessPrompt | null>(null);
  const [pollNonce, setPollNonce] = useState(0);
  const recents = useRecents();
  const { add: addRecent, update: updateRecent } = recents;

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((current) => ({ ...current, ...patch }));
      setErrors({});
    },
    [setSettings],
  );

  const patchTracked = useCallback((id: string, patch: Partial<Extract<Session, { phase: "tracking" }>>) => {
    setSession((current) => (current?.phase === "tracking" && current.id === id ? { ...current, ...patch } : current));
  }, []);

  const submit = useCallback(
    async (request: ShortRequest) => {
      setErrors({});
      setSession({ phase: "creating", request, startedAt: Date.now() });
      window.scrollTo({ top: 0 });

      try {
        const job = await createShort(request);
        const createdAt = Date.now();

        addRecent({ id: job.id, createdAt, request, ...summarize(job) });
        setSession({ phase: "tracking", request, id: job.id, createdAt, job, expired: false, stalled: false, pollError: null });
      } catch (error) {
        const apiError = toApiError(error);

        if (isAccessError(apiError)) {
          setSession(null);
          setAccess({ invalid: apiError.code === "ACCESS_CODE_INVALID", retry: () => void submit(request) });
          return;
        }

        // Validation problems belong next to the fields, so we go back to the form
        if (apiError.status === 400 && apiError.issues.length > 0) {
          setSession(null);
          setErrors(issuesToFields(apiError.issues));
          return;
        }

        setSession({ phase: "create-failed", request, error: apiError });
      }
    },
    [addRecent],
  );

  const generate = () => {
    const problems = validate(settings);
    if (problems) {
      setErrors(problems);
      return;
    }
    void submit(toRequest(settings));
  };

  const trackingId =
    session?.phase === "tracking" && !session.expired && !session.stalled && (!session.job || isRunning(session.job)) ? session.id : null;

  // Poll the open job until it finishes; transient failures back off before we give up
  useEffect(() => {
    if (!trackingId) return;

    let cancelled = false;
    let timer = 0;
    let failures = 0;

    const poll = async () => {
      try {
        const job = await getJob(trackingId);
        if (cancelled) return;

        failures = 0;
        updateRecent(job.id, summarize(job));
        patchTracked(job.id, { job, pollError: null });
        if (isRunning(job)) timer = window.setTimeout(poll, POLL_MS);
      } catch (error) {
        if (cancelled) return;
        const apiError = toApiError(error);

        if (apiError.status === 404) {
          updateRecent(trackingId, { status: "expired" });
          patchTracked(trackingId, { expired: true });
          return;
        }

        if (isAccessError(apiError)) {
          setAccess({ invalid: apiError.code === "ACCESS_CODE_INVALID", retry: () => setPollNonce((nonce) => nonce + 1) });
          return;
        }

        failures += 1;
        const stalled = failures >= MAX_POLL_FAILURES;
        console.warn(`Polling ${trackingId} failed (${failures}/${MAX_POLL_FAILURES})`, apiError);
        patchTracked(trackingId, { pollError: apiError, stalled });
        if (!stalled) timer = window.setTimeout(poll, Math.min(POLL_MS * 2 ** failures, 20_000));
      }
    };

    void poll();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trackingId, pollNonce, updateRecent, patchTracked]);

  // Jobs that were still rendering when the page closed get one status refresh
  useEffect(() => {
    const unfinished = recents.items.filter((item) => item.status === "queued" || item.status === "running").slice(0, 5);

    for (const item of unfinished) {
      getJob(item.id)
        .then((job) => updateRecent(job.id, summarize(job)))
        .catch((error) => {
          if (toApiError(error).status === 404) updateRecent(item.id, { status: "expired" });
        });
    }
  }, []);

  const openRecent = (item: Recent) => {
    const expired = isExpired(item);
    if (expired && item.status !== "expired") updateRecent(item.id, { status: "expired" });

    setErrors({});
    setSession({ phase: "tracking", request: item.request, id: item.id, createdAt: item.createdAt, job: null, expired, stalled: false, pollError: null });
    window.scrollTo({ top: 0 });
  };

  const closeSession = () => {
    setSession(null);
    window.scrollTo({ top: 0 });
  };

  const editSession = () => {
    if (session) setSettings((current) => fromRequest(session.request, current));
    closeSession();
  };

  const retrySession = () => {
    if (session) void submit(session.request);
  };

  const reconnect = () => {
    if (session?.phase === "tracking") patchTracked(session.id, { stalled: false, pollError: null });
  };

  // A video that won't load is either expired (404) or a network blip, so we check before saying so
  const checkVideo = async (url: string) => {
    if (session?.phase !== "tracking") return;
    const { id } = session;

    const response = await fetch(url, { method: "HEAD" }).catch(() => null);
    if (response?.status === 404) {
      updateRecent(id, { status: "expired" });
      patchTracked(id, { expired: true });
    }
  };

  const unlock = (code: string) => {
    setAccessCode(code);
    const retry = access?.retry;
    setAccess(null);
    retry?.();
  };

  const style = STYLES[settings.style];
  const preview = {
    style: settings.style,
    aspect: settings.aspect,
    captions: settings.captions === "off" ? null : settings.captions === "auto" ? style.captions : settings.captions,
    details: previewDetails(
      settings.aspect,
      settings.mode === "topic" ? settings.duration : null,
      settings.language === "en" ? settings.enVoice : settings.language === "es" ? settings.esVoice : null,
    ),
  };

  return (
    <div className="min-h-dvh">
      <Header />

      <main className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 pt-2 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 xl:grid-cols-[minmax(0,1fr)_440px] xl:gap-20">
        <div className={cn("min-w-0", session && "max-lg:hidden")}>
          <Composer settings={settings} errors={errors} busy={session?.phase === "creating"} onChange={updateSettings} onGenerate={generate} />
          <Recents
            items={recents.items}
            activeId={session?.phase === "tracking" ? session.id : null}
            onOpen={openRecent}
            onRemove={recents.remove}
            onClear={recents.clear}
          />
        </div>

        <div className={cn("min-w-0 lg:sticky lg:top-6", !session && "max-lg:hidden")}>
          <Monitor
            session={session}
            preview={preview}
            onBack={closeSession}
            onRetry={retrySession}
            onEdit={editSession}
            onReconnect={reconnect}
            onVideoError={checkVideo}
          />
        </div>
      </main>

      <AccessDialog
        open={access !== null}
        invalid={access?.invalid ?? false}
        onSubmit={unlock}
        onCancel={() => setAccess(null)}
      />
    </div>
  );
}
