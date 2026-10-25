import type { ReactNode } from "react";
import { ASPECTS, EN_VOICES, ES_VOICES, MUSIC_MOODS, SHORT_LANGUAGES, type Aspect, type EnVoice, type EsVoice } from "../lib/reelapi";
import { CAPTIONS, DURATIONS, EXAMPLE_TOPICS, LANGUAGES, MUSIC, SCRIPT_MAX, STYLES, TOPIC_MAX } from "../app/options";
import type { CaptionChoice, Settings } from "../app/settings";
import type { FieldErrors } from "../app/session";
import { estimateSeconds, formatClock } from "../app/format";
import { StylePicker } from "./StylePicker";
import { FieldError, Icon, Label, Segmented, Select, buttonClass, cn } from "./ui";

interface ComposerProps {
  settings: Settings;
  errors: FieldErrors;
  busy: boolean;
  onChange: (patch: Partial<Settings>) => void;
  onGenerate: () => void;
}

const MODE_OPTIONS = [
  { value: "topic", label: "Topic" },
  { value: "script", label: "Script" },
] as const;

const DURATION_OPTIONS = DURATIONS.map((seconds) => ({ value: seconds as number, label: `${seconds}s` }));

const ASPECT_OPTIONS: Array<{ value: Aspect; label: ReactNode }> = ASPECTS.map((aspect) => ({
  value: aspect,
  label: (
    <>
      <AspectGlyph aspect={aspect} />
      {aspect}
    </>
  ),
}));

const LANGUAGE_OPTIONS = SHORT_LANGUAGES.map((language) => ({ value: language, label: LANGUAGES[language] }));
const MUSIC_OPTIONS = MUSIC_MOODS.map((mood) => ({ value: mood, label: MUSIC[mood] }));
const CAPTION_OPTIONS: Array<{ value: CaptionChoice; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "bold", label: CAPTIONS.bold },
  { value: "karaoke", label: CAPTIONS.karaoke },
  { value: "minimal", label: CAPTIONS.minimal },
  { value: "off", label: "Off" },
];

const voiceOptions = (voices: readonly string[]) =>
  voices.map((voice) => ({ value: voice, label: voice.charAt(0).toUpperCase() + voice.slice(1) }));

export function Composer({ settings, errors, busy, onChange, onGenerate }: ComposerProps) {
  const isScript = settings.mode === "script";
  const text = isScript ? settings.script : settings.topic;
  const limit = isScript ? SCRIPT_MAX : TOPIC_MAX;
  const textError = isScript ? errors.script : errors.topic;
  const style = STYLES[settings.style];
  const estimate = isScript ? estimateSeconds(settings.script, settings.language) : null;

  const setText = (value: string) => onChange(isScript ? { script: value } : { topic: value });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onGenerate();
      }}
      className="space-y-9"
    >
      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h1 className="display text-[27px] leading-none sm:text-[34px]">
            <label htmlFor="prompt">{isScript ? "Your script" : "What's it about?"}</label>
          </h1>
          <div className="shrink-0">
            <Segmented label="Input" value={settings.mode} options={MODE_OPTIONS} onChange={(mode) => onChange({ mode })} />
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl border bg-panel transition-colors focus-within:border-ink",
            textError ? "border-danger" : "border-edge",
          )}
        >
          <textarea
            id="prompt"
            value={text}
            rows={isScript ? 9 : 3}
            placeholder={isScript ? "Paste the narration, word for word" : "Why the Romans built such straight roads"}
            aria-invalid={textError ? true : undefined}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onGenerate();
              }
            }}
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[16px] leading-relaxed outline-none placeholder:text-dim"
          />
          <div className="flex items-center justify-between gap-3 px-4 pb-3 text-[13px] text-dim">
            <span>{estimate ? `About ${formatClock(estimate)} of narration` : null}</span>
            <span className={cn("font-mono tabular-nums", text.length > limit && "font-semibold text-danger")}>
              {text.length}/{limit}
            </span>
          </div>
        </div>
        <FieldError message={textError} />

        {!isScript && !settings.topic.trim() && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {EXAMPLE_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => onChange({ topic })}
                className="h-8 shrink-0 rounded-full border border-edge px-3 text-[13px] whitespace-nowrap text-dim transition-colors hover:border-dim hover:text-ink"
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <Label>Style</Label>
        <StylePicker value={settings.style} onChange={(value) => onChange({ style: value })} />
        <FieldError message={errors.style} />
      </section>

      <section className="grid gap-6 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <Label>Length</Label>
          {isScript ? (
            <div className="flex h-12 items-center rounded-xl bg-field px-4 text-[14px] text-dim">Follows your script</div>
          ) : (
            <Segmented label="Length" value={settings.duration} options={DURATION_OPTIONS} onChange={(duration) => onChange({ duration })} />
          )}
          <FieldError message={errors.duration} />
        </div>
        <div>
          <Label>Aspect</Label>
          <Segmented label="Aspect" value={settings.aspect} options={ASPECT_OPTIONS} onChange={(aspect) => onChange({ aspect })} />
          <FieldError message={errors.aspect} />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-x-3 gap-y-5">
        <Select
          label="Language"
          value={settings.language}
          options={LANGUAGE_OPTIONS}
          onChange={(language) => onChange({ language })}
          error={errors.language}
        />
        {settings.language === "en" ? (
          <Select
            label="Voice"
            value={settings.enVoice}
            options={voiceOptions(EN_VOICES)}
            onChange={(voice) => onChange({ enVoice: voice as EnVoice })}
            error={errors.voice}
          />
        ) : settings.language === "es" ? (
          <Select
            label="Voice"
            value={settings.esVoice}
            options={voiceOptions(ES_VOICES)}
            onChange={(voice) => onChange({ esVoice: voice as EsVoice })}
            error={errors.voice}
          />
        ) : (
          <Select label="Voice" value="default" options={[{ value: "default", label: "Default" }]} onChange={() => {}} disabled />
        )}
        <Select
          label="Music"
          hint={settings.music === "auto" ? MUSIC[style.music] : undefined}
          value={settings.music}
          options={MUSIC_OPTIONS}
          onChange={(music) => onChange({ music })}
          error={errors.music}
        />
        <Select
          label="Captions"
          hint={settings.captions === "auto" ? CAPTIONS[style.captions] : undefined}
          value={settings.captions}
          options={CAPTION_OPTIONS}
          onChange={(captions) => onChange({ captions })}
          error={errors.captions}
        />
      </section>

      <div className="sticky bottom-0 z-10 -mx-4 -mt-3 bg-canvas px-4 pt-3 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full h-8 bg-linear-to-t from-canvas to-transparent" />
        {errors.form && (
          <div className="mb-3">
            <FieldError message={errors.form} />
          </div>
        )}
        <button type="submit" disabled={busy} className={buttonClass("primary", "h-14 w-full text-[17px]")}>
          {busy && <Icon name="spinner" className="size-5" />}
          {busy ? "Starting" : "Generate short"}
        </button>
      </div>
    </form>
  );
}

function AspectGlyph({ aspect }: { aspect: Aspect }) {
  const size = aspect === "9:16" ? "h-3.5 w-2" : aspect === "1:1" ? "size-3" : "h-2 w-3.5";
  return <span aria-hidden="true" className={cn("rounded-[2px] border-[1.5px] border-current", size)} />;
}
