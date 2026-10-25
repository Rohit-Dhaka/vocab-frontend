import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Trash2, Search } from "lucide-react";
import { getWords, deleteWord } from "../api";

const LEVELS = ["", "A1", "A2", "B1", "B2", "C1"];

const STATUS_STYLE = {
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABEL = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};

export default function WordList() {
  const { language } = useParams(); // "english" ya "german"

  const [words, setWords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getWords({ language, level, search, page, limit: 20 });
      // Page 1 par list replace hoti hai, baaki pages par neeche judti hai
      setWords((prev) => (page === 1 ? data.vocabularies : [...prev, ...data.vocabularies]));
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [language, level, search, page]);

  // Language badalne par filters reset
  useEffect(() => {
    setWords([]);
    setPage(1);
    setSearch("");
    setLevel("");
  }, [language]);

  // Search typing par thoda ruk kar API call (debounce)
  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeLevel = (value) => {
    setLevel(value);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this word?")) return;
    try {
      await deleteWord(id);
      setWords((prev) => prev.filter((w) => w._id !== id));
      setPagination((p) => (p ? { ...p, total: p.total - 1 } : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-bold capitalize">{language} words</h1>
        {pagination && (
          <span className="text-xs text-slate-400">{pagination.total} total</span>
        )}
      </div>

      {/* Search + level filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            maxLength={100}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Search word or meaning"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={level}
          onChange={(e) => changeLevel(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-2 text-sm outline-none"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l || "All"}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Word cards */}
      <ul className="space-y-2">
        {words.map((w) => (
          <li
            key={w._id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3"
          >
            {w.image?.url && (
              <img src={w.image.url} alt={w.word} className="h-14 w-14 rounded-lg object-cover" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{w.word}</p>
                <span className="rounded bg-indigo-50 px-1.5 text-[10px] font-semibold text-indigo-600">
                  {w.level}
                </span>
              </div>
              <p className="truncate text-sm text-slate-500">{w.hindiMeaning}</p>
              <p className="truncate text-xs text-slate-400">{w.englishMeaning}</p>

              <div className="mt-1.5 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[w.status]}`}>
                  {STATUS_LABEL[w.status]}
                </span>
                <span className="text-[10px] text-slate-400">{w.progress}%</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to={`/edit/${w._id}`}
                aria-label="Edit"
                className="rounded-lg bg-slate-100 p-2 text-slate-600"
              >
                <Pencil size={16} />
              </Link>
              <button
                onClick={() => handleDelete(w._id)}
                aria-label="Delete"
                className="rounded-lg bg-red-50 p-2 text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {loading && <p className="text-center text-sm text-slate-500">Loading...</p>}

      {!loading && words.length === 0 && !error && (
        <p className="py-10 text-center text-sm text-slate-400">No words found.</p>
      )}

      {hasMore && !loading && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-indigo-600"
        >
          Load more
        </button>
      )}
    </div>
  );
}