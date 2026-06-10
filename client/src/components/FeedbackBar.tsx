import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export type FeedbackVariant = "correct" | "partial" | "incorrect";

const variants: Record<FeedbackVariant, { bg: string; label: string }> = {
  correct: { bg: "bg-green-700", label: "Correct!" },
  partial: { bg: "bg-gold", label: "Almost — partial credit" },
  incorrect: { bg: "bg-red-700", label: "Not quite" },
};

/** Duolingo-style bottom feedback bar with a Continue action. */
export default function FeedbackBar({
  open,
  variant = "correct",
  title,
  detail,
  actionLabel = "Continue",
  onAction,
}: {
  open: boolean;
  variant?: FeedbackVariant;
  title?: string;
  detail?: ReactNode;
  actionLabel?: string;
  onAction: () => void;
}) {
  const v = variants[variant];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 360, damping: 32 }}
          className={`fixed bottom-0 inset-x-0 z-40 ${v.bg} text-parchment shadow-[0_-4px_24px_rgba(30,18,8,0.25)]`}
        >
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-6">
            <div className="flex-1 min-w-0">
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl font-semibold"
              >
                {title ?? v.label}
              </motion.p>
              {detail && <div className="text-parchment/85 mt-1 text-sm">{detail}</div>}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAction}
              className="shrink-0 px-6 py-2.5 rounded-full bg-parchment text-ink font-semibold hover:bg-white transition-colors"
            >
              {actionLabel}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
