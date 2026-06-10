import { Link, useParams } from "react-router-dom";
import { getClassDetail } from "../api";
import { useApi } from "../hooks";
import type { ClassDetail } from "../types";
import AramaicText, { wordsFromApiText } from "../components/AramaicText";
import { ErrorPane, Loading } from "../components/Status";

export default function ClassPage() {
  const { id = "" } = useParams();
  const { data, error, loading, retry } = useApi(() => getClassDetail(id), [id]);

  if (loading) return <Loading />;
  if (error) return <ErrorPane error={error} retry={retry} />;
  if (!data) return null;

  const sections = normalizeBody(data.body);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/classes" className="text-gold text-sm hover:underline">
        ← Classes
      </Link>

      <div className="flex items-center gap-2 mt-5 mb-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: data.moveType.color || "#c9a227" }}
        />
        <span className="text-xs uppercase tracking-widest text-ink/50">{data.moveType.name}</span>
      </div>
      <h1 className="text-4xl mb-8">{data.title}</h1>

      {sections.map((s, i) => (
        <section key={i} className="mb-8">
          {s.heading && <h2 className="text-2xl text-gold mb-2">{s.heading}</h2>}
          <p className="text-ink/80 leading-relaxed">{s.text}</p>
        </section>
      ))}

      {data.examples?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl text-gold mb-4">In the text</h2>
          <div className="space-y-4">
            {data.examples.map((ex, i) => (
              <div key={i} className="card p-5">
                <p className="text-xs text-ink/45 mb-3">{ex.ref}</p>
                <AramaicText words={wordsFromApiText(ex.vowel)} size="2xl" showBars={false} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="border-2 border-gold rounded-xl p-6 bg-gold/5 mb-8">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">So what?</p>
        <p className="text-lg text-ink/85">{data.soWhat}</p>
      </div>

      {data.nearMissPairId && (
        <Link
          to={`/learn/pair/${data.nearMissPairId}?step=contrast`}
          className="inline-block px-6 py-3 rounded-full bg-gold text-parchment font-semibold"
        >
          Drill this at the word level →
        </Link>
      )}
    </div>
  );
}

function normalizeBody(body: ClassDetail["body"]): { heading?: string; text: string }[] {
  if (typeof body === "string") return [{ text: body }];
  if (Array.isArray(body)) return body.map((s) => ({ heading: s.heading, text: s.text }));
  return [];
}
