import { motion } from "framer-motion";
import type { ReactNode } from "react";

export type OptionState = "idle" | "selected" | "correct" | "wrong" | "disabled";

const stateClasses: Record<OptionState, string> = {
  idle: "border-ink/15 bg-white/50 hover:border-gold hover:bg-gold/5",
  selected: "border-gold bg-gold/10",
  correct: "border-green-600 bg-green-50 text-green-800",
  wrong: "border-red-500 bg-red-50 text-red-700",
  disabled: "border-ink/10 bg-white/30 opacity-50 cursor-not-allowed",
};

export default function OptionButton({
  children,
  state = "idle",
  onClick,
  className = "",
  dir,
}: {
  children: ReactNode;
  state?: OptionState;
  onClick?: () => void;
  className?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <motion.button
      type="button"
      dir={dir}
      whileTap={state === "idle" || state === "selected" ? { scale: 0.97 } : undefined}
      animate={
        state === "wrong"
          ? { x: [0, -6, 6, -4, 4, 0] }
          : state === "correct"
            ? { scale: [1, 1.04, 1] }
            : {}
      }
      transition={{ duration: 0.35 }}
      onClick={state === "disabled" ? undefined : onClick}
      disabled={state === "disabled"}
      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors text-lg ${stateClasses[state]} ${className}`}
    >
      {children}
    </motion.button>
  );
}
