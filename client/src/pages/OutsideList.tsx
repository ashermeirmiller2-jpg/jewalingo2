import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getSugyot } from "../api";
import { useApi } from "../hooks";
import { ErrorPane, Loading, EmptyState } from "../components/Status";

export default function OutsideList() {
  const { data, error, loading, retry } = useApi(getSugyot, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-4xl mb-2">The Outside</h1>
      <p className="text-ink/60 mb-8">
        The argument behind the words. Each sugya is a flowchart of logical moves — learn to see the
        skeleton, then lein it unaided.
      </p>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorPane error={error} retry={retry} />
      ) : !data?.length ? (
        <EmptyState message="No verified sugyot yet — check back once the corpus is tagged." />
      ) : (
        <div className="space-y-4">
          {data.map((s) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                to={`/outside/${s.id}`}
                className="card flex items-center justify-between p-6 hover:border-gold/50 transition-colors"
              >
                <div>
                  <p className="text-xl">{s.title}</p>
                  <p className="text-ink/55 text-sm mt-1">
                    {s.ref} · {s.tractate}
                  </p>
                </div>
                <span className="text-gold text-2xl">→</span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
