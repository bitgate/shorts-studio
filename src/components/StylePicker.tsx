import { useId } from "react";
import { SHORT_STYLES, type ShortStyle } from "../lib/reelapi";
import { STYLES } from "../app/options";
import { Icon, cn } from "./ui";

export function StylePicker({ value, onChange }: { value: ShortStyle; onChange: (style: ShortStyle) => void }) {
  const name = useId();

  return (
    <div role="radiogroup" aria-label="Style" className="grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3">
      {SHORT_STYLES.map((style) => {
        const info = STYLES[style];
        const selected = style === value;

        return (
          <label key={style} className="group min-w-0" title={info.label}>
            <input type="radio" name={name} className="peer sr-only" checked={selected} onChange={() => onChange(style)} />
            <span
              className={cn(
                "relative block aspect-[3/4] overflow-hidden rounded-xl bg-field transition",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-glow",
                selected ? "ring-[2.5px] ring-glow" : "ring-1 ring-edge group-hover:ring-dim",
              )}
            >
              <img
                src={info.image}
                alt=""
                width={300}
                height={400}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition duration-300 motion-safe:group-hover:scale-[1.04]"
              />
              {selected && (
                <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-on-accent shadow">
                  <Icon name="check" className="size-3" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cn("mt-1.5 block truncate text-[12px] sm:text-[13px]", selected ? "font-semibold text-ink" : "text-dim")}>
              <span className="sm:hidden">{info.short}</span>
              <span className="max-sm:hidden">{info.label}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
