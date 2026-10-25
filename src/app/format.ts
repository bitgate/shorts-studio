import type { ShortLanguage } from "../lib/reelapi";

// Narration pace of the default voices, in words per second
const SPEECH_RATE: Partial<Record<ShortLanguage, number>> = { en: 2.8, es: 1.96 };

export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function timeAgo(timestamp: number, now: number): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function estimateSeconds(script: string, language: ShortLanguage): number | null {
  const rate = SPEECH_RATE[language];
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return rate && words > 0 ? Math.round(words / rate) : null;
}

export function videoFileName(title: string): string {
  const slug = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .slice(0, 60);

  return `${slug || "short"}.mp4`;
}
