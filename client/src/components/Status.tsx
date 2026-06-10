import { motion } from "framer-motion";
import { ApiError, isCoverageError } from "../api";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-ink/60">
      <motion.div
        className="h-3 w-3 rounded-full bg-gold"
        animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
      />
      <p className="italic">{label}</p>
    </div>
  );
}

/** Friendly handling of the 70% coverage gate (403 { error: "coverage" }). */
export function CoverageNotice({ coverage }: { coverage: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card max-w-xl mx-auto my-16 p-8 text-center border-gold/40"
    >
      <p className="text-2xl mb-2">You need to know 70% of these words first — keep learning!</p>
      <p className="text-ink/60 mb-4">
        You currently know about {Math.round(coverage * 100)}% of the words in this text.
      </p>
      <div className="h-2 rounded-full bg-ink/10 overflow-hidden max-w-xs mx-auto">
        <motion.div
          className="h-full bg-gold"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.round(coverage * 100))}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <a href="/learn" className="inline-block mt-6 text-gold underline underline-offset-4">
        Back to learning the INSIDE
      </a>
    </motion.div>
  );
}

export function ErrorPane({ error, retry }: { error: unknown; retry?: () => void }) {
  if (isCoverageError(error)) return <CoverageNotice coverage={error.coverage} />;
  const message =
    error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-ink/70 text-lg italic">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="px-5 py-2 rounded-full border border-gold text-gold hover:bg-gold hover:text-parchment transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-center text-ink/50 italic py-24 text-lg">{message}</p>;
}
