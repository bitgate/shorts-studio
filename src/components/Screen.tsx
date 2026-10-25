import type { ReactNode } from "react";
import type { Aspect, CaptionPreset } from "../lib/reelapi";
import { cn } from "./ui";

const RATIO: Record<Aspect, number> = { "9:16": 9 / 16, "1:1": 1, "16:9": 16 / 9 };
const MAX_WIDTH: Record<Aspect, number> = { "9:16": 340, "1:1": 420, "16:9": 640 };

/** A phone for 9:16, a plain screen otherwise. `reserve` is the vertical room kept free for content below it */
export function Screen({ aspect, reserve, children }: { aspect: Aspect; reserve: number; children: ReactNode }) {
  const phone = aspect === "9:16";
  const width = `min(100%, ${MAX_WIDTH[aspect]}px, max(220px, calc((100dvh - ${reserve}px) * ${RATIO[aspect]})))`;

  return (
    <div className="mx-auto" style={{ width }}>
      <div
        className={cn(
          "bg-[#0a0a09] shadow-[0_32px_64px_-32px_rgb(0_0_0/0.55)] ring-1 ring-black/40 dark:ring-white/10",
          phone ? "rounded-[2.6rem] p-[9px]" : "rounded-[1.4rem] p-[7px]",
        )}
      >
        <div
          className={cn("relative isolate overflow-hidden bg-black [container-type:size]", phone ? "rounded-[2.05rem]" : "rounded-2xl")}
          style={{ aspectRatio: aspect.replace(":", " / ") }}
        >
          {children}
          {phone && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-[2.4%] left-1/2 z-10 h-[3.2%] w-[28%] -translate-x-1/2 rounded-full bg-black"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function Backdrop({ src, mode = "clear" }: { src: string; mode?: "clear" | "blur" | "dim" }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className={cn(
        "absolute inset-0 size-full object-cover",
        mode === "blur" && "scale-110 blur-2xl brightness-[0.5] saturate-150",
        mode === "dim" && "blur-sm brightness-[0.3] grayscale-[0.5]",
      )}
    />
  );
}

/** Approximates how each reelapi caption preset lands on the video */
export function CaptionSample({ preset }: { preset: CaptionPreset }) {
  if (preset === "bold") {
    return (
      <p className="absolute inset-x-[6%] top-1/2 -translate-y-1/2 text-center font-display text-[10cqmin] leading-[1.05] font-[850] text-white uppercase [paint-order:stroke_fill] [-webkit-text-stroke:1.6cqmin_#000]">
        The keeper <span className="text-[#ffe14d]">climbed</span>
      </p>
    );
  }

  if (preset === "karaoke") {
    return (
      <p className="absolute inset-x-[6%] bottom-[15%] text-center text-[7cqmin] leading-[1.2] font-bold text-white [paint-order:stroke_fill] [-webkit-text-stroke:1.1cqmin_#000]">
        <span className="text-[#3ddcff]">Every night he</span> climbed alone
      </p>
    );
  }

  return (
    <p className="absolute inset-x-[8%] bottom-[13%] text-center text-[5.4cqmin] leading-[1.75] font-medium text-white">
      <span className="box-decoration-clone rounded-[1cqmin] bg-black/70 px-[2cqmin] py-[0.5cqmin]">
        Every night, the keeper climbed the stairs
      </span>
    </p>
  );
}
