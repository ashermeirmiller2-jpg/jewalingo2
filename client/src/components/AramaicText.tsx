import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ApiWord } from "../types";

export const NEUTRAL_BAR = "#d8cbb3"; // content words get a quiet parchment-tone bar

export interface AramaicWord {
  vowel: string;
  plain?: string;
  gloss?: string;
  isFunction?: boolean;
  functionColor?: string | null;
}

/** Words from an API string — ONLY ever call with text received from the API. */
export function wordsFromApiText(text: string): AramaicWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((vowel) => ({ vowel }));
}

export function toAramaicWords(words: ApiWord[]): AramaicWord[] {
  return words.map((w) => ({
    vowel: w.vowel,
    plain: w.plain,
    gloss: w.gloss,
    isFunction: w.isFunction,
    functionColor: w.functionColor,
  }));
}

interface AramaicTextProps {
  words: AramaicWord[];
  size?: "2xl" | "3xl" | "4xl";
  /** Show the function color bars under each word (default true). */
  showBars?: boolean;
  /** Allow tapping a word to reveal its gloss tooltip (default true when glosses exist). */
  glossesEnabled?: boolean;
  /** Indices rendered with a gold highlight (e.g. formula skeleton / function words). */
  highlightIndices?: number[];
  /** Dim non-highlighted (content) words. */
  dimOthers?: boolean;
  hoveredIndex?: number | null;
  onWordHover?: (index: number | null) => void;
  onWordClick?: (index: number) => void;
  className?: string;
}

/**
 * THE core component: RTL Aramaic with function color bars under each word
 * and tap-for-gloss tooltips. Never feed it hardcoded Aramaic — API text only.
 */
export default function AramaicText({
  words,
  size = "3xl",
  showBars = true,
  glossesEnabled,
  highlightIndices,
  dimOthers = false,
  hoveredIndex = null,
  onWordHover,
  onWordClick,
  className = "",
}: AramaicTextProps) {
  const [openGloss, setOpenGloss] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const highlights = new Set(highlightIndices ?? []);
  const anyGloss = words.some((w) => w.gloss);
  const canGloss = glossesEnabled ?? anyGloss;

  useEffect(() => {
    if (openGloss === null) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenGloss(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openGloss]);

  const sizeClass = { "2xl": "text-2xl", "3xl": "text-3xl", "4xl": "text-4xl" }[size];

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className={`font-aramaic leading-loose flex flex-wrap gap-x-3 gap-y-6 ${sizeClass} ${className}`}
    >
      {words.map((w, i) => {
        const highlighted = highlights.has(i);
        const dimmed = dimOthers && !highlighted;
        const barColor = w.functionColor || NEUTRAL_BAR;
        const isHovered = hoveredIndex === i;
        return (
          <span key={i} className="relative inline-flex flex-col items-center">
            <motion.button
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => {
                onWordClick?.(i);
                if (canGloss && w.gloss) setOpenGloss(openGloss === i ? null : i);
              }}
              onMouseEnter={() => onWordHover?.(i)}
              onMouseLeave={() => onWordHover?.(null)}
              className={[
                "px-1 rounded-md transition-colors duration-150 cursor-pointer select-text",
                highlighted ? "text-gold font-medium" : "",
                dimmed ? "opacity-40" : "",
                isHovered ? "bg-gold/20" : "hover:bg-gold/10",
              ].join(" ")}
            >
              {w.vowel}
            </motion.button>
            {showBars && (
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="block h-[3px] w-full rounded-full mt-1"
                style={{ backgroundColor: barColor, transformOrigin: "right" }}
              />
            )}
            <AnimatePresence>
              {openGloss === i && w.gloss && (
                <motion.span
                  dir="ltr"
                  initial={{ opacity: 0, y: 6, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.92 }}
                  transition={{ duration: 0.16 }}
                  className="absolute top-full mt-2 z-20 whitespace-nowrap rounded-lg bg-ink text-parchment text-sm font-garamond px-3 py-1.5 shadow-card"
                >
                  {w.gloss}
                  {w.isFunction !== undefined && (
                    <span className="ml-2 text-gold/90 text-xs uppercase tracking-wider">
                      {w.isFunction ? "function" : "content"}
                    </span>
                  )}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        );
      })}
    </div>
  );
}
