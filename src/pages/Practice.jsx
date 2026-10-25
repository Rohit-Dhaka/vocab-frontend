import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Minus,
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { getWords, updateWord } from "../api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const PAGE_SIZE = 10;

// Pehle in_progress words, phir not_started words (done words kabhi nahi)
const SOURCES = ["in_progress", "not_started"];

const STATUSES = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const LANGUAGES = [
  { value: "", label: "All" },
  { value: "english", label: "English" },
  { value: "german", label: "German" },
];

// Chuni hui language yaad rakhne ke liye
const LANG_KEY = "practice-language";

// Browser ki built-in awaaz se word bolta hai (koi extra library nahi chahiye)
const LANG_CODE = { english: "en-US", german: "de-DE" };

const speak = (text, lang) => {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel(); // pehle ki awaaz band
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85; // thoda dheere, seekhne ke liye
  window.speechSynthesis.speak(utterance);
};

// Cloudinary link ko https banata hai
const toHttps = (url) => (url || "").replace(/^http:\/\//i, "https://");

// Answer check: meaning ke parts (comma / ; / slash) mein se koi bhi match ho to sahi
const normalize = (text) => text.trim().toLowerCase().replace(/\s+/g, " ");

const isCorrect = (answer, word) => {
  const typed = normalize(answer);
  if (!typed) return false;

  return [word.hindiMeaning, word.englishMeaning].some((meaning) => {
    const full = normalize(meaning);
    const parts = full.split(/[,;/]/).map(normalize).filter(Boolean);
    return typed === full || parts.includes(typed);
  });
};

// Word ki image: fail ho to message dikhata hai
function WordImage({ image, alt }) {
  const [failed, setFailed] = useState(false);
  const url = toHttps(image?.url);

  if (!url) return null;

  if (failed) {
    return (
      <p className="mx-auto mt-4 w-fit rounded-xl bg-white/15 px-3 py-2 text-xs">
        Image load nahi ho payi
      </p>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mx-auto mt-4 h-32 w-32 rounded-2xl border-2 border-white/40 bg-white/10 object-cover"
    />
  );
}

function WordCard({ word, onDone, onUpdate }) {
  const [status, setStatus] = useState(word.status);
  const [progress, setProgress] = useState(word.progress);
  const [level, setLevel] = useState(word.level);
  const [saveState, setSaveState] = useState(""); // "", "saving", "saved", ya error text

  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // null | "correct" | "wrong"

  const saved = useRef({ status: word.status, progress: word.progress, level: word.level });

  const changeStatus = (next) => {
    setStatus(next);
    if (next === "not_started") setProgress(0);
    else if (next === "done") setProgress(100);
    else if (progress < 1 || progress > 99) setProgress(50);
  };

  const changeProgress = (value) => {
    const next = Number(value);
    setProgress(next);
    setStatus(next === 0 ? "not_started" : next === 100 ? "done" : "in_progress");
  };

  const changeLevel = (step) => {
    const index = LEVELS.indexOf(level) + step;
    if (index >= 0 && index < LEVELS.length) setLevel(LEVELS[index]);
  };

  // Auto save: change ke 0.5 second baad
  useEffect(() => {
    const s = saved.current;
    if (s.status === status && s.progress === progress && s.level === level) return;

    setSaveState("saving");

    const timer = setTimeout(async () => {
      try {
        await updateWord(word._id, { status, progress, level });
        saved.current = { status, progress, level };
        setSaveState("saved");
        onUpdate(word._id, { status, progress, level });

        // Done hone par word practice se hat jata hai
        if (status === "done") setTimeout(() => onDone(word._id), 800);
      } catch (err) {
        setSaveState(err.message);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [status, progress, level, word._id, onDone, onUpdate]);

  const checkAnswer = (e) => {
    e.preventDefault();
    setResult(isCorrect(answer, word) ? "correct" : "wrong");
  };

  const lang = LANG_CODE[word.language] || "en-US";

  return (
    <section className="h-full w-full shrink-0 snap-center snap-always overflow-y-auto px-4 pb-4">
      <div className="mx-auto max-w-md space-y-3">
        {/* Word hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 text-center text-white shadow-lg shadow-indigo-200">
          <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            {word.language} · {level}
          </span>

          <WordImage image={word.image} alt={word.word} />

          {/* Word + speaker */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <h2 className="break-words text-4xl font-extrabold leading-tight">{word.word}</h2>
            <button
              type="button"
              onClick={() => speak(word.word, lang)}
              aria-label="Listen to the word"
              className="shrink-0 rounded-full bg-white/20 p-2.5 active:scale-90"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Pronunciation: English aur Hindi dono, har ek ke saath speaker icon */}
          <div className="mt-4 space-y-2 text-left">
            {[
              { label: "English", text: word.pronunciationEnglish },
              { label: "हिंदी", text: word.pronunciationHindi },
            ].map((p) => (
              <div
                key={p.label}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white/15 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                    {p.label} pronunciation
                  </p>
                  <p className="break-words text-sm font-medium">
                    {p.text || <span className="opacity-50">Add nahi kiya</span>}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!p.text}
                  onClick={() => speak(word.word, lang)}
                  aria-label={`Listen ${p.label} pronunciation`}
                  className="shrink-0 rounded-full bg-white/20 p-2 active:scale-90 disabled:opacity-30"
                >
                  <Volume2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Meaning + eye icon */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Meaning
              </p>
              {revealed ? (
                <div className="space-y-1">
                  <p className="break-words text-lg font-semibold">{word.hindiMeaning}</p>
                  <p className="break-words text-sm text-slate-500">{word.englishMeaning}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-5 w-3/4 rounded bg-slate-100" />
                  <div className="h-4 w-1/2 rounded bg-slate-100" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={revealed ? "Hide meaning" : "Show meaning"}
              className={`rounded-xl p-2.5 ${
                revealed ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        {/* Type the meaning */}
        <form
          onSubmit={checkAnswer}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Your answer
          </p>
          <div className="flex gap-2">
            <input
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                setResult(null);
              }}
              placeholder="Hindi ya English meaning likho"
              className={`min-w-0 flex-1 rounded-xl border bg-slate-50 px-3 py-2.5 text-sm outline-none ${
                result === "correct"
                  ? "border-emerald-500 bg-emerald-50"
                  : result === "wrong"
                  ? "border-red-500 bg-red-50"
                  : "border-slate-200 focus:border-indigo-500"
              }`}
            />
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white active:scale-95"
            >
              Check
            </button>
          </div>

          {result === "correct" && (
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-600">
              <Check size={16} /> Correct!
            </p>
          )}
          {result === "wrong" && (
            <p className="mt-2 flex items-center gap-1 text-sm font-medium text-red-600">
              <X size={16} /> Wrong, dobara try karo.
            </p>
          )}
        </form>

        {/* Status, progress, level (auto save) */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => changeStatus(s.value)}
                className={`rounded-xl py-2 text-xs font-semibold ${
                  status === s.value
                    ? s.value === "done"
                      ? "bg-emerald-600 text-white"
                      : "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-xs font-medium text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            {/* touch-none: slider chalate waqt card swipe na ho */}
            <input
              type="range"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => changeProgress(e.target.value)}
              className="w-full touch-none accent-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Level</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => changeLevel(-1)}
                disabled={level === LEVELS[0]}
                aria-label="Decrease level"
                className="rounded-lg bg-slate-100 p-1.5 disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center font-bold">{level}</span>
              <button
                type="button"
                onClick={() => changeLevel(1)}
                disabled={level === LEVELS[LEVELS.length - 1]}
                aria-label="Increase level"
                className="rounded-lg bg-slate-100 p-1.5 disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <p className="h-4 text-xs text-slate-400">
            {saveState === "saving" && "Saving..."}
            {saveState === "saved" && "Saved ✓"}
            {saveState && saveState !== "saving" && saveState !== "saved" && (
              <span className="text-red-600">{saveState}</span>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}

export default function Practice() {
  const [words, setWords] = useState([]);
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return LANGUAGES.some((l) => l.value === saved) ? saved : ""; // "" = all
    } catch {
      return "";
    }
  });
  const [index, setIndex] = useState(0); // abhi kaun sa card screen par hai
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false); // saare pages aa chuke
  const [error, setError] = useState("");

  const deckRef = useRef(null);
  const wordsRef = useRef([]);
  // idx = abhi kaun sa source (in_progress / not_started), gen = language badalne par purana fetch cancel
  const stateRef = useRef({ idx: 0, done: false, busy: false, gen: 0 });

  const commit = useCallback((fn) => {
    wordsRef.current = fn(wordsRef.current);
    setWords(wordsRef.current);
  }, []);

  const removeWord = useCallback(
    (id) => commit((prev) => prev.filter((w) => w._id !== id)),
    [commit]
  );

  const updateLocal = useCallback(
    (id, patch) => commit((prev) => prev.map((w) => (w._id === id ? { ...w, ...patch } : w))),
    [commit]
  );

  // Agla page laata hai. Offset sirf unhi words se nikalta hai jo abhi bhi apne source ke status mein hain,
  // isliye done/badle hue words se pagination aage-peeche nahi hoti. Duplicates id se hatate hain.
  const fetchMore = async () => {
    const st = stateRef.current;
    if (st.busy || st.done) return;

    st.busy = true;
    const gen = st.gen;
    setLoading(true);

    try {
      while (st.idx < SOURCES.length) {
        const status = SOURCES[st.idx];
        const offset = wordsRef.current.filter(
          (w) => w._src === status && w.status === status
        ).length;
        const page = Math.floor(offset / PAGE_SIZE) + 1;

        const data = await getWords({ status, language, page, limit: PAGE_SIZE });
        if (gen !== st.gen) return; // language badal gayi, purana result ignore

        const ids = new Set(wordsRef.current.map((w) => w._id));
        const fresh = data.vocabularies
          .filter((w) => !ids.has(w._id))
          .map((w) => ({ ...w, _src: status }));

        const lastPage = page >= data.pagination.totalPages;
        if (lastPage || fresh.length === 0) st.idx += 1;

        if (fresh.length > 0) {
          commit((prev) => [...prev, ...fresh]);
          break;
        }
      }

      if (st.idx >= SOURCES.length) {
        st.done = true;
        setFinished(true);
      }
    } catch (err) {
      if (gen === st.gen) setError(err.message);
    } finally {
      if (gen === st.gen) {
        st.busy = false;
        setLoading(false);
      }
    }
  };

  // Pehli baar aur language badalne par sab reset
  useEffect(() => {
    const st = stateRef.current;
    st.gen += 1;
    st.idx = 0;
    st.done = false;
    st.busy = false;

    wordsRef.current = [];
    setWords([]);
    setIndex(0);
    setFinished(false);
    setError("");
    deckRef.current?.scrollTo({ left: 0 });

    fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Last 3 cards ke paas pahunchne par agla page
  useEffect(() => {
    if (!finished && !loading && words.length > 0 && index >= words.length - 3) {
      fetchMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, words.length, finished, loading]);

  const changeLanguage = (value) => {
    if (value === language) return;
    window.speechSynthesis?.cancel();
    setLanguage(value);
    try {
      localStorage.setItem(LANG_KEY, value);
    } catch {
      // storage band ho to bhi app chalta rahe
    }
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;
    const next = Math.round(el.scrollLeft / el.clientWidth);
    if (next !== index) setIndex(next);
  };

  const go = (step) => {
    const el = deckRef.current;
    if (el) el.scrollBy({ left: step * el.clientWidth, behavior: "smooth" });
  };

  const empty = !loading && words.length === 0;
  const position = Math.min(index + 1, words.length);
  const percent = words.length ? (position / words.length) * 100 : 0;

  return (
    // Navbar ke upar poori screen, andar left-right swipe wala deck
    <div className="fixed inset-x-0 top-0 bottom-16 flex flex-col bg-slate-50">
      {/* Header: language chips + counter + arrows */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="mx-auto max-w-md space-y-2">
          {/* Language toggle: kis language ki practice karni hai */}
          <div
            role="tablist"
            aria-label="Practice language"
            className="grid grid-cols-3 rounded-2xl bg-slate-200/70 p-1"
          >
            {LANGUAGES.map((chip) => {
              const active = language === chip.value;
              return (
                <button
                  key={chip.value}
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeLanguage(chip.value)}
                  className={`rounded-xl py-2 text-sm font-semibold transition-all ${
                    active
                      ? chip.value === "german"
                        ? "bg-rose-500 text-white shadow"
                        : chip.value === "english"
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-white text-slate-800 shadow"
                      : "text-slate-500"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* Counter + arrows */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">
              Practice:{" "}
              <b className="text-slate-700">
                {LANGUAGES.find((l) => l.value === language)?.label}
              </b>
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => go(-1)}
                disabled={index === 0}
                aria-label="Previous word"
                className="rounded-full bg-white p-1.5 text-slate-600 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-12 text-center text-xs font-semibold text-slate-500">
                {words.length ? `${position}/${words.length}${finished ? "" : "+"}` : "0"}
              </span>
              <button
                onClick={() => go(1)}
                disabled={index >= words.length - 1}
                aria-label="Next word"
                className="rounded-full bg-white p-1.5 text-slate-600 shadow-sm disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Deck progress bar */}
        <div className="mx-auto mt-2 h-1 max-w-md overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      {empty && finished ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-lg font-semibold">All done! 🎉</p>
          <p className="text-sm text-slate-500">Practice ke liye koi word bacha nahi.</p>
          <Link
            to="/add"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add new word
          </Link>
        </div>
      ) : empty ? (
        <p className="p-4 text-center text-sm text-slate-500">Loading...</p>
      ) : (
        // Horizontal swipe deck (left / right)
        <div
          ref={deckRef}
          onScroll={handleScroll}
          className="no-scrollbar flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
        >
          {words.map((word) => (
            <WordCard key={word._id} word={word} onDone={removeWord} onUpdate={updateLocal} />
          ))}

          {/* Agle page ka loader / end card */}
          <div className="flex h-full w-full shrink-0 snap-center items-center justify-center p-6 text-center text-sm text-slate-400">
            {finished ? "Yahan tak ke saare words ho gaye 🎉" : "Loading more..."}
          </div>
        </div>
      )}
    </div>
  );
}
