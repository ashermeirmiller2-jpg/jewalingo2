import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { gradeLein } from "../api";
import { useStore } from "../store";
import type { LeinBStep, LeinGradeResult } from "../types";
import AramaicText, { wordsFromApiText, type AramaicWord } from "../components/AramaicText";
import FeedbackBar from "../components/FeedbackBar";
import { shuffle } from "../hooks";

type Mode = "tiles" | "free";

// The progressive hint ladder. Each rung costs a "reveal" but never blocks.
const HINT_RUNGS = [
  { key: "functionBars", label: "Show function bars" },
  { key: "glosses", label: "Tap any word for its gloss" },
  { key: "formula", label: "Remind me of the formula" },
  { key: "full", label: "Show the full translation" },
] as const;

/**
 * leinB — the lein challenge. Case B's raw verified text, no translation, and
 * the learner reconstructs the English (it shares Case A's formula). Progressive
 * hints, two answer modes, AI/acceptance grading. Result feeds FSRS.
 */
export default function LeinBStepView({
  step,
  pairId,
  onComplete,
}: {
  step: LeinBStep;
  pairId: string;
  onComplete: () => void;
}) {
  const refreshProgress = useStore((s) => s.refreshProgress);
  const [mode, setMode] = useState<Mode>("tiles");
  const [hintLevel, setHintLevel] = useState(0); // how many rungs revealed
  const [assembled, setAssembled] = useState<string[]>([]);
  const [bank, setBank] = useState<string[]>(() => shuffle(step.tiles ?? []));
  const [freeText, setFreeText] = useState("");
  const [result, setResult] = useState<LeinGradeResult | null>(null);
  const [grading, setGrading] = useState(false);

  const glossByVowel = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of step.hints?.glosses ?? []) {
      if (typeof g === "object" && g.gloss) m.set(g.vowel ?? "", g.gloss);
    }
    return m;
  }, [step]);

  const showBars = hintLevel >= 1;
  const glossesEnabled = hintLevel >= 2;

  const words: AramaicWord[] = useMemo(() => {
    const base = step.words?.length
      ? step.words.map((w) => ({ ...w }))
      : wordsFromApiText(step.occurrence.textVowel);
    return base.map((w) => ({
      ...w,
      gloss: glossesEnabled ? w.gloss ?? glossByVowel.get(w.vowel) : undefined,
      functionColor: showBars ? w.functionColor : null,
    }));
  }, [step, showBars, glossesEnabled, glossByVowel]);

  const revealNextHint = () => setHintLevel((h) => Math.min(HINT_RUNGS.length, h + 1));

  const answer = mode === "tiles" ? assembled.join(" ") : freeText.trim();

  const submit = async () => {
    if (!answer || grading) return;
    setGrading(true);
    try {
      const r = await gradeLein({ pairId, mode, answer, hintsUsed: hintLevel });
      setResult(r);
      refreshProgress();
    } catch {
      setResult({
        verdict: "incorrect",
        correctSpans: [],
        wrongSpans: [],
        pshatNote: "Couldn't reach the grader — check your connection and try again.",
      });
    } finally {
      setGrading(false);
    }
  };

  return (
    <div>
      <p className="text-gold uppercase tracking-[0.25em] text-xs mb-2">Case B · lein it cold</p>
      <p className="text-ink/55 mb-6">
        {step.occurrence.ref}
        {step.occurrence.tractate ? ` · ${step.occurrence.tractate}` : ""} — same formula, new
        sugya. No translation. What does it say?
      </p>

      <div className="card p-8 mb-6">
        <AramaicText words={words} size="3xl" showBars={showBars} glossesEnabled={glossesEnabled} />
      </div>

      {/* hint ladder */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {HINT_RUNGS.map((rung, i) => (
          <button
            key={rung.key}
            disabled={i !== hintLevel}
            onClick={revealNextHint}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              i < hintLevel
                ? "border-gold/30 text-gold/60 bg-gold/5"
                : i === hintLevel
                ? "border-gold text-gold hover:bg-gold hover:text-parchment"
                : "border-ink/10 text-ink/30 cursor-default"
            }`}
          >
            {i < hintLevel ? "✓ " : `Hint ${i + 1}: `}
            {rung.label}
          </button>
        ))}
      </div>

      {hintLevel >= 3 && step.hints?.formulaReminder && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-gold/40 p-4 mb-6 text-ink/80"
        >
          💡 {step.hints.formulaReminder}
        </motion.div>
      )}
      {hintLevel >= 4 && step.hints?.fullTranslation && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 mb-6 italic text-ink/70"
        >
          “{step.hints.fullTranslation}”
        </motion.div>
      )}

      {/* answer mode toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-ink/5 rounded-full w-fit">
        {(["tiles", "free"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              mode === m ? "bg-gold text-parchment" : "text-ink/60 hover:text-ink"
            }`}
          >
            {m === "tiles" ? "Word tiles" : "Free translation"}
          </button>
        ))}
      </div>

      {mode === "tiles" ? (
        <TileAssembler
          assembled={assembled}
          bank={bank}
          onTake={(tile, idx) => {
            setAssembled((a) => [...a, tile]);
            setBank((b) => b.filter((_, i) => i !== idx));
          }}
          onReturn={(tile, idx) => {
            setBank((b) => [...b, tile]);
            setAssembled((a) => a.filter((_, i) => i !== idx));
          }}
        />
      ) : (
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          placeholder="Type your translation in English…"
          dir="ltr"
          className="w-full card p-4 font-garamond text-lg resize-none focus:outline-none focus:ring-2 focus:ring-gold/40"
        />
      )}

      <div className="mt-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={!answer || grading}
          onClick={submit}
          className="px-8 py-3 rounded-full bg-gold text-parchment font-semibold text-lg disabled:opacity-40"
        >
          {grading ? "Grading…" : "Check my lein"}
        </motion.button>
      </div>

      <FeedbackBar
        open={result !== null}
        variant={result?.verdict ?? "correct"}
        title={
          result?.verdict === "correct"
            ? "You leined it!"
            : result?.verdict === "partial"
            ? "Close — part of it is right"
            : "Not yet — look at the formula again"
        }
        detail={result?.pshatNote}
        actionLabel="Continue"
        onAction={onComplete}
      />
    </div>
  );
}

function TileAssembler({
  assembled,
  bank,
  onTake,
  onReturn,
}: {
  assembled: string[];
  bank: string[];
  onTake: (tile: string, idx: number) => void;
  onReturn: (tile: string, idx: number) => void;
}) {
  return (
    <div>
      <div className="card min-h-[64px] p-3 mb-4 flex flex-wrap gap-2 items-start">
        {assembled.length === 0 && (
          <span className="text-ink/30 italic px-2 py-1">Tap tiles to build the English…</span>
        )}
        {assembled.map((tile, i) => (
          <motion.button
            key={`${tile}-${i}`}
            layout
            whileTap={{ scale: 0.94 }}
            onClick={() => onReturn(tile, i)}
            className="px-3 py-1.5 rounded-lg bg-gold/15 border border-gold/40 font-garamond"
          >
            {tile}
          </motion.button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {bank.map((tile, i) => (
          <motion.button
            key={`${tile}-${i}`}
            layout
            whileTap={{ scale: 0.94 }}
            onClick={() => onTake(tile, i)}
            className="px-3 py-1.5 rounded-lg bg-white/70 border border-ink/15 font-garamond hover:border-gold"
          >
            {tile}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
