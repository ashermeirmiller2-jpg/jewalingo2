import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useStore } from "../../store";

/**
 * Admin shell — the human-in-the-loop that flips `verified`. Load-bearing, not
 * optional: nothing a model produced reaches a learner until verified here.
 */
export default function AdminLayout() {
  const adminKey = useStore((s) => s.adminKey);
  const setAdminKey = useStore((s) => s.setAdminKey);
  const [draft, setDraft] = useState("");

  if (!adminKey) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <h1 className="text-3xl mb-2">Verification console</h1>
        <p className="text-ink/60 mb-6">
          The AI proposes; a human disposes. Enter the admin key to review candidates.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) setAdminKey(draft.trim());
          }}
          className="flex gap-2"
        >
          <input
            type="password"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="ADMIN_KEY"
            className="flex-1 card p-3 focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
          <button className="px-5 rounded-xl bg-gold text-parchment font-semibold">Enter</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 p-1 bg-ink/5 rounded-full">
          {[
            ["/admin/pairs", "Pairs (P2)"],
            ["/admin/sugyot", "Sugyot (P4)"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-1.5 rounded-full text-sm transition-colors ${
                  isActive ? "bg-gold text-parchment" : "text-ink/60 hover:text-ink"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <button
          onClick={() => setAdminKey(null)}
          className="text-sm text-ink/50 hover:text-ink"
        >
          lock console
        </button>
      </div>
      <Outlet />
    </div>
  );
}
