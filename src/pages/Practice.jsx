import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Shuffle,
} from "lucide-react";
import { getWords, updateWord } from "../api";

// Only unfinished words are practiced.
const SOURCES = ["in_progress", "not_started"];

const MAX_WORDS = 1000;
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

const LANG_KEY = "practice-language";
const HIDE_MEANING_KEY = "practice-hide-meaning";

const LANG_CODE = {
  english: "en-US",
  german: "de-DE",
};

const normalize = (text) =>
  String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const toHttps = (url) => (url || "").replace(/^http:\/\//i, "https://");

const getProgress = (word) => {
  const progress = Number(word.progress);
  return Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
};

const getStatus = (word) => word.status || "not_started";

const speak = (text, lang) => {
  if (!text || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 0.85;

  window.speechSynthesis.speak(utterance);
};

const shuffle = (list) => {
  const array = [...list];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
};

// Higher-progress words receive more practice tickets.
//
// Progress 0-19:   1 ticket
// Progress 20-39:  2 tickets
// Progress 40-59:  3 tickets
// Progress 60-79:  4 tickets
// Progress 80-99:  5 tickets
// Progress 100:    6 tickets
//
// Completed words are removed from the practice pool separately.
const getPracticeWeight = (word) => 1 + Math.floor(getProgress(word) / 20);

// Each practice round contains weighted tickets.
// A word with higher progress can appear more often.
const createWeightedBag = (pool) => {
  const tickets = [];

  for (const [id, word] of pool.entries()) {
    const weight = getPracticeWeight(word);

    for (let i = 0; i < weight; i++) {
      tickets.push(id);
    }
  }

  return shuffle(tickets);
};

// Any complete meaning or individual comma/semicolon/slash-separated
// meaning is accepted.
const isCorrect = (answer, word) => {
  const typed = normalize(answer);

  if (!typed) return false;

  return [word.hindiMeaning, word.englishMeaning].some((meaning) => {
    const full = normalize(meaning);

    const parts = full.split(/[,;/]/).map(normalize).filter(Boolean);

    return typed === full || parts.includes(typed);
  });
};

// ---------- Skeleton loading ----------

const Bone = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
);

function WordCardSkeleton() {
  return (
    <div
      className="mx-auto max-w-md space-y-3 px-4 pb-4"
      aria-busy="true"
      aria-label="Loading words"
    >
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-5">
        <div className="flex items-center justify-center gap-3">
          <Bone className="h-10 w-44" />
          <Bone className="h-10 w-10 rounded-full" />
        </div>

        <div className="flex gap-2">
          <Bone className="h-11 flex-1 rounded-2xl" />
          <Bone className="h-11 flex-1 rounded-2xl" />
        </div>
      </div>

      <Bone className="h-24 w-full rounded-2xl" />
      <Bone className="h-40 w-full rounded-2xl" />
      <Bone className="h-28 w-full rounded-2xl" />
    </div>
  );
}

// ---------- Word image ----------

function WordImage({ image, alt }) {
  const [failed, setFailed] = useState(false);
  const url = toHttps(image?.url);

  useEffect(() => {
    setFailed(false);
  }, [url]);

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
      alt={alt || "Vocabulary"}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mx-auto mt-4 max-h-48 max-w-full rounded-2xl border border-white/40 bg-white/10 object-cover"
    />
  );
}

// ---------- Toggle ----------

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked
          ? "border-indigo-600 bg-indigo-600"
          : "border-slate-300 bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// ---------- Word card ----------

