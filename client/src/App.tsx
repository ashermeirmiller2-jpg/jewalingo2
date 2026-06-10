import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { ensureSession } from "./api";
import NavBar from "./components/NavBar";
import { Loading } from "./components/Status";
import Landing from "./pages/Landing";
import LearnRedirect from "./pages/LearnRedirect";
import LearnPair from "./pages/LearnPair";
import Browse from "./pages/Browse";
import OutsideList from "./pages/OutsideList";
import SugyaPage from "./pages/SugyaPage";
import ClassesList from "./pages/ClassesList";
import ClassPage from "./pages/ClassPage";
import Quiz from "./pages/Quiz";
import VisualBuilder from "./pages/VisualBuilder";
import Review from "./pages/Review";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminPairs from "./pages/admin/AdminPairs";
import AdminSugyot from "./pages/admin/AdminSugyot";

export default function App() {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";

  // Ensure an anonymous session exists for ANY entry point (deep-link, refresh,
  // direct nav to /quiz, /review, etc.) — not just the landing CTA. We gate
  // route rendering on it so a page's first request never races ahead of the
  // session POST (which would 401 with "missing x-user-id"). Idempotent: reuses
  // the stored userId, hits /session/anon at most once. Keeps the "no signup,
  // < 90s to learning" promise working from a cold URL.
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    ensureSession()
      .catch(() => {
        /* network/server errors surface per-page via the error panes */
      })
      .finally(() => setSessionReady(true));
  }, []);

  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      {!isLanding && <NavBar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/learn" element={<LearnRedirect />} />
          <Route path="/learn/pair/:id" element={<LearnPair />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/outside" element={<OutsideList />} />
          <Route path="/outside/:id" element={<SugyaPage />} />
          <Route path="/classes" element={<ClassesList />} />
          <Route path="/classes/:id" element={<ClassPage />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/visual/:sugyaId" element={<VisualBuilder />} />
          <Route path="/review" element={<Review />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminPairs />} />
            <Route path="pairs" element={<AdminPairs />} />
            <Route path="sugyot" element={<AdminSugyot />} />
          </Route>
          <Route
            path="*"
            element={
              <p className="text-center italic text-ink/50 py-24 text-xl">
                This daf doesn&apos;t exist. Turn back a page.
              </p>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
