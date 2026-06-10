import { motion } from "framer-motion";
import { useMemo } from "react";
import type { SugyaGraph, SugyaNode } from "../types";

const NODE_W = 240;
const NODE_H = 64;
const GAP_Y = 56;
const FALLBACK_COLOR = "#8a7350";

/**
 * Argument flowchart for a sugya: simple layered top-down layout by node.order,
 * SVG arrow edges labeled with their relation, node color = moveType.color.
 */
export default function FlowchartGraph({
  graph,
  selectedId,
  onNodeClick,
  compact = false,
}: {
  graph: SugyaGraph;
  selectedId?: string | null;
  onNodeClick?: (node: SugyaNode) => void;
  compact?: boolean;
}) {
  const nodes = useMemo(
    () => [...(graph.nodes ?? [])].sort((a, b) => a.order - b.order),
    [graph],
  );
  const scale = compact ? 0.72 : 1;
  const w = NODE_W * scale;
  const h = NODE_H * scale;
  const gap = GAP_Y * scale;

  // Layered layout: one layer per order value; nodes sharing an order sit side by side.
  const layout = useMemo(() => {
    const layers = new Map<number, SugyaNode[]>();
    nodes.forEach((n) => {
      const arr = layers.get(n.order) ?? [];
      arr.push(n);
      layers.set(n.order, arr);
    });
    const orders = [...layers.keys()].sort((a, b) => a - b);
    const maxPerLayer = Math.max(1, ...orders.map((o) => layers.get(o)!.length));
    const width = Math.max(maxPerLayer * (w + 32) + 64, w + 160);
    const pos = new Map<string, { x: number; y: number }>();
    orders.forEach((o, li) => {
      const row = layers.get(o)!;
      row.forEach((n, ci) => {
        const rowWidth = row.length * (w + 32) - 32;
        pos.set(n.id, {
          x: width / 2 - rowWidth / 2 + ci * (w + 32) + w / 2,
          y: 32 + li * (h + gap) + h / 2,
        });
      });
    });
    const height = 64 + orders.length * (h + gap) - gap;
    return { pos, width, height };
  }, [nodes, w, h, gap]);

  if (!nodes.length) {
    return <p className="italic text-ink/50 text-center py-12">No moves in this sugya yet.</p>;
  }

  return (
    <div className="overflow-auto">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        className="mx-auto block max-w-full"
      >
        <defs>
          <marker id="arrowhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
            <polygon points="0 0, 9 3.5, 0 7" fill="#1e1208" fillOpacity="0.55" />
          </marker>
        </defs>
        {(graph.edges ?? []).map((e, i) => {
          const a = layout.pos.get(e.fromId);
          const b = layout.pos.get(e.toId);
          if (!a || !b) return null;
          const downward = b.y > a.y;
          const x1 = a.x;
          const y1 = a.y + (downward ? h / 2 : -h / 2);
          const x2 = b.x;
          const y2 = b.y + (downward ? -h / 2 - 6 : h / 2 + 6);
          const adjacent = Math.abs(y2 - y1) <= h + gap;
          const midX = adjacent ? (x1 + x2) / 2 : Math.max(x1, x2) + w / 2 + 28;
          const path = adjacent
            ? `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`
            : `M ${x1} ${y1} C ${midX} ${y1 + 30}, ${midX} ${y2 - 30}, ${x2} ${y2}`;
          return (
            <g key={i}>
              <motion.path
                d={path}
                fill="none"
                stroke="#1e1208"
                strokeOpacity={0.45}
                strokeWidth={1.6}
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: i * 0.06 }}
              />
              <text
                x={adjacent ? (x1 + x2) / 2 + 8 : midX + 6}
                y={(y1 + y2) / 2}
                fontSize={compact ? 10 : 12}
                className="fill-gold"
                fontStyle="italic"
              >
                {e.relation}
              </text>
            </g>
          );
        })}
        {nodes.map((n, i) => {
          const p = layout.pos.get(n.id)!;
          const color = n.moveType?.color || FALLBACK_COLOR;
          const selected = selectedId === n.id;
          return (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={onNodeClick ? "cursor-pointer" : undefined}
              onClick={() => onNodeClick?.(n)}
            >
              <rect
                x={p.x - w / 2}
                y={p.y - h / 2}
                width={w}
                height={h}
                rx={12}
                fill="#faf6ef"
                stroke={selected ? "#c9a227" : color}
                strokeWidth={selected ? 3 : 2}
              />
              <rect x={p.x - w / 2} y={p.y - h / 2} width={8} height={h} rx={4} fill={color} />
              <foreignObject x={p.x - w / 2 + 12} y={p.y - h / 2 + 4} width={w - 20} height={h - 8}>
                <div className="h-full flex flex-col justify-center font-garamond">
                  <span
                    className="text-[10px] uppercase tracking-widest font-semibold"
                    style={{ color }}
                  >
                    {n.moveType?.name}
                  </span>
                  <span
                    className={`text-ink leading-tight ${compact ? "text-[11px]" : "text-[13px]"}`}
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.englishGloss}
                  </span>
                </div>
              </foreignObject>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
