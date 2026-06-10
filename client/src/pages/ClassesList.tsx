import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getClasses } from "../api";
import { useApi } from "../hooks";
import { ErrorPane, Loading, EmptyState } from "../components/Status";

export default function ClassesList() {
  const { data, error, loading, retry } = useApi(getClasses, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-4xl mb-2">Question-type classes</h1>
      <p className="text-ink/60 mb-8">
        Learn to name the move the moment you see it — and to know what must happen next.
      </p>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorPane error={error} retry={retry} />
      ) : !data?.length ? (
        <EmptyState message="No classes published yet." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.map((c) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                to={`/classes/${c.id}`}
                className="card block p-6 hover:border-gold/50 transition-colors h-full"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: c.moveType.color || "#c9a227" }}
                  />
                  <span className="text-xs uppercase tracking-widest text-ink/50">
                    {c.moveType.name}
                    {c.moveType.isQuestionType ? " · question" : ""}
                  </span>
                </div>
                <p className="text-xl">{c.title}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
