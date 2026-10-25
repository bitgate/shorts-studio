import type { Aspect, CaptionPreset, MusicMood, ShortLanguage, ShortStage, ShortStyle } from "../lib/reelapi";
import cinematic from "../assets/styles/cinematic.webp";
import photoreal from "../assets/styles/photoreal.webp";
import anime from "../assets/styles/anime.webp";
import cartoon from "../assets/styles/3d-cartoon.webp";
import watercolor from "../assets/styles/watercolor.webp";
import comic from "../assets/styles/comic.webp";
import documentary from "../assets/styles/dark-documentary.webp";
import oilPainting from "../assets/styles/oil-painting.webp";

export interface StyleInfo {
  label: string;
  short: string;
  image: string;
  music: MusicMood;
  captions: CaptionPreset;
}

export const STYLES: Record<ShortStyle, StyleInfo> = {
  cinematic: { label: "Cinematic", short: "Cinematic", image: cinematic, music: "cinematic", captions: "bold" },
  photoreal: { label: "Photoreal", short: "Photoreal", image: photoreal, music: "chill", captions: "bold" },
  anime: { label: "Anime", short: "Anime", image: anime, music: "lofi", captions: "karaoke" },
  "3d-cartoon": { label: "3D cartoon", short: "3D cartoon", image: cartoon, music: "upbeat", captions: "bold" },
  watercolor: { label: "Watercolor", short: "Watercolor", image: watercolor, music: "chill", captions: "minimal" },
  comic: { label: "Comic", short: "Comic", image: comic, music: "energetic", captions: "bold" },
  "dark-documentary": { label: "Dark documentary", short: "Documentary", image: documentary, music: "dark", captions: "bold" },
  "oil-painting": { label: "Oil painting", short: "Oil painting", image: oilPainting, music: "cinematic", captions: "minimal" },
};

export const LANGUAGES: Record<ShortLanguage, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
};

export const MUSIC: Record<MusicMood, string> = {
  auto: "Auto",
  none: "No music",
  lofi: "Lo-fi",
  chill: "Chill",
  upbeat: "Upbeat",
  cinematic: "Cinematic",
  dramatic: "Dramatic",
  dark: "Dark",
  energetic: "Energetic",
  inspiring: "Inspiring",
};

export const CAPTIONS: Record<CaptionPreset, string> = {
  bold: "Bold",
  karaoke: "Karaoke",
  minimal: "Minimal",
};

export const STAGES: Array<{ id: ShortStage; label: string }> = [
  { id: "planning", label: "Writing the script" },
  { id: "images", label: "Painting the scenes" },
  { id: "voice", label: "Recording the voiceover" },
  { id: "rendering", label: "Rendering the video" },
];

export const OUTPUT_SIZES: Record<Aspect, string> = { "9:16": "1080x1920", "1:1": "1080x1080", "16:9": "1920x1080" };

export const DURATIONS = [30, 45, 60, 90] as const;
export const TOPIC_MAX = 500;
export const SCRIPT_MAX = 3000;

export const EXAMPLE_TOPICS = [
  "The ghost ship Mary Celeste",
  "Why octopuses have three hearts",
  "The Great Emu War of 1932",
];
