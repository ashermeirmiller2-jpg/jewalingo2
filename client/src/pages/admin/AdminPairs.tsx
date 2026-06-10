import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  adminGetPairs,
  adminVerifyPair,
  adminGenerateExplainers,
} from "../../api";
import { useApi } from "../../hooks";
import type { AdminPairCandidate, Occurrence } from "../../types";
import AramaicText, { wordsFromApiText } from "../../components/AramaicText";
import { ErrorPane, Loading, EmptyState } from "../../components/Status";

export default function AdminPairs() {
  const { data, error, loading, retry } = useApi(() => adminGetPairs(false), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn();
      retry();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!data?.length) return <EmptyState message="No unverified candidate pairs. The queue is clean." />;

  return (
    <div>
      <h1 className="text-3xl mb-1">Candidate pairs</h1>
      <p className="text-ink/55 mb-6">
        {data.length} awaiting verification. Confirm only what is human-checkable and correct.
      </p>
      <div className="space-y-4">
        {data.map((p) => {
          const skeleton = p.formulaA?.skeleton ?? p.formula?.skeleton ?? p.skeleton ?? "";
          const occs = evidenceOccurrences(p);
          return (
            <div key={p.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {p.outcomeContrast && <span className="text-gold text-sm">★ outcome contrast</span>}
                    {typeof p.confidence === "number" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 text-ink/60">
                        confidence {(p.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {typeof p.distanceDaf === "number" && (
                      <span className="text-xs text-ink/50">{p.distanceDaf} daf apart</span>
                    )}
                  </div>
                  <p dir="rtl" className="font-aramaic text-2xl text-gold">
                    {skeleton}
                  </p>
                  <p className="text-sm text-ink/55 mt-1">
                    {refOf(p, "A")} ⇄ {refOf(p, "B")}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(() => adminVerifyPair(p.id, true), p.id)}
                    className="px-4 py-1.5 rounded-full bg-gold text-parchment text-sm font-medium disabled:opacity-50"
                  >
                    Verify
                  </button>
                  <button
                    disabled={busy === p.id}
                    onClick={() => act(() => adminVerifyPair(p.id, false), p.id)}
                    className="px-4 py-1.5 rounded-full border border-ink/20 text-ink/60 text-sm hover:border-red-400 hover:text-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>

              <div className="flex gap-4 mt-3 text-sm">
                <button
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  className="text-gold hover:underline"
                >
                  {expanded === p.id ? "Hide evidence" : "Show evidence"}
                </button>
                <button
                  disabled={busy === p.id}
                  onClick={() => act(() => adminGenerateExplainers(p.id), p.id)}
                  className="text-ink/55 hover:text-ink"
                >
                  Generate explainers
                </button>
              </div>

              <AnimatePresence>
                {expanded === p.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-ink/10 space-y-4">
                      {p.contrastNotes && (
                        <p className="text-sm text-ink/65 italic">{p.contrastNotes}</p>
                      )}
                      {occs.map((o, i) => (
                        <div key={i}>
                          <p className="text-xs text-ink/45 mb-1">{o.ref}</p>
                          <AramaicText
                            words={wordsFromApiText(o.textVowel)}
                            size="2xl"
                            showBars={false}
                          />
                        </div>
                      ))}
                      {!occs.length && (
                        <p className="text-sm text-ink/40 italic">No occurrence text in this candidate.</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function refOf(p: AdminPairCandidate, side: "A" | "B"): string {
  if (side === "A") return p.caseA?.ref ?? p.caseARef ?? "?";
  return p.caseB?.ref ?? p.caseBRef ?? "?";
}

function evidenceOccurrences(p: AdminPairCandidate): Occurrence[] {
  if (p.evidence?.occurrences?.length) return p.evidence.occurrences;
  if (p.occurrences?.length) return p.occurrences;
  // server returns caseA/caseB as full occurrences on the admin route
  const out: Occurrence[] = [];
  const a = p.caseA as unknown as Occurrence | undefined;
  const b = p.caseB as unknown as Occurrence | undefined;
  if (a && (a as Occurrence).textVowel) out.push(a);
  if (b && (b as Occurrence).textVowel) out.push(b);
  return out;
}
