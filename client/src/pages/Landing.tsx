import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, getPairs } from "../api";
import { useStore } from "../store";

/**
 * Minimal hero. One gold CTA: creates the anon session, grabs the first
 * verified pair, and drops the learner straight into the flow. No signup,
 * no onboarding — start-to-learning under 90 seconds.
 */
export default function Landing() {
  const navigate = useNavigate();
  const bootSession = useStore((s) => s.bootSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      await bootSession();
      const pairs = await getPairs();
      if (!pairs.length) {
        setError("No lessons are live yet — check back soon.");
        setBusy(false);
        return;
      }
      navigate(`/learn/pair/${pairs[0].id}`);
    } catch {
      setError("Couldn't reach the server. Is it running on port 4000?");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="uppercase tracking-[0.35em] text-gold text-sm mb-6"
      >
        Jewoulingo
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="text-5xl md:text-7xl font-semibold max-w-3xl leading-tight"
      >
        Learn to lein the Talmud
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-6 text-xl text-ink/60 max-w-xl"
      >
        Decode the INSIDE word by word. Master the OUTSIDE move by move.
        One sugya at a time — no signup, no quiz, just learning.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        onClick={start}
        disabled={busy}
        className="mt-10 px-10 py-4 rounded-full bg-gold text-parchment text-xl font-semibold shadow-card hover:brightness-105 disabled:opacity-60 transition-all"
      >
        {busy ? "Opening the daf…" : "Start learning"}
      </motion.button>
      {error && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-red-700 italic">
          {error}
        </motion.p>
      )}
    </div>
  );
}
