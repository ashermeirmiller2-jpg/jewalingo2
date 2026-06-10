import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getNextMc, answerMc } from "../api";
import { useStore } from "../store";
import type { McNext, McQuestion, McAnswerResult } from "../types";
import AramaicText, { wordsFromApiText } from "../components/AramaicText";
import OptionButton, { type OptionState } from "../components/OptionButton";
import { ErrorPane, Loading } from "../components/Status";

export default function Quiz() {
  const refreshProgress = useStore((s) => s.refreshProgress);
  const [state, setState] = useState<McNext | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<McAnswerResult | null>(null);
  const [answered, setAnswered] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setChosen(null);
    setResult(null);
    setError(null);
    try {
      setState(await getNextMc());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const choose = async (q: McQuestion, optionId: string) => {
    if (chosen) return;
    setChosen(optionId);
    try {
      const r = await answerMc({ questionId: q.id, optionId });
      setResult(r);
      setAnswered((n) => n + 1);
      refreshProgress();
    } catch (e) {
      setError(e);
    }
  };

  if (loading) return <Loading label="Finding your next question…" />;
  if (error) return <ErrorPane error={error} retry={load} />;
  if (!state) return null;

  if ("done" in state && state.done) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <p className="text-5xl mb-4">✓</p>
        <h1 className="text-3xl mb-2">Done for now</h1>
        <p className="text-ink/60">
          {answered > 0
            ? `You worked through ${answered} question${answered === 1 ? "" : "s"}. Come back when more are due.`
            : "No questions are due right now — keep tagging the OUTSIDE."}
        </p>
      </div>
    );
  }

  const q = state as McQuestion;
  const stateFor = (optionId: string): OptionState => {
    if (!chosen || !result) return "idle";
    if (optionId === result.correctOptionId) return "correct";
    if (optionId === chosen) return "wrong";
    return "disabled";
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-gold uppercase tracking-[0.25em] text-xs mb-6">What happened here?</p>

      {q.spanText?.vowel && (
        <div className="card p-6 mb-6">
          <AramaicText words={wordsFromApiText(q.spanText.vowel)} size="2xl" showBars={false} />
        </div>
      )}

      <h1 className="text-2xl mb-6">{q.prompt}</h1>

      <div className="space-y-3">
        {q.options.map((o) => (
          <OptionButton key={o.id} state={stateFor(o.id)} onClick={() => choose(q, o.id)}>
            {o.text}
          </OptionButton>
        ))}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 flex items-center justify-between"
          >
            <p className={result.correct ? "text-emerald-700" : "text-ink/60"}>
              {result.correct ? "Correct — you read the move." : "Not quite — see the highlighted answer."}
            </p>
            <button
              onClick={load}
              className="px-6 py-2.5 rounded-full bg-gold text-parchment font-semibold"
            >
              Next →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
