import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
  Shuffle,
} from "lucide-react";
import { getWords, updateWord } from "../api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

// Only words that are not done are practiced
const SOURCES = ["in_progress", "not_started"];

// Safety limit for how many words are loaded into one practice session
const MAX_WORDS = 1000;

// How many visited words are remembered for the Previous button
const MAX_HISTORY = 100;

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

// Remembers the selected language
const LANG_KEY = "practice-language";

// Reads the word aloud using the browser's built-in voice
const LANG_CODE = { english: "en-US", german: "de-DE" };

const speak = (text, lang) => {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85; // a little slower, easier to learn from
  window.speechSynthesis.speak(utterance);
};

// Fisher-Yates shuffle
const shuffle = (list) => {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const toHttps = (url) => (url || "").replace(/^http:\/\//i, "https://");

// Answer check: any one part of the meaning (split by comma / ; / slash) counts as correct
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

function WordImage({ image, alt }) {
  const [failed, setFailed] = useState(false);
  const url = toHttps(image?.url);

  if (!url) return null;

  if (failed) {
    return (
      <p className="mx-auto mt-4 w-fit rounded-xl bg-white/15 px-3 py-2 text-xs">
        Image failed to load
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
      className="mx-auto mt-4  rounded-2xl border-2 border-white/40 bg-white/10 object-cover"
    />
  );
}

function WordCard({ word, onDone, onUpdate }) {
  const [status, setStatus] = useState(word.status);
  const [progress, setProgress] = useState(word.progress);
  const [level, setLevel] = useState(word.level);
  const [saveState, setSaveState] = useState(""); // "", "saving", "saved", or an error message

  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null); // null | "correct" | "wrong"

  const saved = useRef({
    status: word.status,
    progress: word.progress,
    level: word.level,
  });
  const latest = useRef({ status, progress, level });
  latest.current = { status, progress, level };

  const changeStatus = (next) => {
    setStatus(next);
    if (next === "not_started") setProgress(0);
    else if (next === "done") setProgress(100);
    else if (progress < 1 || progress > 99) setProgress(50);
  };

  const changeProgress = (value) => {
    const next = Number(value);
    setProgress(next);
    setStatus(
      next === 0 ? "not_started" : next === 100 ? "done" : "in_progress",
    );
  };

  const changeLevel = (step) => {
    const index = LEVELS.indexOf(level) + step;
    if (index >= 0 && index < LEVELS.length) setLevel(LEVELS[index]);
  };

  // Auto save 0.5 seconds after a change
  useEffect(() => {
    const s = saved.current;
    if (s.status === status && s.progress === progress && s.level === level)
      return;

    setSaveState("saving");

    const timer = setTimeout(async () => {
      try {
        await updateWord(word._id, { status, progress, level });
        saved.current = { status, progress, level };
        setSaveState("saved");
        onUpdate(word._id, { status, progress, level });

        // A word marked as done leaves the practice rotation
        if (status === "done") setTimeout(() => onDone(word._id), 800);
      } catch (err) {
        setSaveState(err.message);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [status, progress, level, word._id, onDone, onUpdate]);

  // If the user moves to another word before auto save fires, save immediately
  useEffect(
    () => () => {
      const s = saved.current;
      const l = latest.current;
      if (
        s.status === l.status &&
        s.progress === l.progress &&
        s.level === l.level
      )
        return;

      saved.current = l;
      updateWord(word._id, l)
        .then(() => {
          onUpdate(word._id, l);
          if (l.status === "done") onDone(word._id);
        })
        .catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const checkAnswer = (e) => {
    e.preventDefault();
    setResult(isCorrect(answer, word) ? "correct" : "wrong");
  };

  const lang = LANG_CODE[word.language] || "en-US";
  const isGerman = word.language === "german";

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-4">
      {/* Word hero card */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br px-2 py-3 text-center text-white shadow-lg ${
          isGerman
            ? "from-rose-500 to-orange-500 shadow-rose-200"
            : "from-indigo-600 to-violet-600 shadow-indigo-200"
        }`}
      >
        <WordImage image={word.image} alt={word.word} />

        {/* Word + speaker */}
        <div className=" flex items-center justify-center gap-3">
          <div className="flex items-center">
            <span className="rounded-full absolute left-2 top-2   bg-white/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
              {level}
            </span>
            <h2 className="break-words text-4xl font-extrabold leading-tight">
              {word.word}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => speak(word.word, lang)}
            aria-label="Listen to the word"
            className="shrink-0 rounded-full bg-white/20 p-2.5 active:scale-90"
          >
            <Volume2 size={20} />
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          {[
            { label: "English", text: word.pronunciationEnglish },
            { label: "Hindi", text: word.pronunciationHindi },
          ].map((p) => (
            <div
              key={p.label}
              className="flex items-center justify-between gap-2 w-50 rounded-2xl bg-white/15 px-4 py-2.5"
            >
              <p className="break-words text-sm font-medium text-nowrap  ">
                {p.text || <span className="opacity-50">Not added</span>}
              </p>
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
                <p className="break-words text-lg font-semibold">
                  {word.hindiMeaning}
                </p>
                <p className="break-words text-sm text-slate-500">
                  {word.englishMeaning}
                </p>
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
              revealed
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Type the meaning */}
    

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
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => changeProgress(e.target.value)}
            className="w-full touch-none accent-indigo-600"
          />
        </div>

     

        <p className="h-4 text-xs text-slate-400">
          {saveState === "saving" && "Saving..."}
          {saveState === "saved" && "Saved ✓"}
          {saveState && saveState !== "saving" && saveState !== "saved" && (
            <span className="text-red-600">{saveState}</span>
          )}
        </p>
      </div>
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
            placeholder="Type the meaning in Hindi or English"
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
            <X size={16} /> Wrong, try again.
          </p>
        )}
      </form>
    </div>
  );
}

export default function Practice() {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return LANGUAGES.some((l) => l.value === saved) ? saved : ""; // "" = all
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [, rerender] = useReducer((n) => n + 1, 0);

  // Practice state lives in refs so next / previous are instant
  const poolRef = useRef(new Map()); // id -> word (only words that are not done)
  const bagRef = useRef([]); // shuffled ids still to show in the current round
  const seqRef = useRef([]); // ids shown so far (for the Previous button)
  const cursorRef = useRef(0); // position inside seqRef
  const genRef = useRef(0); // cancels stale loads when the language changes
  const touchRef = useRef(null);

  // Picks the next random word. When the round is over, the bag is reshuffled, so it never ends.
  const drawNext = useCallback((excludeId) => {
    const pool = poolRef.current;
    if (pool.size === 0) return null;

    const pick = () => {
      if (bagRef.current.length === 0)
        bagRef.current = shuffle([...pool.keys()]);
      return bagRef.current.pop();
    };

    let id = pick();
    let guard = 0;

    while (
      (!pool.has(id) || (id === excludeId && pool.size > 1)) &&
      guard < pool.size * 3 + 5
    ) {
      id = pick();
      guard += 1;
    }

    return pool.has(id) ? id : null;
  }, []);

  const next = useCallback(() => {
    const seq = seqRef.current;

    if (cursorRef.current < seq.length - 1) {
      cursorRef.current += 1; // moving forward through words already visited
    } else {
      const id = drawNext(seq[cursorRef.current] ?? null);
      if (!id) return;

      seq.push(id);
      cursorRef.current = seq.length - 1;

      if (seq.length > MAX_HISTORY) {
        seq.shift();
        cursorRef.current -= 1;
      }
    }

    window.speechSynthesis?.cancel();
    rerender();
  }, [drawNext]);

  const previous = useCallback(() => {
    if (cursorRef.current === 0) return;

    cursorRef.current -= 1;
    window.speechSynthesis?.cancel();
    rerender();
  }, []);

  // A word marked done is removed from the rotation
  const removeWord = useCallback(
    (id) => {
      const seq = seqRef.current;
      if (!poolRef.current.has(id) && !seq.includes(id)) return;

      poolRef.current.delete(id);

      const keptBefore = seq
        .slice(0, cursorRef.current)
        .filter((x) => x !== id).length;
      const nextSeq = seq.filter((x) => x !== id);

      seqRef.current = nextSeq;
      cursorRef.current = keptBefore;

      if (cursorRef.current >= nextSeq.length) {
        const newId = drawNext(nextSeq[nextSeq.length - 1] ?? null);

        if (newId) {
          nextSeq.push(newId);
          cursorRef.current = nextSeq.length - 1;
        } else {
          cursorRef.current = 0;
        }
      }

      rerender();
    },
    [drawNext],
  );

  const updateLocal = useCallback((id, patch) => {
    const word = poolRef.current.get(id);
    if (word) poolRef.current.set(id, { ...word, ...patch });
  }, []);

  // Loads every word that is not done, then shuffles them
  const loadPool = async () => {
    const gen = ++genRef.current;

    poolRef.current = new Map();
    bagRef.current = [];
    seqRef.current = [];
    cursorRef.current = 0;
    setLoading(true);
    setError("");
    rerender();

    try {
      const map = new Map();

      for (const status of SOURCES) {
        let page = 1;

        while (map.size < MAX_WORDS) {
          const data = await getWords({ status, language, page, limit: 100 });
          if (gen !== genRef.current) return;

          data.vocabularies.forEach((w) => map.set(w._id, w));

          if (page >= data.pagination.totalPages) break;
          page += 1;
        }
      }

      poolRef.current = map;
      bagRef.current = shuffle([...map.keys()]);

      const first = drawNext(null);
      if (first) seqRef.current.push(first);
    } catch (err) {
      if (gen === genRef.current) setError(err.message);
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        rerender();
      }
    }
  };

  // Load on first open and whenever the language changes
  useEffect(() => {
    window.speechSynthesis?.cancel();
    loadPool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Keyboard arrows (desktop)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") previous();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, previous]);

  const changeLanguage = (value) => {
    if (value === language) return;

    setLanguage(value);
    try {
      localStorage.setItem(LANG_KEY, value);
    } catch {
      // the app keeps working even if storage is blocked
    }
  };

  // Swipe left = next, swipe right = previous
  const onTouchStart = (e) => {
    if (e.target.closest("input, textarea, select, button")) {
      touchRef.current = null;
      return;
    }

    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else previous();
    }
  };

  const word = poolRef.current.get(seqRef.current[cursorRef.current]);
  const poolSize = poolRef.current.size;
  const empty = !loading && poolSize === 0;

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 flex flex-col bg-slate-50">
      {/* Header: language toggle + info */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="mx-auto max-w-md space-y-2">
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

          <div className="flex items-center justify-between text-xs text-slate-500">
            <p className="flex items-center gap-1.5 font-medium">
              <Shuffle size={13} />
              Random order · endless
            </p>
            <p>
              <b className="text-slate-700">{poolSize}</b> words ·{" "}
              <b className="text-slate-700">{bagRef.current.length}</b> left in
              this round
            </p>
          </div>
        </div>
      </div>

      {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

      {/* Word area (swipe left / right) */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto pt-1"
      >
        {loading && poolSize === 0 && (
          <p className="p-4 text-center text-sm text-slate-500">
            Loading words...
          </p>
        )}

        {empty && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-lg font-semibold">All done! 🎉</p>
            <p className="text-sm text-slate-500">
              There are no words left to practice.
            </p>
            <Link
              to="/add"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add new word
            </Link>
          </div>
        )}

        {word && (
          <WordCard
            key={word._id}
            word={word}
            onDone={removeWord}
            onUpdate={updateLocal}
          />
        )}
      </div>

      {/* Previous / Next */}
      <div className=" border-t border-slate-200  px-4 py-1 ">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            onClick={previous}
            disabled={cursorRef.current === 0 || !word}
            className="flex w-50 items-center justify-center gap-1 rounded-lg  rounded-br-3xl bg-slate-100 py-1.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <button
            onClick={next}
            disabled={!word}
            className="flex w-50 items-center justify-center gap-1 rounded-lg rounded-bl-3xl bg-indigo-600 py-1.5 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-40"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
