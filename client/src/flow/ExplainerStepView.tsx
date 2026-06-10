import { motion } from "framer-motion";
import type { ExplainerStep } from "../types";
import ExplainerViewer from "../components/ExplainerViewer";

export default function ExplainerStepView({
  step,
  onComplete,
}: {
  step: ExplainerStep;
  onComplete: () => void;
}) {
  const isB = step.kind === "explainerB";
  return (
    <div>
      <p className="text-gold uppercase tracking-[0.25em] text-xs mb-2">
        {isB ? "Case B · the outside" : "Case A · the outside"}
      </p>
      <ExplainerViewer explainer={step.explainer} />
      {isB && (
        <p className="mt-4 text-ink/55 italic">
          No Aramaic yet — first hold the shape of this argument. The INSIDE comes next, and you
          will lein it yourself.
        </p>
      )}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
        className="mt-8 px-8 py-3 rounded-full bg-gold text-parchment font-semibold text-lg shadow-card hover:brightness-105"
      >
        {isB ? "I'm ready to lein it" : "Got the shape — show me the INSIDE"}
      </motion.button>
    </div>
  );
}
