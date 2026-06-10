import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getReviewQueue, gradeReview } from "../api";
import { useApi } from "../hooks";
import { useStore } from "../store";
import type { ReviewItem } from "../types";
import { ErrorPane, Loading } from "../components/Status";

const RATINGS: { rating: 1 | 2 | 3 | 4; label: string; tone: string }[] = [
  { rating: 1, label: "Again", tone: "border-red-400 text-red-600" },
  { rating: 2, label: "Hard", tone: "border-amber-400 text-amber-600" },
  { rating: 3, label: "Good", tone: "border-emerald-400 text-emerald-600" },
  { rating: 4, label: "Easy", tone: "border-gold text-gold" },
];

export default function Review() {
  const { data, error, loading, retry } = useApi(getReviewQueue, []);
  const refreshProgress = useStore((s) => s.refreshProgress);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (loading) return <Loading label="Gathering what's due…" />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!data?.length || idx >= data.length) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-5xl mb-4">🔥</p>
        <h1 className="text-3xl mb-2">Nothing due right now</h1>
        <p className="text-ink/60">Your spaced-repetition queue is clear. Go learn something new.</p>
        <Link to="/learn" className="inline-block mt-6 text-gold underline underline-offset-4">
          Back to learning
        </Link>
      </div>
    );
  }

  const item = data[idx];

  const grade = async (rating: 1 | 2 | 3 | 4) => {
    try {
      await gradeReview({ itemId: item.id, rating });
      refreshProgress();
    } catch {
      /* keep moving even if the grade write fails */
    }
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gold uppercase tracking-[0.25em] text-xs">Review · spaced repetition</p>
        <p className="text-ink/50 text-sm">
          {idx + 1} / {data.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
        >
          <ReviewCard item={item} revealed={revealed} />
        </motion.div>
      </AnimatePresence>

      {needsFlip(item) && !revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-6 w-full py-3 rounded-full bg-gold text-parchment font-semibold"
        >
          Reveal
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-2 mt-6">
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              onClick={() => grade(r.rating)}
              className={`py-3 rounded-xl border-2 font-medium hover:bg-white/60 transition-colors ${r.tone}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function needsFlip(item: ReviewItem): boolean {
  return item.kind === "FORMULA";
}

function ReviewCard({ item, revealed }: { item: ReviewItem; revealed: boolean }) {
  const p = (item.payload ?? {}) as Record<string, unknown>;

  if (item.kind === "FORMULA") {
    return (
      <div className="card p-10 text-center min-h-[220px] flex flex-col items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-ink/40 mb-4">Recall this formula</p>
        {typeof p.display === "string" || typeof p.skeleton === "string" ? (
          <p dir="rtl" className="font-aramaic text-4xl text-gold mb-4">
            {(p.display as string) || (p.skeleton as string)}
          </p>
        ) : null}
        {revealed && typeof p.gloss === "string" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl text-ink/80">
            {p.gloss}
          </motion.p>
        )}
      </div>
    );
  }

  // LEIN / MC / CLASS / CONTRAST — deep-link to the relevant surface
  const link = deepLink(item);
  return (
    <div className="card p-8 min-h-[180px] flex flex-col justify-between">
      <div>
        <span className="text-xs uppercase tracking-widest text-gold">{item.kind}</span>
        <p className="text-xl mt-3">{summarize(item)}</p>
      </div>
      {link && (
        <Link to={link} className="text-gold underline underline-offset-4 mt-4 self-start">
          Open it →
        </Link>
      )}
    </div>
  );
}

function summarize(item: ReviewItem): string {
  const p = (item.payload ?? {}) as Record<string, unknown>;
  switch (item.kind) {
    case "LEIN":
      return `Lein again: ${(p.caseBRef as string) ?? "a case you've seen"}`;
    case "MC":
      return (p.prompt as string) ?? "A 'what happened' question is due.";
    case "CLASS":
      return (p.title as string) ?? "Revisit a question-type class.";
    case "CONTRAST":
      return (p.question as string) ?? "A near-miss contrast is due.";
    default:
      return "Due for review.";
  }
}

function deepLink(item: ReviewItem): string | null {
  const p = (item.payload ?? {}) as Record<string, unknown>;
  switch (item.kind) {
    case "LEIN":
      return p.pairId ? `/learn/pair/${p.pairId}` : null;
    case "CONTRAST":
      return p.pairId ? `/learn/pair/${p.pairId}?step=contrast` : null;
    case "MC":
      return "/quiz";
    case "CLASS":
      return `/classes/${item.targetId}`;
    default:
      return null;
  }
}
