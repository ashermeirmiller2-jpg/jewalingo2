import { useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { useStore } from "../store";

const links = [
  { to: "/learn", label: "Learn" },
  { to: "/browse", label: "Browse" },
  { to: "/outside", label: "The Outside" },
  { to: "/classes", label: "Classes" },
  { to: "/quiz", label: "Quiz" },
  { to: "/review", label: "Review" },
];

export default function NavBar() {
  const progress = useStore((s) => s.progress);
  const refreshProgress = useStore((s) => s.refreshProgress);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  return (
    <header className="sticky top-0 z-30 bg-parchment/95 backdrop-blur border-b border-gold/60">
      <nav className="max-w-6xl mx-auto px-6 flex items-center gap-1 h-14 overflow-x-auto">
        <Link to="/" className="font-semibold text-xl tracking-wide mr-4 shrink-0">
          Jewou<span className="text-gold">lingo</span>
        </Link>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `px-3 py-1.5 text-base whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-gold text-ink"
                  : "border-transparent text-ink/60 hover:text-ink hover:border-gold/40"
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
        <div className="flex-1" />
        {progress && (
          <div className="flex items-center gap-4 shrink-0 text-sm">
            <span title={`${progress.streakDays}-day streak`} className="flex items-center gap-1">
              <span aria-hidden className="text-lg">🔥</span>
              <span className="font-semibold">{progress.streakDays}</span>
            </span>
            <span
              title="Words you know"
              className="px-2.5 py-0.5 rounded-full bg-gold/15 border border-gold/50 text-ink font-medium"
            >
              {progress.knownWordCount} words
            </span>
          </div>
        )}
      </nav>
    </header>
  );
}
