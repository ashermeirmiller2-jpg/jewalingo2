import { Route, Routes, useLocation } from "react-router-dom";
import NavBar from "./components/NavBar";
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
