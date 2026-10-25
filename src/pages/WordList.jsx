import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Pencil, Trash2, Search, Volume2, Plus, X, RefreshCw } from "lucide-react";
import { getWords, deleteWord } from "../api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "not_started", label: "New" },
  { value: "in_progress", label: "Learning" },
  { value: "done", label: "Done" },
];

const STATUS_STYLE = {
  not_started: { label: "New", dot: "bg-slate-300", text: "text-slate-500" },
  in_progress: { label: "Learning", dot: "bg-amber-400", text: "text-amber-600" },
  done: { label: "Done", dot: "bg-emerald-500", text: "text-emerald-600" },
};

// Color theme for each language
const THEME = {
  english: {
    hero: "from-indigo-600 to-violet-600",
    shadow: "shadow-indigo-200",
    bar: "bg-indigo-500",
    chip: "bg-indigo-600 text-white",
    badge: "bg-indigo-50 text-indigo-600",
  },
  german: {
      hero: "from-neutral-900 via-red-600 to-amber-400",

    shadow: "shadow-rose-200",
    bar: "bg-rose-500",
    chip: "bg-rose-500 text-white",
    badge: "bg-rose-50 text-rose-600",
  },
};

const LANG_CODE = { english: "en-US", german: "de-DE" };

// Reads the word aloud using the browser's built-in voice
const speak = (text, lang) => {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

const toHttps = (url) => (url || "").replace(/^http:\/\//i, "https://");

// ---------- Skeleton loading ----------

// A gray pulsing block used to build skeleton screens
const Bone = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />
);

// Same shape as a real word tile
function WordTileSkeleton() {
  return (
    <li
      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      aria-hidden="true"
    >
      {/* Level + status */}
      <div className="flex items-center justify-between">
        <Bone className="h-4 w-8" />
        <Bone className="h-3 w-14" />
      </div>

      {/* Word + speaker */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <Bone className="h-6 w-24" />
        <Bone className="h-7 w-7 rounded-full" />
      </div>
      <Bone className="mt-2 h-3 w-20" />

      {/* Meanings */}
      <Bone className="mt-3 h-4 w-full" />
      <Bone className="mt-1.5 h-3 w-2/3" />

      {/* Progress */}
      <Bone className="mt-4 h-1.5 w-full" />

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <Bone className="h-7" />
        <Bone className="h-7" />
      </div>
    </li>
  );
}

// ---------- Word tile ----------

function WordTile({ word, theme, onDelete }) {
  const status = STATUS_STYLE[word.status] || STATUS_STYLE.not_started;
  const imageUrl = toHttps(word.image?.url);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={word.word}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-24 w-full object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-3">
        {/* Level + status */}
        <div className="flex items-center justify-between">
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${theme.badge}`}>
            {word.level}
          </span>
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${status.text}`}>
            <i className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>

        {/* Word + speaker */}
        <div className="mt-2 flex items-start justify-between gap-1">
          <h3 className="break-words text-lg font-extrabold leading-tight">{word.word}</h3>
          <button
            type="button"
            onClick={() => speak(word.word, LANG_CODE[word.language])}
            aria-label={`Listen to ${word.word}`}
            className="shrink-0 rounded-full bg-slate-100 p-1.5 text-slate-600 active:scale-90"
          >
            <Volume2 size={14} />
          </button>
        </div>

        {word.pronunciationEnglish && (
          <p className="mt-0.5 truncate text-[11px] text-slate-400">/{word.pronunciationEnglish}/</p>
        )}

        {/* Meanings */}
        <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-700">{word.hindiMeaning}</p>
        <p className="line-clamp-2 text-xs text-slate-400">{word.englishMeaning}</p>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-400">
            <span>Progress</span>
            <span>{word.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${word.status === "done" ? "bg-emerald-500" : theme.bar}`}
              style={{ width: `${word.progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
          <Link
            to={`/edit/${word._id}`}
            className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-600"
          >
            <Pencil size={13} /> Edit
          </Link>
          <button
            type="button"
            onClick={() => onDelete(word._id)}
            className="flex items-center justify-center gap-1 rounded-lg bg-red-50 py-1.5 text-xs font-semibold text-red-500"
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------- Page ----------

export default function WordList() {
  const { language } = useParams(); // "english" or "german"
  const theme = THEME[language] || THEME.english;

  const [words, setWords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0); // changing this reloads the list

  // Reset everything when the language changes
  useEffect(() => {
    setWords([]);
    setPagination(null);
    setPage(1);
    setSearch("");
    setLevel("");
    setStatus("");
  }, [language]);

  // Load words (debounced, and stale responses are ignored)
  useEffect(() => {
    let ignore = false;

    // Show the skeleton right away, then fetch after a short pause (search typing)
    setLoading(true);
    setError("");

    const timer = setTimeout(async () => {
      try {
        const data = await getWords({ language, level, status, search, page, limit: 20 });
        if (ignore) return;

        // Page 1 replaces the list, later pages are appended
        setWords((prev) => (page === 1 ? data.vocabularies : [...prev, ...data.vocabularies]));
        setPagination(data.pagination);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }, 300);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [language, level, status, search, page, reloadKey]);

  const changeSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const changeLevel = (value) => {
    setLevel((prev) => (prev === value ? "" : value)); // tap again to clear
    setPage(1);
  };

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this word? This cannot be undone.")) return;

    try {
      await deleteWord(id);
      setWords((prev) => prev.filter((w) => w._id !== id));
      setPagination((p) => (p ? { ...p, total: p.total - 1 } : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const hasMore = pagination && page < pagination.totalPages;
  const hasFilters = Boolean(search || level || status);

  // First load / new filter: skeleton replaces the grid. Load more: skeleton is added at the end.
  const showGridSkeleton = loading && page === 1;
  const showMoreSkeleton = loading && page > 1;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div
        className={`relative overflow-hidden rounded-xl bg-gradient-to-b ${theme.hero} p-5 text-white shadow-lg ${theme.shadow}`}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide opacity-80">Word library</p>
            <h1 className="text-2xl font-extrabold capitalize">{language}</h1>
          </div>
          <div className="text-right">
            {pagination ? (
              <p className="text-3xl font-extrabold leading-none">{pagination.total}</p>
            ) : (
              <div className="ml-auto h-8 w-12 animate-pulse rounded-lg bg-white/30" />
            )}
            <p className="mt-1 text-[11px] opacity-80">
              {hasFilters ? "matching words" : "total words"}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
        <input
          value={search}
          maxLength={100}
          onChange={(e) => changeSearch(e.target.value)}
          placeholder="Search by word or meaning"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm outline-none focus:border-indigo-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => changeSearch("")}
            aria-label="Clear search"
            className="absolute right-3 top-3 rounded-full bg-slate-100 p-1 text-slate-500"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters: status + level chips */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => changeStatus(f.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === f.value ? theme.chip : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}

        <span className="mx-1 w-px shrink-0 bg-slate-200" />

        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => changeLevel(l)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              level === l ? "bg-slate-900 text-white" : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Error with retry */}
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Word grid */}
      <ul className="grid grid-cols-2 gap-3" aria-busy={loading}>
        {showGridSkeleton
          ? Array.from({ length: 6 }, (_, i) => <WordTileSkeleton key={i} />)
          : words.map((w) => (
              <WordTile key={w._id} word={w} theme={theme} onDelete={handleDelete} />
            ))}

        {showMoreSkeleton &&
          Array.from({ length: 2 }, (_, i) => <WordTileSkeleton key={`more-${i}`} />)}
      </ul>

      {!loading && words.length === 0 && !error && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-base font-semibold">
            {hasFilters ? "No words match your filters" : "No words yet"}
          </p>
          <p className="text-sm text-slate-400">
            {hasFilters ? "Try changing the search or filters." : "Add your first word to get started."}
          </p>
          {!hasFilters && (
            <Link
              to="/add"
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold ${theme.chip}`}
            >
              <Plus size={16} /> Add word
            </Link>
          )}
        </div>
      )}

      {hasMore && !loading && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700"
        >
          Load more
        </button>
      )}
    </div>
  );
}
