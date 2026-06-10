import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ApiWord, ReorderExercise } from "../../types";
import { shuffle } from "../../hooks";
import FeedbackBar from "../../components/FeedbackBar";
import type { FeedbackVariant } from "../../components/FeedbackBar";

/** Assemble shuffled Aramaic word tiles back into the correct sentence order. */
export default function Reorder({
  exercise,
  fallbackWords,
  onDone,
}: {
  exercise: ReorderExercise;
  fallbackWords: ApiWord[];
  onDone: () => void;
}) {
  // Correct order: explicit fields if the API provides them, else the sentence itself.
  const correct = useMemo(
    () =>
      exercise.correctOrder ??
      exercise.answer ??
      exercise.words ??
      fallbackWords.map((w) => w.vowel),
    [exercise, fallbackWords],
  );

  // Tiles: API-provided shuffle if present, else shuffle the correct order.
  const initialTiles = useMemo(() => {
    const tiles = exercise.tiles?.length ? exercise.tiles : shuffle(correct);
    return tiles.map((text, i) => ({ id: i, text }));
  }, [exercise, correct]);

  const [bank, setBank] = useState(initialTiles);
  const [answer, setAnswer] = useState<{ id: number; text: string }[]>([]);
  const [verdict, setVerdict] = useState<FeedbackVariant | null>(null);

  const pick = (id: number) => {
    const tile = bank.find((t) => t.id === id);
    if (!tile) return;
    setBank((b) => b.filter((t) => t.id !== id));
    setAnswer((a) => [...a, tile]);
  };
  const unpick = (id: number) => {
    const tile = answer.find((t) => t.id === id);
    if (!tile) return;
    setAnswer((a) => a.filter((t) => t.id !== id));
    setBank((b) => [...b, tile]);
  };

  const check = () => {
    const ok =
      answer.length === correct.length && answer.every((t, i) => t.text === correct[i]);
    setVerdict(ok ? "correct" : "incorrect");
  };

  const retryWrong = () => {
    setVerdict(null);
    setBank((b) => [...b, ...answer]);
    setAnswer([]);
  };

  return (
    <div className="pb-24">
      <h3 className="text-2xl font-semibold mb-1">Rebuild the sentence</h3>
      <p className="text-ink/55 mb-6">Tap the tiles in order — remember, Aramaic reads right to left.</p>

      <div
        dir="rtl"
        className="min-h-[5rem] card p-4 flex flex-wrap gap-2 items-start mb-6 border-dashed"
      >
        <AnimatePresence>
          {answer.map((t) => (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => verdict === null && unpick(t.id)}
              className="font-aramaic text-2xl px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/60"
            >
              {t.text}
            </motion.button>
          ))}
        </AnimatePresence>
        {!answer.length && (
          <span dir="ltr" className="text-ink/35 italic text-base py-2">
            Your sentence builds here…
          </span>
        )}
      </div>

      <div dir="rtl" className="flex flex-wrap gap-2 mb-8">
        <AnimatePresence>
          {bank.map((t) => (
            <motion.button
              key={t.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => verdict === null && pick(t.id)}
              className="font-aramaic text-2xl px-3 py-1.5 rounded-lg bg-white/70 border border-ink/15 hover:border-gold shadow-sm"
            >
              {t.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <button
        onClick={check}
        disabled={answer.length !== correct.length || verdict !== null}
        className="px-8 py-3 rounded-full bg-gold text-parchment font-semibold text-lg disabled:opacity-40"
      >
        Check
      </button>

      <FeedbackBar
        open={verdict !== null}
        variant={verdict ?? "correct"}
        title={verdict === "correct" ? "Perfect order!" : "Not quite the order"}
        detail={verdict === "incorrect" ? "Try rebuilding it — lead with the formula." : undefined}
        actionLabel={verdict === "correct" ? "Continue" : "Try again"}
        onAction={verdict === "correct" ? onDone : retryWrong}
      />
    </div>
  );
}
