/**
 * Sefaria client — the single source of ALL on-screen Aramaic.
 *
 * HARD RULE 1: text is fetched verbatim from the Sefaria API (William Davidson
 * Talmud) and stored in CachedRef. It is never generated, paraphrased, or
 * reconstructed by a model. Anything that renders Aramaic must resolve it
 * through getRefText().
 */
import { prisma } from '../lib/prisma.js';

const SEFARIA_BASE = 'https://www.sefaria.org/api/v3/texts';

export interface RefText {
  ref: string;
  vowel: string; // vowelized original, verbatim
  plain: string; // nikud-stripped normalized parallel
  enText?: string; // Davidson English — admin verification aid only
}

/** Strip Hebrew vowel points / cantillation, keep consonantal text. */
export function stripNikud(text: string): string {
  return text
    .replace(/־/g, ' ') // maqaf -> space (before the strip — maqaf sits inside the mark range)
    .replace(/[֑-ׇ]/g, '') // nikud + teamim
    .replace(/[׃׳״]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip Sefaria's inline HTML (e.g. <b>, <i>, <sup> footnote markers). */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

interface SefariaV3Response {
  versions: Array<{
    language: string;
    text: string | string[] | string[][];
    actualLanguage?: string;
  }>;
}

function flattenText(t: string | string[] | string[][]): string[] {
  if (typeof t === 'string') return [t];
  return (t as Array<string | string[]>).flatMap((x) => (typeof x === 'string' ? [x] : x));
}

async function fetchVersion(ref: string, lang: 'source' | 'english'): Promise<string[]> {
  const url = `${SEFARIA_BASE}/${encodeURIComponent(ref)}?version=${lang}&return_format=default`;
  const res = await fetchWithRetry(url);
  const data = (await res.json()) as SefariaV3Response;
  const version = data.versions?.[0];
  if (!version) throw new Error(`Sefaria returned no ${lang} version for ${ref}`);
  return flattenText(version.text).map(stripHtml);
}

async function fetchWithRetry(url: string, attempts = 4): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Jewoulingo/0.1 (educational)' } });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`Sefaria ${res.status} for ${url}`);
      }
      lastErr = new Error(`Sefaria ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** i));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Resolve a Sefaria ref to verbatim text, cache-first.
 * The cache (CachedRef) is authoritative once populated — imports are
 * validated against it (see admin import route).
 */
export async function getRefText(ref: string): Promise<RefText> {
  const cached = await prisma.cachedRef.findUnique({ where: { ref } });
  if (cached) {
    return { ref, vowel: cached.vowel, plain: cached.plain, enText: cached.enText ?? undefined };
  }

  const [source, english] = await Promise.all([
    fetchVersion(ref, 'source'),
    fetchVersion(ref, 'english').catch(() => [] as string[]),
  ]);
  const vowel = source.join(' ');
  const plain = stripNikud(vowel);
  const enText = english.join(' ') || null;

  await prisma.cachedRef.upsert({
    where: { ref },
    create: { ref, vowel, plain, enText },
    update: {}, // never overwrite verbatim text once stored
  });
  return { ref, vowel, plain, enText: enText ?? undefined };
}

/**
 * Verify that a piece of Aramaic text matches the stored Sefaria text for a
 * ref (hard rule 1 enforcement for pipeline imports). Comparison is on the
 * nikud-stripped form to tolerate vowelization variants between exports.
 */
export async function verifyTextAgainstRef(ref: string, text: string): Promise<boolean> {
  const stored = await getRefText(ref);
  const candidate = stripNikud(stripHtml(text));
  return stored.plain.includes(candidate) || candidate.includes(stored.plain);
}
