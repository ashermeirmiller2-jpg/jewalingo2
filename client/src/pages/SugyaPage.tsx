import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getSugyaGraph, getSugyaInside, getSugyaLinks, isCoverageError } from "../api";
import { useApi } from "../hooks";
import type { InsideText, SugyaNode } from "../types";
import FlowchartGraph from "../components/FlowchartGraph";
import AramaicText, { wordsFromApiText } from "../components/AramaicText";
import { ErrorPane, Loading } from "../components/Status";

type Tab = "flow" | "connections";

export default function SugyaPage() {
  const { id = "" } = useParams();
  const graph = useApi(() => getSugyaGraph(id), [id]);
  const [tab, setTab] = useState<Tab>("flow");
  const [selected, setSelected] = useState<SugyaNode | null>(null);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Link to="/outside" className="text-gold text-sm hover:underline">
        ← The Outside
      </Link>

      <div className="flex gap-1 my-5 p-1 bg-ink/5 rounded-full w-fit">
        {([
          ["flow", "Argument flowchart"],
          ["connections", "Connections"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              tab === key ? "bg-gold text-parchment" : "text-ink/60 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {graph.loading ? (
        <Loading />
      ) : graph.error ? (
        <ErrorPane error={graph.error} retry={graph.retry} />
      ) : tab === "flow" && graph.data ? (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          <div className="card p-4 overflow-auto">
            <FlowchartGraph
              graph={graph.data}
              selectedId={selected?.id}
              onNodeClick={(n) => setSelected(n)}
            />
          </div>
          <NodePanel sugyaId={id} node={selected} />
        </div>
      ) : (
        <Connections sugyaId={id} />
      )}

      {graph.data && (
        <div className="mt-8 text-center">
          <Link
            to={`/visual/${id}`}
            className="inline-block px-6 py-3 rounded-full border border-gold text-gold hover:bg-gold hover:text-parchment transition-colors"
          >
            Rebuild this logic yourself →
          </Link>
        </div>
      )}
    </div>
  );
}

function NodePanel({ sugyaId, node }: { sugyaId: string; node: SugyaNode | null }) {
  const [inside, setInside] = useState<InsideText | null>(null);
  const [insideErr, setInsideErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!node) {
    return (
      <div className="card p-6 text-ink/50 italic self-start">
        Click a move in the flowchart to see what it does — and to reveal its Aramaic.
      </div>
    );
  }

  const showInside = async () => {
    setLoading(true);
    setInsideErr(null);
    setInside(null);
    try {
      const text = await getSugyaInside(sugyaId, node.id);
      setInside(text);
    } catch (e) {
      if (isCoverageError(e)) {
        setInsideErr(
          `You need to know 70% of these words first — keep learning! (you know ~${Math.round(
            e.coverage * 100,
          )}%)`,
        );
      } else {
        setInsideErr("Couldn't load the text.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        className="card p-6 self-start"
      >
        <span
          className="inline-block px-3 py-1 rounded-full text-xs uppercase tracking-widest text-parchment mb-3"
          style={{ backgroundColor: node.moveType.color || "#c9a227" }}
        >
          {node.moveType.name}
        </span>
        <p className="text-lg mb-4">{node.englishGloss}</p>
        {node.moveType.soWhat && (
          <div className="border-l-2 border-gold pl-3 mb-5">
            <p className="text-xs uppercase tracking-widest text-gold mb-1">So what?</p>
            <p className="text-ink/70 text-sm">{node.moveType.soWhat}</p>
          </div>
        )}

        {!inside && !insideErr && (
          <button
            onClick={showInside}
            disabled={loading}
            className="px-4 py-2 rounded-full bg-gold text-parchment text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Loading…" : "Show the INSIDE"}
          </button>
        )}
        {insideErr && <p className="text-sm text-ink/60 italic">{insideErr}</p>}
        {inside && (
          <div className="mt-2 pt-4 border-t border-gold/30">
            <AramaicText words={wordsFromApiText(inside.vowel)} size="2xl" showBars={false} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

function Connections({ sugyaId }: { sugyaId: string }) {
  const { data, error, loading, retry } = useApi(() => getSugyaLinks(sugyaId), [sugyaId]);
  if (loading) return <Loading />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!data?.length)
    return (
      <p className="text-ink/50 italic py-12 text-center">
        No verified logic-connections yet. (These link sugyot that share a move pattern.)
      </p>
    );
  return (
    <div className="space-y-3">
      <p className="text-ink/60 mb-4">
        Sugyot whose argument follows the same move-pattern as this one:
      </p>
      {data.map((l, i) => (
        <Link
          key={i}
          to={`/outside/${l.toSugya.id}`}
          className="card flex items-center justify-between p-5 hover:border-gold/50 transition-colors"
        >
          <div>
            <p>{l.toSugya.title}</p>
            <p className="text-sm text-ink/50">{l.toSugya.ref}</p>
          </div>
          <code className="text-xs text-gold bg-gold/10 px-2 py-1 rounded">{l.pattern}</code>
        </Link>
      ))}
    </div>
  );
}
