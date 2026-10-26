import { useState, type ReactNode } from "react";
import type { Aspect, CaptionPreset, ShortJob, ShortRequest, ShortStyle } from "../lib/reelsdk";
import { OUTPUT_SIZES, STAGES, STYLES } from "../app/options";
import { describeFailure } from "../app/errors";
import { formatClock, videoFileName } from "../app/format";
import { isRunning, type Session } from "../app/session";
import { useNow } from "../app/useNow";
import { Backdrop, CaptionSample, Screen } from "./Screen";
import { Icon, buttonClass, cn, type IconName } from "./ui";

export interface Preview {
  style: ShortStyle;
  aspect: Aspect;
  captions: CaptionPreset | null;
  details: string[];
}

interface Actions {
  onBack: () => void;
  onRetry: () => void;
  onEdit: () => void;
  onReconnect: () => void;
  onVideoError: (url: string) => void;
}

export function Monitor({ session, preview, ...actions }: { session: Session | null; preview: Preview } & Actions) {
  if (!session) {
    return (
      <div>
        <Screen aspect={preview.aspect} reserve={150}>
          <Backdrop src={STYLES[preview.style].image} />
          {preview.captions && <CaptionSample preset={preview.captions} />}
        </Screen>
        <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-[12px] text-dim">
          {preview.details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={actions.onBack} className={buttonClass("ghost", "-ml-2.5 mb-3 h-10 px-2.5 text-[14px] lg:hidden")}>
        <Icon name="arrowLeft" />
        New short
      </button>
      <SessionView session={session} {...actions} />
    </div>
  );
}

function SessionView({ session, ...actions }: { session: Session } & Actions) {
  const { request } = session;
  const aspect = request.aspect ?? "9:16";
  const image = STYLES[request.style ?? "cinematic"].image;

  if (session.phase === "creating") return <Progress aspect={aspect} image={image} job={null} startedAt={session.startedAt} />;

  if (session.phase === "create-failed") {
    const { code, status, message } = session.error;
    return <Failure aspect={aspect} image={image} failure={describeFailure(code, status, message)} code={code} {...actions} />;
  }

  if (session.expired) {
    return (
      <Notice aspect={aspect} image={image} icon="clock" title="This short expired" hint="Videos are kept for 7 days.">
        <button type="button" onClick={actions.onRetry} className={buttonClass("primary", "h-12 text-[15px]")}>
          <Icon name="retry" />
          Make it again
        </button>
        <button type="button" onClick={actions.onEdit} className={buttonClass("secondary", "h-12 text-[15px]")}>
          <Icon name="pencil" />
          Edit
        </button>
      </Notice>
    );
  }

  if (session.stalled) {
    return (
      <Notice aspect={aspect} image={image} icon="alert" {...describeFailure("CONNECTION_LOST", 0, "")}>
        <button type="button" onClick={actions.onReconnect} className={buttonClass("primary", "col-span-2 h-12 text-[15px]")}>
          <Icon name="retry" />
          Reconnect
        </button>
      </Notice>
    );
  }

  const { job } = session;
  if (!job) return <Loading aspect={aspect} image={image} />;
  if (isRunning(job)) {
    return <Progress aspect={aspect} image={image} job={job} startedAt={session.createdAt} reconnecting={session.pollError !== null} />;
  }

  if (job.status === "failed") {
    const code = job.error?.code ?? "FAILED";
    return <Failure aspect={aspect} image={image} failure={describeFailure(code, 500, job.error?.message ?? "")} code={code} {...actions} />;
  }

  return <Result job={job} request={request} aspect={aspect} onBack={actions.onBack} onVideoError={actions.onVideoError} />;
}

interface FrameProps {
  aspect: Aspect;
  image: string;
}

function Progress({ aspect, image, job, startedAt, reconnecting = false }: FrameProps & { job: ShortJob | null; startedAt: number; reconnecting?: boolean }) {
  const now = useNow(1000);
  const elapsed = (now - startedAt) / 1000;
  const index = job?.status === "running" ? Math.max(0, STAGES.findIndex((stage) => stage.id === job.stage)) : -1;
  const label = index >= 0 ? STAGES[index]!.label : job?.status === "queued" ? "Waiting in line" : "Starting";

  return (
    <div>
      <Screen aspect={aspect} reserve={240}>
        <Backdrop src={image} mode="blur" />
        <span className="absolute inset-x-0 top-0 h-[30%] animate-scan bg-gradient-to-b from-transparent via-white/12 to-transparent" />
        <Viewfinder />
        <span className="absolute top-[calc(5%+3cqmin)] left-[calc(5%+3cqmin)] flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[12px] text-white tabular-nums backdrop-blur-md">
          <span className="size-2 animate-blink rounded-full bg-rec" />
          {formatClock(elapsed)}
        </span>
        <div className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 text-center text-white">
          <p className="font-mono text-[max(11px,3.6cqmin)] text-white/75">{index >= 0 ? `${index + 1}/${STAGES.length}` : "0/4"}</p>
          <p className="display mt-1.5 text-[max(17px,7cqmin)] leading-[1.1]" aria-live="polite">
            {label}
          </p>
        </div>
      </Screen>

      <div className="mx-auto mt-6 max-w-[340px]">
        <div className="flex gap-1.5" aria-hidden="true">
          {STAGES.map((stage, position) => (
            <span key={stage.id} className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-edge">
              {position < index && <span className="absolute inset-0 bg-accent" />}
              {position === index && (
                <span className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-accent to-transparent" />
              )}
            </span>
          ))}
        </div>
        <p className={cn("mt-3 text-center text-[13px]", reconnecting ? "text-danger" : "text-dim")}>
          {reconnecting ? "Connection lost, retrying" : "Usually 1 to 2 minutes. Safe to leave; it'll be in Recent."}
        </p>
      </div>
    </div>
  );
}

function Viewfinder() {
  const corner = "absolute size-[9cqmin] border-white/60";

  return (
    <span aria-hidden="true" className="absolute inset-[5%]">
      <span className={cn(corner, "top-0 left-0 rounded-tl-[2cqmin] border-t-2 border-l-2")} />
      <span className={cn(corner, "top-0 right-0 rounded-tr-[2cqmin] border-t-2 border-r-2")} />
      <span className={cn(corner, "bottom-0 left-0 rounded-bl-[2cqmin] border-b-2 border-l-2")} />
      <span className={cn(corner, "right-0 bottom-0 rounded-br-[2cqmin] border-r-2 border-b-2")} />
    </span>
  );
}

function Loading({ aspect, image }: FrameProps) {
  return (
    <Screen aspect={aspect} reserve={240}>
      <Backdrop src={image} mode="blur" />
      <span className="absolute inset-0 grid place-items-center text-white">
        <Icon name="spinner" className="size-8" />
      </span>
    </Screen>
  );
}

function Failure({ aspect, image, failure, code, onRetry, onEdit }: FrameProps & Actions & { failure: ReturnType<typeof describeFailure>; code: string }) {
  const retry = (
    <button key="retry" type="button" onClick={onRetry} className={buttonClass(failure.fixInput ? "secondary" : "primary", "h-12 text-[15px]")}>
      <Icon name="retry" />
      Try again
    </button>
  );
  const edit = (
    <button key="edit" type="button" onClick={onEdit} className={buttonClass(failure.fixInput ? "primary" : "secondary", "h-12 text-[15px]")}>
      <Icon name="pencil" />
      Edit
    </button>
  );

  return (
    <Notice aspect={aspect} image={image} icon="alert" title={failure.title} hint={failure.hint} code={code}>
      {failure.fixInput ? [edit, retry] : [retry, edit]}
    </Notice>
  );
}

function Notice({ aspect, image, icon, title, hint, code, children }: FrameProps & { icon: IconName; title: string; hint: string; code?: string; children: ReactNode }) {
  return (
    <div>
      <Screen aspect={aspect} reserve={330} reserveLg={350}>
        <Backdrop src={image} mode="dim" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md">
            <Icon name={icon} className="size-7" />
          </span>
        </span>
      </Screen>

      <div className="mx-auto mt-6 max-w-[420px]" role="alert">
        <h2 className="display text-[21px] leading-tight">{title}</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-dim">{hint}</p>
        {code && <p className="mt-2 font-mono text-[12px] text-dim">{code}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">{children}</div>
      </div>
    </div>
  );
}

function Result({ job, request, aspect, onBack, onVideoError }: { job: ShortJob; request: ShortRequest; aspect: Aspect } & Pick<Actions, "onBack" | "onVideoError">) {
  const video = job.outputs.video;
  const title = job.result?.title || request.topic || "Your short";
  const caption = job.result?.post_caption;

  return (
    <div>
      <Screen aspect={aspect} reserve={340} reserveLg={440}>
        {video ? (
          <video
            key={job.id}
            src={video}
            poster={job.outputs.poster}
            controls
            playsInline
            preload="metadata"
            onError={() => onVideoError(video)}
            className="size-full bg-black object-contain"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-[14px] text-white/70">No video in this job</span>
        )}
      </Screen>

      <div className="mx-auto mt-5 max-w-[420px]">
        <div className="divide-y divide-edge rounded-2xl border border-edge bg-panel">
          <CopyField label="Title" text={title}>
            <p className="display text-[18px] leading-snug">{title}</p>
          </CopyField>
          {caption && (
            <CopyField label="Post caption" text={caption}>
              <ExpandableText text={caption} />
            </CopyField>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {video && <DownloadButton url={video} filename={videoFileName(title)} />}
          <button type="button" onClick={onBack} className={buttonClass("secondary", cn("h-12 text-[15px]", !video && "col-span-2"))}>
            <Icon name="plus" />
            Make another
          </button>
        </div>
      </div>
    </div>
  );
}

function CopyField({ label, text, children }: { label: string; text: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.warn("Clipboard is blocked", error);
    }
  };

  return (
    <div className="px-4 pt-2.5 pb-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-semibold tracking-wide text-dim uppercase">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="-mr-2 flex h-8 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-dim transition-colors hover:bg-field hover:text-ink"
        >
          <Icon name={copied ? "check" : "copy"} className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function ExpandableText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-expanded={open}
      className={cn("block w-full text-left text-[14px] leading-relaxed whitespace-pre-line text-ink/85", !open && "line-clamp-3")}
    >
      {text}
    </button>
  );
}

// Cross-origin files ignore <a download>, so we fetch the bytes first
function DownloadButton({ url, filename }: { url: string; filename: string }) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const href = URL.createObjectURL(await response.blob());
      Object.assign(document.createElement("a"), { href, download: filename }).click();
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (error) {
      console.warn("Download failed, opening the file instead", error);
      window.open(url, "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={download} disabled={busy} className={buttonClass("primary", "h-12 text-[15px]")}>
      <Icon name={busy ? "spinner" : "download"} />
      Download
    </button>
  );
}

export function previewDetails(aspect: Aspect, seconds: number | null, voice: string | null): string[] {
  const voiceName = voice ? voice.charAt(0).toUpperCase() + voice.slice(1) : "Default";
  return [OUTPUT_SIZES[aspect], seconds ? `${seconds}s` : "Script length", `${voiceName} voice`];
}
