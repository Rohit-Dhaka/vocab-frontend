import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Practice from "./pages/Practice";
import WordList from "./pages/WordList";
import WordEdit from "./pages/WordEdit";

export default function App() {
  return (
    <div className="mx-auto min-h-full max-w-md bg-slate-50">
      {/* Navbar ke neeche content na chhupe, isliye bottom padding */}
      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/words/:language" element={<WordList />} />
          <Route path="/add" element={<WordEdit />} />
          <Route path="/edit/:id" element={<WordEdit />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}