function WordCard({ word, hideMeaningMode, onDone, onUpdate }) {
  const [status, setStatus] = useState(getStatus(word));
  const [progress, setProgress] = useState(getProgress(word));
  const [level, setLevel] = useState(word.level || "A1");

  const [saveState, setSaveState] = useState("");

  // Hide the meaning initially when hide mode is enabled.
  const [revealed, setRevealed] = useState(!hideMeaningMode);

  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);

  const saved = useRef({
    status: getStatus(word),
    progress: getProgress(word),
    level: word.level || "A1",
  });

  const latest = useRef({
    status,
    progress,
    level,
  });

  latest.current = { status, progress, level };

  const changeStatus = (next) => {
    setStatus(next);

    if (next === "not_started") {
      setProgress(0);
    } else if (next === "done") {
      setProgress(100);
    } else if (progress < 1 || progress > 99) {
      setProgress(50);
    }
  };

  const changeProgress = (value) => {
    const next = Number(value);

    setProgress(next);

    setStatus(
      next === 0 ? "not_started" : next === 100 ? "done" : "in_progress",
    );
  };

  // Auto-save changes after 500 ms.
  useEffect(() => {
    const previous = saved.current;

    if (
      previous.status === status &&
      previous.progress === progress &&
      previous.level === level
    ) {
      return;
    }

    setSaveState("saving");

    const snapshot = { status, progress, level };

    const timer = setTimeout(async () => {
      try {
        await updateWord(word._id, snapshot);

        saved.current = snapshot;

        setSaveState("saved");

        onUpdate(word._id, snapshot);

        if (snapshot.status === "done") {
          onDone(word._id);
        }
      } catch (err) {
        setSaveState(err.message || "Unable to save changes");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [status, progress, level, word._id, onDone, onUpdate]);

  // Flush pending changes when leaving the word.
  useEffect(() => {
    return () => {
      const previous = saved.current;
      const current = latest.current;

      if (
        previous.status === current.status &&
        previous.progress === current.progress &&
        previous.level === current.level
      ) {
        return;
      }

      const snapshot = { ...current };

      // Prevent the next effect from treating the same values as pending.
      saved.current = snapshot;

      updateWord(word._id, snapshot)
        .then(() => {
          onUpdate(word._id, snapshot);

          if (snapshot.status === "done") {
            onDone(word._id);
          }
        })
        .catch(() => {
          // The next explicit save can retry.
        });
    };
  }, [word._id, onDone, onUpdate]);

  const checkAnswer = (e) => {
    e.preventDefault();

    setResult(isCorrect(answer, word) ? "correct" : "wrong");
  };

  const lang = LANG_CODE[word.language] || "en-US";
  const isGerman = word.language === "german";

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 pb-4">
      {/* Word hero */}
      <div
        className={`relative overflow-hidden rounded-2xl border px-3 py-4 text-center text-white ${
          isGerman
            ? "border-rose-500 bg-gradient-to-br from-rose-500 to-orange-500"
            : "border-indigo-600 bg-gradient-to-br from-indigo-600 to-violet-600"
        }`}
      >
        <WordImage image={word.image} alt={word.word} />

        <span className="absolute left-2 top-2 rounded-full border border-white/30 bg-white/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide">
          {level}
        </span>

        <div className="mt-5 flex items-center justify-center gap-3">
          <h2 className="break-words text-4xl font-extrabold leading-tight">
            {word.word}
          </h2>

          <button
            type="button"
            onClick={() => speak(word.word, lang)}
            aria-label="Listen to the word"
            className="shrink-0 rounded-full border border-white/30 bg-white/15 p-2.5 active:scale-95"
          >
            <Volume2 size={20} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            {
              label: "English pronunciation",
              text: word.pronunciationEnglish,
            },
            {
              label: "Hindi pronunciation",
              text: word.pronunciationHindi,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5"
            >
              <p className="min-w-0 break-words text-left text-sm font-medium">
                {item.text || <span className="text-white/60">Not added</span>}
              </p>

              <button
                type="button"
                disabled={!item.text}
                onClick={() => speak(word.word, lang)}
                aria-label={`Listen to ${item.label}`}
                className="shrink-0 rounded-full border border-white/30 bg-white/15 p-2 disabled:opacity-30"
              >
                <Volume2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Meaning */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Meaning
            </p>

            {revealed ? (
              <div className="space-y-1">
                <p className="break-words text-lg font-semibold text-slate-800">
                  {word.hindiMeaning || "Meaning not added"}
                </p>

                <p className="break-words text-sm text-slate-500">
                  {word.englishMeaning || "English meaning not added"}
                </p>
              </div>
            ) : (
              <div className="space-y-2" aria-label="Meaning hidden">
                <div className="h-5 w-3/4 rounded-lg bg-slate-100" />
                <div className="h-4 w-1/2 rounded-lg bg-slate-100" />

                <p className="pt-1 text-xs text-slate-400">
                  Try to remember the meaning before revealing it.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? "Hide meaning" : "Show meaning"}
            className={`rounded-xl border p-2.5 ${
              revealed
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 bg-slate-100 text-slate-600"
            }`}
          >
            {revealed ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Status and progress */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-3 gap-2">
          {STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => changeStatus(item.value)}
              className={`rounded-xl border px-1 py-2 text-xs font-semibold ${
                status === item.value
                  ? item.value === "done"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex justify-between text-xs font-medium text-slate-500">
            <label htmlFor={`progress-${word._id}`}>Learning progress</label>

            <span className="font-semibold text-indigo-600">{progress}%</span>
          </div>

          <input
            id={`progress-${word._id}`}
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => changeProgress(e.target.value)}
            className="w-full touch-none accent-indigo-600"
          />

          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>Not started</span>
            <span>In progress</span>
            <span>Completed</span>
          </div>
        </div>

        <p role="status" className="min-h-4 text-xs text-slate-400">
          {saveState === "saving" && "Saving changes..."}
          {saveState === "saved" && "Changes saved"}
          {saveState && saveState !== "saving" && saveState !== "saved" && (
            <span className="text-red-600">{saveState}</span>
          )}
        </p>
      </div>

      {/* Answer */}
      <form
        onSubmit={checkAnswer}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Test your memory
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
            className="rounded-xl border border-indigo-600 bg-indigo-600 px-4 text-sm font-semibold text-white active:scale-95"
          >
            Check
          </button>
        </div>

        {result === "correct" && (
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check size={16} />
            Correct!
          </p>
        )}

        {result === "wrong" && (
          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-red-600">
            <X size={16} />
            Wrong, try again.
          </p>
        )}
      </form>
    </div>
  );
}

// ---------- Practice page ----------

export default function Practice() {
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);

      return LANGUAGES.some((item) => item.value === saved) ? saved : "";
    } catch {
      return "";
    }
  });

  const [hideMeaningMode, setHideMeaningMode] = useState(() => {
    try {
      return localStorage.getItem(HIDE_MEANING_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [, forceRender] = useState(0);

  const refresh = useCallback(() => {
    forceRender((value) => value + 1);
  }, []);

  const poolRef = useRef(new Map());
  const bagRef = useRef([]);
  const seqRef = useRef([]);
  const cursorRef = useRef(0);
  const genRef = useRef(0);
  const touchRef = useRef(null);

  // Select the next weighted word, avoiding the current word when possible.
  const drawNext = useCallback((excludeId) => {
    const pool = poolRef.current;

    if (pool.size === 0) return null;

    // Remove tickets belonging to words no longer in the pool.
    bagRef.current = bagRef.current.filter((id) => pool.has(id));

    if (bagRef.current.length === 0) {
      bagRef.current = createWeightedBag(pool);
    }

    if (bagRef.current.length === 0) return null;

    let index = bagRef.current.length - 1;

    // Prefer a different word when the pool contains multiple words.
    if (pool.size > 1 && excludeId != null) {
      const candidates = [];

      for (let i = 0; i < bagRef.current.length; i++) {
        if (bagRef.current[i] !== excludeId) {
          candidates.push(i);
        }
      }

      if (candidates.length > 0) {
        index = candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    const [id] = bagRef.current.splice(index, 1);

    return pool.has(id) ? id : drawNext(excludeId);
  }, []);

  const next = useCallback(() => {
    const sequence = seqRef.current;

    // Revisit the next word in history if we previously went backward.
    if (cursorRef.current < sequence.length - 1) {
      cursorRef.current += 1;
    } else {
      const currentId = sequence[cursorRef.current] ?? null;

      const id = drawNext(currentId);

      if (!id) return;

      sequence.push(id);
      cursorRef.current = sequence.length - 1;

      if (sequence.length > MAX_HISTORY) {
        sequence.shift();
        cursorRef.current -= 1;
      }
    }

    window.speechSynthesis?.cancel();
    refresh();
  }, [drawNext, refresh]);

  const previous = useCallback(() => {
    if (cursorRef.current === 0) return;

    cursorRef.current -= 1;

    window.speechSynthesis?.cancel();
    refresh();
  }, [refresh]);

  // Remove completed words and their tickets.
  const removeWord = useCallback(
    (id) => {
      const pool = poolRef.current;
      const sequence = seqRef.current;

      if (!pool.has(id) && !sequence.includes(id)) return;

      pool.delete(id);

      bagRef.current = bagRef.current.filter((ticket) => ticket !== id);

      const oldCursor = cursorRef.current;

      const keptBefore = sequence
        .slice(0, oldCursor)
        .filter((item) => item !== id).length;

      const nextSequence = sequence.filter((item) => item !== id);

      seqRef.current = nextSequence;
      cursorRef.current = keptBefore;

      if (cursorRef.current >= nextSequence.length) {
        const lastId = nextSequence[nextSequence.length - 1] ?? null;

        const nextId = drawNext(lastId);

        if (nextId) {
          nextSequence.push(nextId);
          cursorRef.current = nextSequence.length - 1;
        } else {
          cursorRef.current = Math.max(0, nextSequence.length - 1);
        }
      }

      refresh();
    },
    [drawNext, refresh],
  );

  const updateLocal = useCallback((id, patch) => {
    const word = poolRef.current.get(id);

    if (!word) return;

    const updated = { ...word, ...patch };

    poolRef.current.set(id, updated);

    // Rebuild the remaining tickets so changed progress affects
    // future practice selections.
    bagRef.current = createWeightedBag(poolRef.current);
  }, []);

  const loadPool = useCallback(async () => {
    const generation = ++genRef.current;

    poolRef.current = new Map();
    bagRef.current = [];
    seqRef.current = [];
    cursorRef.current = 0;

    setLoading(true);
    setError("");
    refresh();

    try {
      const map = new Map();

      for (const status of SOURCES) {
        let page = 1;

        while (map.size < MAX_WORDS) {
          const data = await getWords({
            status,
            language,
            page,
            limit: 100,
          });

          if (generation !== genRef.current) return;

          const vocabularies = data.vocabularies || [];

          vocabularies.forEach((word) => {
            if (map.size < MAX_WORDS) {
              map.set(word._id, word);
            }
          });

          const totalPages = Number(data.pagination?.totalPages ?? 1);

          if (page >= totalPages || vocabularies.length === 0) {
            break;
          }

          page += 1;
        }

        if (map.size >= MAX_WORDS) break;
      }

      if (generation !== genRef.current) return;

      poolRef.current = map;

      bagRef.current = createWeightedBag(map);

      const first = drawNext(null);

      if (first) {
        seqRef.current.push(first);
      }
    } catch (err) {
      if (generation === genRef.current) {
        setError(err.message || "Unable to load vocabulary.");
      }
    } finally {
      if (generation === genRef.current) {
        setLoading(false);
        refresh();
      }
    }
  }, [language, drawNext, refresh]);

  useEffect(() => {
    window.speechSynthesis?.cancel();

    loadPool();

    return () => {
      // Ignore responses from an earlier request.
      genRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, [loadPool]);

  // Persist the meaning mode.
  const changeHideMeaningMode = (value) => {
    setHideMeaningMode(value);

    try {
      localStorage.setItem(HIDE_MEANING_KEY, String(value));
    } catch {
      // The practice page continues working without storage.
    }
  };

  const changeLanguage = (value) => {
    if (value === language) return;

    setLanguage(value);

    try {
      localStorage.setItem(LANG_KEY, value);
    } catch {
      // The practice page continues working without storage.
    }
  };

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.("input, textarea, select, button")) {
        return;
      }

      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [next, previous]);

  // Swipe left = next; swipe right = previous.
  const onTouchStart = (event) => {
    if (event.target.closest?.("input, textarea, select, button")) {
      touchRef.current = null;
      return;
    }

    touchRef.current = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
    };
  };

  const onTouchEnd = (event) => {
    const start = touchRef.current;

    touchRef.current = null;

    if (!start) return;

    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) next();
      else previous();
    }
  };

  const word = poolRef.current.get(seqRef.current[cursorRef.current]);

  const poolSize = poolRef.current.size;

  const showSkeleton = loading && poolSize === 0;
  const empty = !loading && poolSize === 0;

  return (
    <div className="fixed inset-x-0 top-0 bottom-16 flex flex-col bg-slate-50">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-4 pb-1 pt-1">
        <div className="mx-auto max-w-md space-y-3">
          {/* Language selection */}
          <div
            role="tablist"
            aria-label="Practice language"
            className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-100 p-1"
          >
            {LANGUAGES.map((item) => {
              const active = language === item.value;

              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeLanguage(item.value)}
                  className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
                    active
                      ? item.value === "german"
                        ? "bg-rose-500 text-white"
                        : item.value === "english"
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-200 bg-white text-slate-800"
                      : "text-slate-500"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={loadPool}
            className="ml-2 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Word area */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-y-auto pt-3"
      >
        {showSkeleton && !error && <WordCardSkeleton />}

        {empty && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-3xl">
              🎉
            </div>

            <p className="text-lg font-semibold text-slate-800">All done!</p>

            <p className="max-w-xs text-sm text-slate-500">
              There are no unfinished words left to practice.
            </p>

            <Link
              to="/add"
              className="rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add new word
            </Link>
          </div>
        )}

        {word && (
          <WordCard
            key={word._id}
            word={word}
            hideMeaningMode={hideMeaningMode}
            onDone={removeWord}
            onUpdate={updateLocal}
          />
        )}
      </div>

      {/* Previous / Next */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-1">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            type="button"
            onClick={previous}
            disabled={cursorRef.current === 0 || !word}
            className="flex flex-1 items-center justify-center gap-1 rounded-br-full border border-slate-200 bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <div className="flex flex-col items-center">
            <Toggle
              checked={hideMeaningMode}
              onChange={changeHideMeaningMode}
              label="Hide meanings by default"
            />
            <div className=" text-xs text-slate-500">
              {showSkeleton ? (
                <Bone className="h-4 w-24" />
              ) : (
                <p>
                  <b className="text-slate-700">{poolSize}</b>{" "}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            disabled={!word}
            className="flex flex-1 items-center justify-center gap-1 rounded-bl-full rounded-sm border border-indigo-600 bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
