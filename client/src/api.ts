// Typed API client for the Jewoulingo contract (docs/API.md).
// Injects x-user-id on every request (and x-admin-key for /admin routes).

import type {
  AdminMcQuestion,
  AdminPairCandidate,
  AdminSugya,
  ClassDetail,
  ClassSummary,
  ContrastAnswerResult,
  InsideText,
  LeinGradeResult,
  McAnswerResult,
  McNext,
  PairFlow,
  PairSummary,
  Progress,
  ReviewGradeResult,
  ReviewItem,
  SugyaGraph,
  SugyaLink,
  SugyaSummary,
  VisualCheckResult,
  VisualEdge,
  VisualPayload,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const USER_ID_KEY = "jewoulingo:userId";
const ADMIN_KEY_KEY = "jewoulingo:adminKey";

export function getStoredUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserId(id: string) {
  try {
    localStorage.setItem(USER_ID_KEY, id);
  } catch {
    /* private mode — session-only identity */
  }
}

export function getStoredAdminKey(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_KEY_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminKey(key: string | null) {
  try {
    if (key) sessionStorage.setItem(ADMIN_KEY_KEY, key);
    else sessionStorage.removeItem(ADMIN_KEY_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** 403 { error: "coverage" } — the user knows < 70% of the words in this text. */
export class CoverageError extends ApiError {
  coverage: number;
  required: number;
  missingWords: string[];
  constructor(body: { coverage?: number; required?: number; missingWords?: string[] }) {
    super(403, "coverage", body);
    this.name = "CoverageError";
    this.coverage = body.coverage ?? 0;
    this.required = body.required ?? 0.7;
    this.missingWords = body.missingWords ?? [];
  }
}

export function isCoverageError(err: unknown): err is CoverageError {
  return err instanceof CoverageError;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  admin?: boolean;
  skipUserId?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const userId = getStoredUserId();
  if (userId && !opts.skipUserId) headers["x-user-id"] = userId;
  if (opts.admin) {
    const key = getStoredAdminKey();
    if (key) headers["x-admin-key"] = key;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach the Jewoulingo server. Is it running?");
  }

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
  }

  if (!res.ok) {
    const body = (json ?? {}) as Record<string, unknown>;
    if (res.status === 403 && body.error === "coverage") {
      throw new CoverageError(body as never);
    }
    const msg =
      (typeof body.error === "string" && body.error) || `Request failed (${res.status})`;
    throw new ApiError(res.status, msg, json);
  }
  return json as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
};

// ---------- Session & progress ----------

export const createAnonSession = () =>
  request<{ userId: string }>("/session/anon", { method: "POST", body: {}, skipUserId: true });

export const getProgress = () => request<Progress>("/progress");

export const learnWords = (wordIds: string[]) =>
  request<{ ok?: boolean }>("/words/learn", { body: { wordIds } });

// ---------- P2 — pairs & learner flow ----------

export const getPairs = (category?: string, top?: number) =>
  request<PairSummary[]>(`/pairs${qs({ category, top })}`);

export const getPair = (id: string) => request<Record<string, unknown>>(`/pairs/${id}`);

export const getPairFlow = (id: string) => request<PairFlow>(`/pairs/${id}/flow`);

export const gradeLein = (body: {
  pairId: string;
  mode: "tiles" | "free";
  answer: string;
  hintsUsed: number;
}) => request<LeinGradeResult>("/lein/grade", { body });

export const answerContrast = (body: { exerciseId: string; optionId: string }) =>
  request<ContrastAnswerResult>("/contrast/answer", { body });

// ---------- P4 — the OUTSIDE ----------

export const getSugyot = () => request<SugyaSummary[]>("/sugyot");

export const getSugyaGraph = (id: string, admin = false) =>
  request<SugyaGraph>(`/sugyot/${id}/graph`, { admin });

export const getSugyaInside = (id: string, nodeId: string) =>
  request<InsideText>(`/sugyot/${id}/inside/${nodeId}`);

export const getSugyaLinks = (id: string) => request<SugyaLink[]>(`/sugyot/${id}/links`);

export const getClasses = () => request<ClassSummary[]>("/classes");

export const getClassDetail = (id: string) => request<ClassDetail>(`/classes/${id}`);

export const getNextMc = () => request<McNext>("/mc/next");

export const answerMc = (body: { questionId: string; optionId: string }) =>
  request<McAnswerResult>("/mc/answer", { body });

export const getVisual = (sugyaId: string) => request<VisualPayload>(`/visual/${sugyaId}`);

export const checkVisual = (body: { sugyaId: string; edges: VisualEdge[] }) =>
  request<VisualCheckResult>("/visual/check", { body });

// ---------- Unified review ----------

export const getReviewQueue = () => request<ReviewItem[]>("/review/queue");

export const gradeReview = (body: { itemId: string; rating: 1 | 2 | 3 | 4 }) =>
  request<ReviewGradeResult>("/review/grade", { body });

// ---------- Admin ----------

export const adminGetPairs = (verified = false) =>
  request<AdminPairCandidate[]>(`/admin/pairs${qs({ verified })}`, { admin: true });

export const adminVerifyPair = (id: string, verified: boolean) =>
  request<unknown>(`/admin/pairs/${id}/verify`, { admin: true, body: { verified } });

export const adminImportCandidates = (payload: unknown) =>
  request<unknown>("/admin/import/candidates", { admin: true, body: payload });

export const adminGetSugyot = (verified = false) =>
  request<AdminSugya[]>(`/admin/sugyot${qs({ verified })}`, { admin: true });

export const adminVerifySugya = (id: string, verified: boolean) =>
  request<unknown>(`/admin/sugyot/${id}/verify`, { admin: true, body: { verified } });

export const adminTagSugya = (body: { ref: string; title: string; tractate: string }) =>
  request<AdminSugya>("/admin/sugyot/tag", { admin: true, body });

export const adminGenerateMc = (sugyaId: string) =>
  request<AdminMcQuestion[] | { questions: AdminMcQuestion[] }>("/admin/mc/generate", {
    admin: true,
    body: { sugyaId },
  });

export const adminVerifyMc = (id: string, verified: boolean) =>
  request<unknown>(`/admin/mc/${id}/verify`, { admin: true, body: { verified } });

export const adminGenerateExplainers = (pairId: string) =>
  request<unknown>("/admin/explainers/generate", { admin: true, body: { pairId } });

export const adminVerifyExplainer = (id: string, verified: boolean) =>
  request<unknown>(`/admin/explainers/${id}/verify`, { admin: true, body: { verified } });

export const adminVerifyLink = (id: string, verified: boolean) =>
  request<unknown>(`/admin/links/${id}/verify`, { admin: true, body: { verified } });

// ---------- Session bootstrap ----------

let sessionPromise: Promise<string> | null = null;

/** Idempotent: returns the stored userId or creates an anonymous session once. */
export function ensureSession(): Promise<string> {
  const existing = getStoredUserId();
  if (existing) return Promise.resolve(existing);
  if (!sessionPromise) {
    sessionPromise = createAnonSession()
      .then(({ userId }) => {
        setStoredUserId(userId);
        return userId;
      })
      .catch((err) => {
        sessionPromise = null;
        throw err;
      });
  }
  return sessionPromise;
}
