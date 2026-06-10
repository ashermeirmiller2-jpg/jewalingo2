import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getPairs } from "../api";
import { useApi } from "../hooks";
import { ErrorPane, Loading, EmptyState } from "../components/Status";

const FORMULA_CATEGORIES = [
  "ACQUISITION",
  "CONDITIONAL",
  "PRESUMPTION",
  "INFERENCE",
  "OBJECTION",
  "AGENCY",
  "COMPARISON",
];

export default function Browse() {
  const [category, setCategory] = useState<string | undefined>(undefined);
  const { data, error, loading, retry } = useApi(() => getPairs(category), [category]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl mb-2">Browse the pairs</h1>
      <p className="text-ink/60 mb-8">
        Every pair shares one formula across two distant cases. Master one, lein the other.
      </p>

      <div className="flex flex-wrap gap-2 mb-8">
        <Chip active={!category} onClick={() => setCategory(undefined)}>
          All
        </Chip>
        {FORMULA_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c.toLowerCase()}
          </Chip>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorPane error={error} retry={retry} />
      ) : !data?.length ? (
        <EmptyState message="No verified pairs in this category yet." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {data.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link to={`/learn/pair/${p.id}`} className="card block p-6 hover:border-gold/50 transition-colors h-full">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-xs uppercase tracking-widest text-gold">
                    {p.formulaA.category?.toLowerCase()}
                  </span>
                  {p.outcomeContrast && (
                    <span title="Same formula, opposite outcome" className="text-gold">
                      ★ outcome contrast
                    </span>
                  )}
                </div>
                <p dir="rtl" className="font-aramaic text-2xl text-gold mb-2">
                  {p.formulaA.skeleton}
                </p>
                <p className="text-ink/70 mb-4">{p.formulaA.gloss}</p>
                <div className="flex items-center gap-2 text-sm text-ink/55">
                  <span>{p.caseA.tractate}</span>
                  <span className="text-gold">⇄</span>
                  <span>{p.caseB.tractate}</span>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-gold/15 border border-gold/40 text-ink">
                    {p.distanceDaf} daf apart
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm border transition-colors capitalize ${
        active
          ? "bg-gold text-parchment border-gold"
          : "border-ink/15 text-ink/60 hover:border-gold"
      }`}
    >
      {children}
    </button>
  );
}
