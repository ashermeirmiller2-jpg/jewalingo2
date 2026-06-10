import { motion } from "framer-motion";

const STEP_LABELS: Record<string, string> = {
  explainerA: "Case A — outside",
  insideA: "Case A — inside",
  explainerB: "Case B — outside",
  leinB: "Lein it!",
  contrast: "Contrast",
};

export default function ProgressDots({
  steps,
  current,
  onSelect,
}: {
  steps: string[];
  current: number;
  onSelect?: (index: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-4" role="tablist">
      {steps.map((kind, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <button
            key={i}
            title={STEP_LABELS[kind] ?? kind}
            onClick={() => onSelect && i <= current && onSelect(i)}
            className="group relative flex items-center"
          >
            <motion.span
              animate={{
                scale: active ? 1.35 : 1,
                backgroundColor: active ? "#c9a227" : done ? "#1e1208" : "#d8cbb3",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="block h-2.5 w-2.5 rounded-full"
            />
            <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-ink/60 opacity-0 group-hover:opacity-100 transition-opacity">
              {STEP_LABELS[kind] ?? kind}
            </span>
          </button>
        );
      })}
    </div>
  );
}
