import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, getPairs } from "../api";
import { EmptyState, ErrorPane, Loading } from "../components/Status";

/** /learn → route into the first verified pair's flow. */
export default function LearnRedirect() {
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [empty, setEmpty] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    ensureSession()
      .then(() => getPairs())
      .then((pairs) => {
        if (!alive) return;
        if (!pairs.length) setEmpty(true);
        else navigate(`/learn/pair/${pairs[0].id}`, { replace: true });
      })
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [navigate, tick]);

  if (error) return <ErrorPane error={error} retry={() => setTick((t) => t + 1)} />;
  if (empty) return <EmptyState message="No verified pairs to learn yet — check back soon." />;
  return <Loading label="Finding your next pair…" />;
}
