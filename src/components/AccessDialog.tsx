import { useEffect, useRef, useState } from "react";
import { FieldError, buttonClass } from "./ui";

interface AccessDialogProps {
  open: boolean;
  invalid: boolean;
  onSubmit: (code: string) => void;
  onCancel: () => void;
}

export function AccessDialog({ open, invalid, onSubmit, onCancel }: AccessDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(92vw,400px)] rounded-2xl border border-edge bg-panel p-6 text-ink shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) onSubmit(code.trim());
        }}
      >
        <h2 className="display text-[22px]">Access code</h2>
        <p className="mt-1.5 text-[14px] text-dim">This studio is private. Enter the code you were given.</p>

        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-label="Access code"
          aria-invalid={invalid || undefined}
          className="mt-5 h-12 w-full rounded-xl border border-edge bg-field px-3.5 font-mono text-[16px] tracking-wide outline-none focus:border-ink"
        />
        <FieldError message={invalid ? "That code didn't work. Check it and try again." : undefined} />

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={buttonClass("ghost", "h-11 px-4 text-[15px]")}>
            Cancel
          </button>
          <button type="submit" disabled={!code.trim()} className={buttonClass("primary", "h-11 px-5 text-[15px]")}>
            Continue
          </button>
        </div>
      </form>
    </dialog>
  );
}
