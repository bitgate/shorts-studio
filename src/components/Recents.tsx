import { useState } from "react";
import { STAGES, STYLES } from "../app/options";
import { isExpired, type Recent } from "../app/recents";
import { timeAgo } from "../app/format";
import { useNow } from "../app/useNow";
import { Icon, cn } from "./ui";

const COLLAPSED = 5;

interface RecentsProps {
  items: Recent[];
  activeId: string | null;
  onOpen: (item: Recent) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function Recents({ items, activeId, onOpen, onRemove, onClear }: RecentsProps) {
  const [showAll, setShowAll] = useState(false);
  const now = useNow(60_000);

  if (items.length === 0) return null;
  const visible = showAll ? items : items.slice(0, COLLAPSED);

  return (
    <section aria-labelledby="recent-heading" className="mt-14 border-t border-edge pt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="recent-heading" className="display text-[19px]">
          Recent
        </h2>
        <button
          type="button"
          onClick={() => window.confirm("Clear your recent shorts? The videos stay online until they expire.") && onClear()}
          className="rounded-lg px-2 py-1.5 text-[13px] text-dim transition-colors hover:text-ink"
        >
          Clear
        </button>
      </div>

      <ul className="-mx-2">
        {visible.map((item) => (
          <RecentRow key={item.id} item={item} now={now} active={item.id === activeId} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </ul>

      {items.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-2 rounded-lg px-2 py-1.5 text-[13px] font-medium text-dim transition-colors hover:text-ink"
        >
          {showAll ? "Show less" : `Show all ${items.length}`}
        </button>
      )}
    </section>
  );
}

function RecentRow({ item, now, active, onOpen, onRemove }: { item: Recent; now: number; active: boolean } & Pick<RecentsProps, "onOpen" | "onRemove">) {
  const style = STYLES[item.request.style ?? "cinematic"];
  const expired = isExpired(item);
  const [thumb, setThumb] = useState(!expired && item.poster ? item.poster : style.image);
  const title = item.title || item.request.topic || item.request.script?.slice(0, 80) || "Untitled";

  return (
    <li className={cn("group relative flex items-center gap-1 rounded-xl transition-colors hover:bg-field", active && "bg-field")}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-current={active || undefined}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left"
      >
        <img
          src={thumb}
          alt=""
          loading="lazy"
          onError={() => setThumb(style.image)}
          className={cn("h-12 w-9 shrink-0 rounded-md bg-field object-cover", expired && "opacity-50 grayscale")}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[13px] text-dim">
            <span className="truncate">{style.label}</span>
            <Status item={item} expired={expired} now={now} />
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${title}`}
        className="mr-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-raised hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Icon name="x" />
      </button>
    </li>
  );
}

function Status({ item, expired, now }: { item: Recent; expired: boolean; now: number }) {
  const dot = <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-current opacity-60" />;

  if (expired) return <>{dot}<span>Expired</span></>;
  if (item.status === "failed") return <>{dot}<span className="font-medium text-danger">Failed</span></>;

  if (item.status === "queued" || item.status === "running") {
    const stage = STAGES.find((entry) => entry.id === item.stage)?.label ?? "Rendering";
    return (
      <>
        {dot}
        <span className="flex min-w-0 items-center gap-1.5 text-ink">
          <Icon name="spinner" className="size-3" />
          <span className="truncate">{stage}</span>
        </span>
      </>
    );
  }

  return <>{dot}<span className="shrink-0">{timeAgo(item.createdAt, now)}</span></>;
}
