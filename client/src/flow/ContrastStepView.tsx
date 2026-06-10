import { useState } from "react";
import { motion } from "framer-motion";
import { answerContrast } from "../api";
import type { ContrastStep, NearMiss } from "../types";
import AramaicText, { toAramaicWords } from "../components/AramaicText";
import OptionButton, { type OptionState } from "../components/OptionButton";

type SubMode = "sameSkeleton" | "nearMiss";

/**
 * contrast — the deep function-syntax layer (2.6). Two sub-modes:
 *  • same-skeleton: A and B side by side, function words linked (the constant);
 *  • near-miss: a one-function-word-different variant, "what changes?" MC.
 */
export default function ContrastStepView({
  step,
  onComplete,
}: {
  step: ContrastStep;
  onComplete: () => void;
}) {
  const hasSame = !!step.sameSkeleton?.wordsA?.length;
  const hasNear = !!step.nearMisses?.length;
  const [sub, setSub] = useState<SubMode>(hasSame ? "sameSkeleton" : "nearMiss");

  return (
    <div>
      <p className="text-gold uppercase tracking-[0.25em] text-xs mb-2">
        Contrast · the pattern up close
      </p>

      {hasSame && hasNear && (
        <div className="flex gap-1 mb-6 p-1 bg-ink/5 rounded-full w-fit">
          {([
            ["sameSkeleton", "Same skeleton"],
            ["nearMiss", "Near miss"],
          ] as [SubMode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSub(key)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                sub === key ? "bg-gold text-parchment" : "text-ink/60 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {sub === "sameSkeleton" && hasSame ? (
        <SameSkeleton step={step} />
      ) : (
        <NearMissDrills nearMisses={step.nearMisses ?? []} />
      )}

      <div className="mt-10">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="px-8 py-3 rounded-full bg-gold text-parchment font-semibold text-lg"
        >
          Finish this pair
        </motion.button>
      </div>
    </div>
  );
}

function SameSkeleton({ step }: { step: ContrastStep }) {
  const same = step.sameSkeleton!;
  const [hover, setHover] = useState<{ side: "A" | "B"; index: number } | null>(null);

  // map function matches both directions for cross-highlighting
  const matchAtoB = new Map<number, number>();
  const matchBtoA = new Map<number, number>();
  for (const [a, b] of same.functionMatches ?? []) {
    matchAtoB.set(a, b);
    matchBtoA.set(b, a);
  }

  const highlightA: number[] = [];
  const highlightB: number[] = [];
  if (hover) {
    if (hover.side === "A") {
      highlightA.push(hover.index);
      const b = matchAtoB.get(hover.index);
      if (b !== undefined) highlightB.push(b);
    } else {
      highlightB.push(hover.index);
      const a = matchBtoA.get(hover.index);
      if (a !== undefined) highlightA.push(a);
    }
  } else {
    // at rest, all matched function words glow softly
    for (const [a, b] of same.functionMatches ?? []) {
      highlightA.push(a);
      highlightB.push(b);
    }
  }

  return (
    <div>
      <p className="text-ink/60 mb-6 italic">
        The function words (gold) are identical in both cases; only the content differs. The pattern
        is the constant — hover a gold word to see its twin.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        {(["A", "B"] as const).map((side) => (
          <div key={side} className="card p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-ink/40 mb-4">Case {side}</p>
            <AramaicText
              words={toAramaicWords(side === "A" ? same.wordsA : same.wordsB)}
              size="2xl"
              highlightIndices={side === "A" ? highlightA : highlightB}
              dimOthers
              hoveredIndex={hover?.side === side ? hover.index : null}
              onWordHover={(index) =>
                setHover(index === null ? null : { side, index })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function NearMissDrills({ nearMisses }: { nearMisses: NearMiss[] }) {
  if (!nearMisses.length) {
    return <p className="text-ink/50 italic py-8">No near-miss drills for this pair yet.</p>;
  }
  return (
    <div className="space-y-8">
      {nearMisses.map((nm) => (
        <NearMissCard key={nm.id} nm={nm} />
      ))}
    </div>
  );
}

function NearMissCard({ nm }: { nm: NearMiss }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; explanation: string } | null>(null);

  const choose = async (optionId: string) => {
    if (chosen) return;
    setChosen(optionId);
    try {
      const r = await answerContrast({ exerciseId: nm.id, optionId });
      setResult(r);
    } catch {
      setResult({ correct: false, explanation: "Couldn't grade that — try again later." });
    }
  };

  const stateFor = (optionId: string): OptionState => {
    if (!chosen || !result) return chosen === optionId ? "selected" : "idle";
    if (optionId === chosen) return result.correct ? "correct" : "wrong";
    return "disabled";
  };

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center gap-3 mb-4" dir="rtl">
        <span className="font-aramaic text-2xl">{nm.baseDisplay}</span>
        <span dir="ltr" className="text-ink/40">
          vs
        </span>
        <span className="font-aramaic text-2xl text-gold">{nm.variantDisplay}</span>
      </div>
      <p className="text-sm text-ink/50 mb-4" dir="ltr">
        One function word changed:{" "}
        <span dir="rtl" className="font-aramaic text-gold">
          {nm.changedWord}
        </span>
      </p>
      <p className="text-lg mb-4">{nm.question}</p>
      <div className="space-y-2">
        {nm.options.map((o) => (
          <OptionButton key={o.id} state={stateFor(o.id)} onClick={() => choose(o.id)}>
            {o.text}
          </OptionButton>
        ))}
      </div>
      {result && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 text-sm ${result.correct ? "text-emerald-700" : "text-ink/70"}`}
        >
          {result.explanation}
        </motion.p>
      )}
    </div>
  );
}
