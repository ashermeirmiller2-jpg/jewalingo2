import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Explainer, MindmapEdge, SlideLike } from "../types";

const VIDEO_ENABLED = import.meta.env.VITE_ENABLE_VIDEO === "true";

type Mode = "mindmap" | "slides" | "video";

interface NormSlide {
  title?: string;
  body: string;
}

function normalizeSlides(slides: SlideLike[] | null | undefined): NormSlide[] {
  if (!slides) return [];
  return slides.map((s) =>
    typeof s === "string" ? { body: s } : { title: s.title, body: s.body ?? s.text ?? "" },
  );
}

interface ScriptLine {
  text: string;
  slideIndex?: number;
  durationMs?: number;
}

function normalizeScript(script: Explainer["script"]): ScriptLine[] {
  if (!script) return [];
  if (typeof script === "string") {
    return script
      .split(/\n+/)
      .filter(Boolean)
      .map((text) => ({ text }));
  }
  return script.map((line) => (typeof line === "string" ? { text: line } : line));
}

const edgeFrom = (e: MindmapEdge) => e.fromId ?? e.from ?? e.source ?? "";
const edgeTo = (e: MindmapEdge) => e.toId ?? e.to ?? e.target ?? "";

/** Explainer for the OUTSIDE of a case: mind map / slides / (optional) video modes. */
export default function ExplainerViewer({ explainer }: { explainer: Explainer }) {
  const slides = useMemo(() => normalizeSlides(explainer.slides), [explainer]);
  const script = useMemo(() => normalizeScript(explainer.script), [explainer]);
  const hasMindmap = !!explainer.mindmap?.nodes?.length;
  const hasVideo = VIDEO_ENABLED && script.length > 0;

  const modes: Mode[] = [];
  if (hasMindmap) modes.push("mindmap");
  if (slides.length) modes.push("slides");
  if (hasVideo) modes.push("video");

  const [mode, setMode] = useState<Mode>(modes[0] ?? "slides");

  if (!modes.length) {
    return <p className="italic text-ink/50 py-12 text-center">This explainer has no content yet.</p>;
  }

  return (
    <div>
      <h2 className="text-3xl font-semibold mb-1">{explainer.title}</h2>
      <p className="text-ink/55 italic mb-4">The OUTSIDE — the shape of the argument, in English.</p>
      <div className="flex gap-2 mb-5">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-full border text-sm capitalize transition-colors ${
              mode === m
                ? "bg-ink text-parchment border-ink"
                : "border-ink/20 text-ink/60 hover:border-gold hover:text-ink"
            }`}
          >
            {m === "mindmap" ? "Mind map" : m}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {mode === "mindmap" && explainer.mindmap && <Mindmap mindmap={explainer.mindmap} />}
          {mode === "slides" && <Slides slides={slides} />}
          {mode === "video" && <VideoPlayback slides={slides} script={script} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------- Mind map: interactive SVG node graph ----------

function Mindmap({ mindmap }: { mindmap: NonNullable<Explainer["mindmap"]> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const nodes = mindmap.nodes ?? [];
  const edges = mindmap.edges ?? [];

  const { minX, minY, width, height } = useMemo(() => {
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs, 0) - 110;
    const minY = Math.min(...ys, 0) - 60;
    const maxX = Math.max(...xs, 100) + 110;
    const maxY = Math.max(...ys, 100) + 60;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, [nodes]);

  const pos = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const connected = useMemo(() => {
    if (!selected) return new Set<string>();
    const set = new Set<string>();
    edges.forEach((e) => {
      if (edgeFrom(e) === selected) set.add(edgeTo(e));
      if (edgeTo(e) === selected) set.add(edgeFrom(e));
    });
    return set;
  }, [selected, edges]);

  return (
    <div className="card overflow-hidden">
      <svg
        viewBox={`${minX} ${minY} ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: "26rem" }}
        onClick={() => setSelected(null)}
      >
        {edges.map((e, i) => {
          const a = pos.get(edgeFrom(e));
          const b = pos.get(edgeTo(e));
          if (!a || !b) return null;
          const hot = selected !== null && (edgeFrom(e) === selected || edgeTo(e) === selected);
          return (
            <g key={i}>
              <motion.line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={hot ? "#c9a227" : "#1e1208"}
                strokeOpacity={hot ? 0.95 : 0.22}
                strokeWidth={hot ? 2.5 : 1.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
              />
              {e.label && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 5}
                  textAnchor="middle"
                  className="fill-ink/50"
                  fontSize="11"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const active = selected === n.id;
          const linked = connected.has(n.id);
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className="cursor-pointer"
              onClick={(ev) => {
                ev.stopPropagation();
                setSelected(active ? null : n.id);
              }}
            >
              <rect
                x={-95}
                y={-30}
                width={190}
                height={60}
                rx={14}
                fill={active ? "#fdf9f0" : "#faf6ef"}
                stroke={active || linked ? "#c9a227" : "#1e1208"}
                strokeOpacity={active || linked ? 1 : 0.25}
                strokeWidth={active ? 2.5 : 1.5}
              />
              <foreignObject x={-90} y={-26} width={180} height={52}>
                <div className="h-full flex items-center justify-center text-center text-[12px] leading-snug font-garamond text-ink px-1">
                  {n.label}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
      <AnimatePresence>
        {selected && pos.get(selected)?.detail && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gold/40 px-6 py-4 text-ink/75 italic"
          >
            {pos.get(selected)!.detail}
          </motion.p>
        )}
      </AnimatePresence>
      <p className="px-6 pb-3 pt-2 text-xs text-ink/40">Click a node to highlight its connections.</p>
    </div>
  );
}

// ---------- Slides ----------

function Slides({ slides }: { slides: NormSlide[] }) {
  const [idx, setIdx] = useState(0);
  const [dirn, setDirn] = useState(1);
  const go = (d: number) => {
    setDirn(d);
    setIdx((i) => Math.max(0, Math.min(slides.length - 1, i + d)));
  };
  if (!slides.length) return null;
  const slide = slides[idx];
  return (
    <div className="card p-8 min-h-[16rem] relative overflow-hidden flex flex-col">
      <AnimatePresence mode="wait" custom={dirn}>
        <motion.div
          key={idx}
          custom={dirn}
          initial={{ opacity: 0, x: dirn * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dirn * -60 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex-1"
        >
          {slide.title && <h3 className="text-2xl font-semibold mb-3 text-gold">{slide.title}</h3>}
          <p className="text-xl leading-relaxed whitespace-pre-line">{slide.body}</p>
        </motion.div>
      </AnimatePresence>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-ink/10">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="px-4 py-1.5 rounded-full border border-ink/20 disabled:opacity-30 hover:border-gold transition-colors"
        >
          ← Prev
        </button>
        <span className="text-sm text-ink/50">
          {idx + 1} / {slides.length}
        </span>
        <button
          onClick={() => go(1)}
          disabled={idx === slides.length - 1}
          className="px-4 py-1.5 rounded-full border border-ink/20 disabled:opacity-30 hover:border-gold transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ---------- "Video": narrated slide playback with captions ----------

function VideoPlayback({ slides, script }: { slides: NormSlide[]; script: ScriptLine[] }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<number | null>(null);
  const line = script[lineIdx];
  const slide =
    slides.length === 0
      ? null
      : slides[
          line?.slideIndex !== undefined
            ? Math.min(line.slideIndex, slides.length - 1)
            : Math.min(Math.floor((lineIdx / script.length) * slides.length), slides.length - 1)
        ];

  useEffect(() => {
    if (!playing) return;
    const ms = line?.durationMs ?? Math.max(2600, (line?.text.length ?? 0) * 55);
    timer.current = window.setTimeout(() => {
      setLineIdx((i) => {
        if (i >= script.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [lineIdx, playing, line, script.length]);

  return (
    <div className="card overflow-hidden">
      <div className="bg-ink/95 text-parchment min-h-[14rem] p-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide?.body ?? lineIdx}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            {slide?.title && <h3 className="text-gold text-2xl mb-3">{slide.title}</h3>}
            <p className="text-xl leading-relaxed max-w-xl">{slide?.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="px-6 py-4 border-t border-gold/40 flex items-center gap-4">
        <button
          onClick={() => {
            if (!playing && lineIdx >= script.length - 1) setLineIdx(0);
            setPlaying((p) => !p);
          }}
          className="shrink-0 h-10 w-10 rounded-full bg-gold text-parchment text-lg"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <AnimatePresence mode="wait">
          <motion.p
            key={lineIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="italic text-ink/80 flex-1"
          >
            {line?.text}
          </motion.p>
        </AnimatePresence>
        <span className="text-xs text-ink/40 shrink-0">
          {lineIdx + 1}/{script.length}
        </span>
      </div>
    </div>
  );
}
