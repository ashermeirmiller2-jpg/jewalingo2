import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { getVisual, checkVisual } from "../api";
import { useApi } from "../hooks";
import type { VisualEdge, VisualNode, VisualCheckResult } from "../types";
import { ErrorPane, Loading } from "../components/Status";

interface Placed extends VisualNode {
  x: number;
  y: number;
}

/**
 * Visual reasoning builder (4.6): reconstruct the sugya's logic by placing
 * nodes and drawing relation edges, then check against the verified graph.
 * Framed as the off-ramp toward leining the OUTSIDE with no aid.
 */
export default function VisualBuilder() {
  const { sugyaId = "" } = useParams();
  const { data, error, loading, retry } = useApi(() => getVisual(sugyaId), [sugyaId]);

  if (loading) return <Loading />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!data) return null;

  return <Canvas sugyaId={sugyaId} nodes={data.nodes} relations={data.relations} />;
}

function Canvas({
  sugyaId,
  nodes,
  relations,
}: {
  sugyaId: string;
  nodes: VisualNode[];
  relations: string[];
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [placed] = useState<Placed[]>(() =>
    nodes.map((n, i) => ({
      ...n,
      x: 40 + (i % 2) * 320,
      y: 30 + Math.floor(i / 2) * 130,
    })),
  );
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(placed.map((p) => [p.id, { x: p.x, y: p.y }])),
  );
  const [edges, setEdges] = useState<VisualEdge[]>([]);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [result, setResult] = useState<VisualCheckResult | null>(null);

  const nodeById = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);

  const clickNode = (id: string) => {
    if (!linkFrom) {
      setLinkFrom(id);
    } else if (linkFrom === id) {
      setLinkFrom(null);
    } else {
      setPendingTo(id); // open relation picker
    }
  };

  const addEdge = (relation: string) => {
    if (linkFrom && pendingTo) {
      setEdges((e) => [...e, { fromId: linkFrom, toId: pendingTo, relation }]);
    }
    setLinkFrom(null);
    setPendingTo(null);
  };

  const check = async () => {
    try {
      setResult(await checkVisual({ sugyaId, edges }));
    } catch {
      /* ignore — surfaced by absence of result */
    }
  };

  const center = (id: string) => {
    const p = positions[id];
    return { x: p.x + 110, y: p.y + 32 };
  };

  const edgeStatus = (e: VisualEdge): "ok" | "wrong" => {
    if (!result) return "ok";
    return result.wrong.some(
      (w) => w.fromId === e.fromId && w.toId === e.toId && w.relation === e.relation,
    )
      ? "wrong"
      : "ok";
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Link to={`/outside/${sugyaId}`} className="text-gold text-sm hover:underline">
        ← Back to the flowchart
      </Link>
      <h1 className="text-3xl mt-4 mb-1">Rebuild the logic</h1>
      <p className="text-ink/60 mb-6">
        Drag the moves into the order you think they argue, then connect them: tap one node, tap
        another, pick the relation. This is the off-ramp — soon you'll see this shape without any aid.
      </p>

      <div
        ref={boardRef}
        className="relative card h-[460px] overflow-hidden mb-4"
        style={{ touchAction: "none" }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {edges.map((e, i) => {
            const a = center(e.fromId);
            const b = center(e.toId);
            const wrong = edgeStatus(e) === "wrong";
            return (
              <g key={i}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={wrong ? "#dc2626" : "#c9a227"}
                  strokeWidth={2}
                  strokeDasharray={wrong ? "6 4" : undefined}
                />
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 4}
                  fill={wrong ? "#dc2626" : "#1e1208"}
                  fontSize={11}
                  textAnchor="middle"
                  className="font-garamond"
                >
                  {e.relation}
                </text>
              </g>
            );
          })}
          {result?.missing.map((e, i) => {
            const a = center(e.fromId);
            const b = center(e.toId);
            return (
              <line
                key={`m${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#c9a227"
                strokeWidth={2}
                strokeDasharray="2 6"
                opacity={0.6}
              />
            );
          })}
        </svg>

        {placed.map((n) => (
          <motion.button
            key={n.id}
            drag
            dragConstraints={boardRef}
            dragMomentum={false}
            onDrag={(_, info) =>
              setPositions((p) => ({
                ...p,
                [n.id]: { x: p[n.id].x + info.delta.x, y: p[n.id].y + info.delta.y },
              }))
            }
            onClick={() => clickNode(n.id)}
            initial={false}
            animate={{ x: positions[n.id].x, y: positions[n.id].y }}
            transition={{ type: "tween", duration: 0 }}
            style={{ position: "absolute", left: 0, top: 0, width: 220 }}
            className={`text-left p-3 rounded-lg border-2 bg-white/80 cursor-grab active:cursor-grabbing ${
              linkFrom === n.id ? "border-gold ring-2 ring-gold/40" : "border-ink/15"
            }`}
          >
            <span className="text-[10px] uppercase tracking-widest text-ink/40">
              {n.moveTypeName}
            </span>
            <p className="text-sm leading-snug">{n.englishGloss}</p>
          </motion.button>
        ))}

        {pendingTo && (
          <div className="absolute inset-0 bg-ink/30 flex items-center justify-center z-10">
            <div className="card p-5 bg-parchment">
              <p className="text-sm text-ink/60 mb-3">How does it relate?</p>
              <div className="flex flex-wrap gap-2 max-w-sm">
                {relations.map((r) => (
                  <button
                    key={r}
                    onClick={() => addEdge(r)}
                    className="px-3 py-1.5 rounded-full border border-gold text-gold text-sm hover:bg-gold hover:text-parchment"
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setPendingTo(null);
                    setLinkFrom(null);
                  }}
                  className="px-3 py-1.5 text-ink/40 text-sm"
                >
                  cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={check}
          disabled={!edges.length}
          className="px-6 py-2.5 rounded-full bg-gold text-parchment font-semibold disabled:opacity-40"
        >
          Check against the verified logic
        </button>
        {edges.length > 0 && (
          <button onClick={() => setEdges([])} className="text-ink/50 text-sm hover:text-ink">
            clear edges
          </button>
        )}
        {result && (
          <span className="text-lg">
            Score: <span className="font-semibold text-gold">{Math.round(result.score * 100)}%</span>
            {result.missing.length > 0 && (
              <span className="text-ink/50 text-sm ml-2">
                ({result.missing.length} connection{result.missing.length === 1 ? "" : "s"} missing — dotted gold)
              </span>
            )}
          </span>
        )}
      </div>
      <p className="text-xs text-ink/40 mt-3">
        Nodes you haven't connected: {nodeById.size - new Set(edges.flatMap((e) => [e.fromId, e.toId])).size}
      </p>
    </div>
  );
}
