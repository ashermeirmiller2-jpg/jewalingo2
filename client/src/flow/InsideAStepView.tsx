import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { learnWords } from "../api";
import type { InsideAStep } from "../types";
import AramaicText, { toAramaicWords } from "../components/AramaicText";
import TapMatch from "./exercises/TapMatch";
import Reorder from "./exercises/Reorder";
import FillFunction from "./exercises/FillFunction";

type Phase = "intro" | "sentence" | "exercises";

/**
 * insideA: introduce new words → show the sentence with the formula skeleton
 * highlighted → run the exercises (tapMatch / reorder / fillFunction).
 */
export default function InsideAStepView({
  step,
  onComplete,
}: {
  step: InsideAStep;
  onComplete: () => void;
}) {
  const newWords = useMemo(() => step.words.filter((w) => w.isNew), [step]);
  const [phase, setPhase] = useState<Phase>(newWords.length ? "intro" : "sentence");
  const [introIdx, setIntroIdx] = useState(0);
  const [exIdx, setExIdx] = useState(0);

  // Heuristic: the skeleton lives in the function words + any word whose plain
  // form appears verbatim in the skeleton string (slots like {X} are content).
  const skeletonIndices = useMemo(() => {
    const skel = step.skeleton ?? "";
    return step.words
      .map((w, i) => (w.isFunction || (w.plain && skel.includes(w.plain)) ? i : -1))
      .filter((i) => i >= 0);
  }, [step]);

  const finishIntro = () => {
    const ids = newWords.map((w) => w.id ?? w.plain);
    if (ids.length) learnWords(ids).catch(() => undefined); // non-blocking
    setPhase("sentence");
  };

  const nextIntro = () => {
    if (introIdx < newWords.length - 1) setIntroIdx(introIdx + 1);
    else finishIntro();
  };

  const nextExercise = () => {
    if (exIdx < step.exercises.length - 1) setExIdx(exIdx + 1);
    else onComplete();
  };

  return (
    <div>
      <p className="text-gold uppercase tracking-[0.25em] text-xs mb-2">Case A · the inside</p>
      <p className="text-ink/55 mb-6">
        {step.occurrence.ref}
        {step.occurrence.tractate ? ` · ${step.occurrence.tractate}` : ""}
      </p>

      <AnimatePresence mode="wait">
        {phase === "intro" && newWords[introIdx] && (
          <motion.div
            key={`intro-${introIdx}`}
            initial={{ opacity: 0, y: 24, rotate: -1 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="card max-w-md mx-auto p-10 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-ink/40 mb-6">
              New word {introIdx + 1} of {newWords.length}
            </p>
            <div dir="rtl" className="font-aramaic text-5xl mb-2">
              {newWords[introIdx].vowel}
            </div>
            <div
              className="h-1 w-16 mx-auto rounded-full mb-6"
              style={{ backgroundColor: newWords[introIdx].functionColor || "#d8cbb3" }}
            />
            <p className="text-2xl mb-3">{newWords[introIdx].gloss}</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest border ${
                newWords[introIdx].isFunction
                  ? "border-gold text-gold"
                  : "border-ink/20 text-ink/50"
              }`}
            >
              {newWords[introIdx].isFunction ? "Function word — the pattern" : "Content word — the case"}
            </span>
            <div className="mt-8">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={nextIntro}
                className="px-8 py-3 rounded-full bg-gold text-parchment font-semibold"
              >
                {introIdx < newWords.length - 1 ? "Next word" : "Into the sentence"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {phase === "sentence" && (
          <motion.div
            key="sentence"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="card p-8">
              <AramaicText
                words={toAramaicWords(step.words)}
                size="3xl"
                highlightIndices={skeletonIndices}
              />
              <div className="mt-8 pt-5 border-t border-gold/30">
                <p className="text-xs uppercase tracking-[0.25em] text-ink/40 mb-2">
                  The formula skeleton
                </p>
                <p dir="rtl" className="font-aramaic text-2xl text-gold">
                  {step.skeleton}
                </p>
                <p className="text-ink/55 mt-2 italic">
                  The gold words are the constant; the rest is just this case. Tap any word for its
                  pshat.
                </p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() =>
                step.exercises.length ? setPhase("exercises") : onComplete()
              }
              className="mt-8 px-8 py-3 rounded-full bg-gold text-parchment font-semibold text-lg"
            >
              Practice it
            </motion.button>
          </motion.div>
        )}

        {phase === "exercises" && step.exercises[exIdx] && (
          <motion.div
            key={`ex-${exIdx}`}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
          >
            <p className="text-sm text-ink/45 mb-4">
              Exercise {exIdx + 1} of {step.exercises.length}
            </p>
            <ExerciseSwitch step={step} index={exIdx} onDone={nextExercise} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExerciseSwitch({
  step,
  index,
  onDone,
}: {
  step: InsideAStep;
  index: number;
  onDone: () => void;
}) {
  const ex = step.exercises[index];
  switch (ex.type) {
    case "tapMatch":
      return <TapMatch exercise={ex} fallbackWords={step.words} onDone={onDone} />;
    case "reorder":
      return <Reorder exercise={ex} fallbackWords={step.words} onDone={onDone} />;
    case "fillFunction":
      return <FillFunction exercise={ex} fallbackWords={step.words} onDone={onDone} />;
    default:
      return (
        <div className="card p-6 text-ink/50 italic">
          Unknown exercise type — skipping.
          <button onClick={onDone} className="ml-3 text-gold underline">
            Continue
          </button>
        </div>
      );
  }
}
