import { useState } from "react";
import {
  adminGetSugyot,
  adminVerifySugya,
  adminTagSugya,
  adminGenerateMc,
} from "../../api";
import { useApi } from "../../hooks";
import type { AdminSugya } from "../../types";
import { ErrorPane, Loading, EmptyState } from "../../components/Status";

export default function AdminSugyot() {
  const { data, error, loading, retry } = useApi(() => adminGetSugyot(false), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ ref: "", title: "", tractate: "" });
  const [tagging, setTagging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const act = async (fn: () => Promise<unknown>, id: string) => {
    setBusy(id);
    try {
      await fn();
      retry();
    } finally {
      setBusy(null);
    }
  };

  const tag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.ref || !form.title || !form.tractate) return;
    setTagging(true);
    setNotice(null);
    try {
      await adminTagSugya(form);
      setNotice("Tagged — segment + classify ran. Review the candidate graph below.");
      setForm({ ref: "", title: "", tractate: "" });
      retry();
    } catch {
      setNotice("Tagging failed — check the ref and that the server can reach Sefaria + Claude.");
    } finally {
      setTagging(false);
    }
  };

  const genMc = async (id: string) => {
    setBusy(id);
    setNotice(null);
    try {
      await adminGenerateMc(id);
      setNotice("Generated MC questions (verified=false) — verify them on the learner Quiz pipeline.");
    } catch {
      setNotice("MC generation failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <h1 className="text-3xl mb-1">Tagged sugyot</h1>
      <p className="text-ink/55 mb-6">Verify the move graph before it reaches a learner.</p>

      <form onSubmit={tag} className="card p-5 mb-6 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
        <Field label="Sefaria ref" value={form.ref} onChange={(v) => setForm({ ...form, ref: v })} placeholder="Bava Metzia 10a" />
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Seizing for a creditor" />
        <Field label="Tractate" value={form.tractate} onChange={(v) => setForm({ ...form, tractate: v })} placeholder="Bava Metzia" />
        <button
          disabled={tagging}
          className="px-5 py-2.5 rounded-xl bg-gold text-parchment font-semibold disabled:opacity-50 h-fit"
        >
          {tagging ? "Tagging…" : "Tag new sugya"}
        </button>
      </form>

      {notice && <p className="text-sm text-ink/60 italic mb-4">{notice}</p>}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorPane error={error} retry={retry} />
      ) : !data?.length ? (
        <EmptyState message="No unverified sugyot. Tag one above to begin." />
      ) : (
        <div className="space-y-3">
          {data.map((s: AdminSugya) => (
            <div key={s.id} className="card flex items-center justify-between p-5">
              <div>
                <p className="text-lg">{s.title}</p>
                <p className="text-sm text-ink/50">
                  {s.ref}
                  {s.tractate ? ` · ${s.tractate}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy === s.id}
                  onClick={() => genMc(s.id)}
                  className="px-4 py-1.5 rounded-full border border-ink/20 text-ink/60 text-sm hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  Generate MC
                </button>
                <button
                  disabled={busy === s.id}
                  onClick={() => act(() => adminVerifySugya(s.id, true), s.id)}
                  className="px-4 py-1.5 rounded-full bg-gold text-parchment text-sm font-medium disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  disabled={busy === s.id}
                  onClick={() => act(() => adminVerifySugya(s.id, false), s.id)}
                  className="px-4 py-1.5 rounded-full border border-ink/20 text-ink/60 text-sm hover:border-red-400 hover:text-red-600"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ink/45">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 card p-2.5 focus:outline-none focus:ring-2 focus:ring-gold/40"
      />
    </label>
  );
}
