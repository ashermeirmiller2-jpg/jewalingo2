import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ApiWord, TapMatchExercise } from "../../types";
import { shuffle } from "../../hooks";
import FeedbackBar from "../../components/FeedbackBar";

interface Pair {
  aramaic: string;
  gloss: string;
}

/** Tap an Aramaic word, then its English gloss (or vice versa) to clear all pairs. */
export default function TapMatch({
  exercise,
  fallbackWords,
  onDone,
}: {
  exercise: TapMatchExercise;
  fallbackWords: ApiWord[];
  onDone: () => void;
}) {
  const pairs: Pair[] = useMemo(() => {
    if (exercise.pairs?.length) return exercise.pairs;
    const source = exercise.words?.length ? exercise.words : fallbackWords;
    // Dedupe by gloss so two identical glosses don't create ambiguous matches.
    const seen = new Set<string>();
    return source
      .filter((w) => w.gloss && !seen.has(w.gloss) && seen.add(w.gloss))
      .slice(0, 6)
      .map((w) => ({ aramaic: w.vowel, gloss: w.gloss }));
  }, [exercise, fallbackWords]);

  const left = useMemo(() => shuffle(pairs.map((p) => p.aramaic)), [pairs]);
  const right = useMemo(() => shuffle(pairs.map((p) => p.gloss)), [pairs]);
  const glossOf = useMemo(() => new Map(pairs.map((p) => [p.aramaic, p.gloss])), [pairs]);

  const [selLeft, setSelLeft] = useState<string | null>(null);
  const [selRight, setSelRight] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set()); // aramaic keys
  const [flash, setFlash] = useState<{ a: string; g: string } | null>(null);
  const done = matched.size === pairs.length && pairs.length > 0;

  const tryMatch = (a: string | null, g: string | null) => {
    if (!a || !g) return;
    if (glossOf.get(a) === g) {
      setMatched((m) => new Set(m).add(a));
      setSelLeft(null);
      setSelRight(null);
    } else {
      setFlash({ a, g });
      setTimeout(() => {
        setFlash(null);
        setSelLeft(null);
        setSelRight(null);
      }, 600);
    }
  };

  const tileClass = (state: "idle" | "selected" | "matched" | "wrong") =>
    ({
      idle: "border-ink/15 bg-white/60 hover:border-gold",
      selected: "border-gold bg-gold/10",
      matched: "border-green-600/60 bg-green-50 text-green-800/70 pointer-events-none",
      wrong: "border-red-500 bg-red-50",
    })[state];

  return (
    <div className="pb-24">
      <h3 className="text-2xl font-semibold mb-1">Match the words</h3>
      <p className="text-ink/55 mb-6">Tap an Aramaic word, then its meaning.</p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-xl">
        <div dir="rtl" className="flex flex-col gap-3">
          {left.map((a) => {
            const state = matched.has(a)
              ? "matched"
              : flash?.a === a
                ? "wrong"
                : selLeft === a
                  ? "selected"
                  : "idle";
            return (
              <motion.button
                key={a}
                whileTap={{ scale: 0.96 }}
                animate={state === "wrong" ? { x: [0, -5, 5, -3, 3, 0] } : {}}
                onClick={() => {
                  setSelLeft(a);
                  tryMatch(a, selRight);
                }}
                className={`font-aramaic text-2xl px-4 py-2.5 rounded-xl border-2 transition-colors ${tileClass(state)}`}
              >
                {a}
              </motion.button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3">
          {right.map((g) => {
            const isMatched = pairs.some((p) => p.gloss === g && matched.has(p.aramaic));
            const state = isMatched
              ? "matched"
              : flash?.g === g
                ? "wrong"
                : selRight === g
                  ? "selected"
                  : "idle";
            return (
              <motion.button
                key={g}
                whileTap={{ scale: 0.96 }}
                animate={state === "wrong" ? { x: [0, -5, 5, -3, 3, 0] } : {}}
                onClick={() => {
                  setSelRight(g);
                  tryMatch(selLeft, g);
                }}
                className={`text-lg px-4 py-2.5 rounded-xl border-2 transition-colors ${tileClass(state)}`}
              >
                {g}
              </motion.button>
            );
          })}
        </div>
      </div>
      <FeedbackBar
        open={done}
        variant="correct"
        title="All matched!"
        detail="Every word in this formula is now yours."
        onAction={onDone}
      />
    </div>
  );
}
