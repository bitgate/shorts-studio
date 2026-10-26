import { useState } from "react";
import { Icon } from "./ui";

export function Header() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
      <a href="/" className="flex items-center gap-2.5 rounded-lg">
        <Logo />
        <span className="display text-[17px] sm:text-[19px]">Shorts Studio</span>
      </a>

      <div className="flex items-center gap-1">
        <a
          href="https://reelsdk.com"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-[13px] text-dim transition-colors hover:text-ink"
        >
          reelsdk
          <Icon name="arrowUpRight" className="size-3.5" />
        </a>
        <ThemeToggle />
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 sm:size-8" aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-accent" />
      <rect x="10" y="6" width="12" height="20" rx="3" fill="none" strokeWidth="2.4" className="stroke-on-accent" />
      <path d="M14.5 12.6v6.8l5.2-3.4z" className="fill-on-accent" />
    </svg>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#0f0f0d" : "#f2f0e9");
    try {
      localStorage.setItem("shorts-studio:theme", next ? "dark" : "light");
    } catch {
      // Private mode can block storage; the toggle still works for this visit
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="grid size-10 place-items-center rounded-lg text-dim transition-colors hover:bg-field hover:text-ink"
    >
      <Icon name={dark ? "sun" : "moon"} className="size-[18px]" />
    </button>
  );
}
