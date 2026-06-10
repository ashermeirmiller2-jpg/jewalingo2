import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPairFlow } from "../api";
import { useApi } from "../hooks";
import { useStore } from "../store";
import ProgressDots from "../components/ProgressDots";
import { ErrorPane, Loading } from "../components/Status";
import ExplainerStepView from "../flow/ExplainerStepView";
import InsideAStepView from "../flow/InsideAStepView";
import LeinBStepView from "../flow/LeinBStepView";
import ContrastStepView from "../flow/ContrastStepView";

/** THE CORE P2 FLOW: one fetch of GET /pairs/:id/flow drives a 5-step wizard. */
export default function LearnPair() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const flowState = useStore((s) => s.flowStep);
  const setFlowStep = useStore((s) => s.setFlowStep);
  const refreshProgress = useStore((s) => s.refreshProgress);
  const { data, error, loading, retry } = useApi(() => getPairFlow(id), [id]);
  const [done, setDone] = useState(false);

  const steps = data?.steps ?? [];
  const requestedStep = params.get("step"); // e.g. ?step=contrast from /classes
  const stored = flowState[id] ?? 0;
  const [current, setCurrent] = useState(stored);

  useEffect(() => {
    if (!steps.length || !requestedStep) return;
    const idx = steps.findIndex((s) => s.kind === requestedStep);
    if (idx >= 0) setCurrent(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, requestedStep]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    setFlowStep(id, idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const advance = () => {
    if (current < steps.length - 1) goTo(current + 1);
    else {
      setDone(true);
      refreshProgress();
    }
  };

  if (loading) return <Loading label="Preparing the sugya…" />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!steps.length) return <ErrorPane error={null} retry={retry} />;

  if (done) return <Completion pairId={id} />;

  const step = steps[Math.min(current, steps.length - 1)];

  return (
    <div className="max-w-3xl mx-auto px-6 pb-32">
      <ProgressDots steps={steps.map((s) => s.kind)} current={current} onSelect={goTo} />
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -48 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
        >
          {(step.kind === "explainerA" || step.kind === "explainerB") && (
            <ExplainerStepView step={step} onComplete={advance} />
          )}
          {step.kind === "insideA" && <InsideAStepView step={step} onComplete={advance} />}
          {step.kind === "leinB" && <LeinBStepView step={step} pairId={id} onComplete={advance} />}
          {step.kind === "contrast" && <ContrastStepView step={step} onComplete={advance} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Completion({ pairId }: { pairId: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-xl mx-auto px-6 py-24 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
        className="text-6xl mb-6"
      >
        ✦
      </motion.div>
      <h1 className="text-4xl font-semibold mb-3">Pair complete</h1>
      <p className="text-ink/60 text-lg mb-10">
        You leined a passage you&apos;d never seen — the pattern carried you. It enters your review
        queue so it stays leinable.
      </p>
      <div className="flex justify-center gap-4 flex-wrap">
        <Link
          to="/browse"
          className="px-6 py-3 rounded-full bg-gold text-parchment font-semibold hover:brightness-105"
        >
          Next pair
        </Link>
        <Link
          to="/review"
          className="px-6 py-3 rounded-full border border-ink/20 hover:border-gold transition-colors"
        >
          Review queue
        </Link>
        <Link
          to={`/learn/pair/${pairId}`}
          onClick={() => window.location.assign(`/learn/pair/${pairId}`)}
          className="px-6 py-3 rounded-full border border-ink/20 hover:border-gold transition-colors"
        >
          Replay
        </Link>
      </div>
    </motion.div>
  );
}
