import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dumbbell, Plus, Flame, Target, TrendingUp, RefreshCw } from "lucide-react";
import { getStats } from "../api";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const EMPTY = {
  totalWords: 0,
  completedWords: 0,
  inProgressWords: 0,
  notStartedWords: 0,
  remainingWords: 0,
  averageProgress: 0,
  completionRate: 0,
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

// ---------- Skeleton loading ----------

// A gray pulsing block used to build the skeleton screen
const Bone = ({ className = "" }) => (
  <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
);

function DashboardSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading dashboard">
      {/* Header */}
      <div className="space-y-2">
        <Bone className="h-4 w-44" />
        <Bone className="h-7 w-52" />
      </div>

      {/* Hero card */}
      <Bone className="h-44 w-full rounded-3xl" />

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-16 rounded-2xl" />
        <Bone className="h-16 rounded-2xl" />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <Bone className="h-24 rounded-2xl" />
        <Bone className="h-24 rounded-2xl" />
        <Bone className="h-24 rounded-2xl" />
      </div>

      {/* Language cards */}
      <Bone className="h-5 w-28" />
      <Bone className="h-32 w-full rounded-3xl" />
      <Bone className="h-32 w-full rounded-3xl" />

      {/* Level breakdown */}
      <Bone className="h-64 w-full rounded-3xl" />
    </div>
  );
}

// ---------- UI pieces ----------

// Circular progress ring
function Ring({ percent, size = 96, stroke = 9, track = "#e2e8f0", color = "#6366f1", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(percent, 100) / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

// Done / learning split in a single bar
function SplitBar({ data }) {
  const total = data.totalWords || 1;
  const pct = (n) => `${(n / total) * 100}%`;

  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className="bg-emerald-500" style={{ width: pct(data.completedWords) }} />
      <div className="bg-amber-400" style={{ width: pct(data.inProgressWords) }} />
    </div>
  );
}

const Legend = ({ data }) => (
  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
    <span className="flex items-center gap-1">
      <i className="h-2 w-2 rounded-full bg-emerald-500" /> {data.completedWords} done
    </span>
    <span className="flex items-center gap-1">
      <i className="h-2 w-2 rounded-full bg-amber-400" /> {data.inProgressWords} learning
    </span>
    <span className="flex items-center gap-1">
      <i className="h-2 w-2 rounded-full bg-slate-300" /> {data.notStartedWords} new
    </span>
  </div>
);

// One card per language
function LanguageCard({ title, data, to, accent }) {
  return (
    <Link
      to={to}
      className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-center gap-4">
        <Ring percent={data.completionRate} size={72} stroke={8} color={accent.hex}>
          <span className="text-sm font-bold">{Math.round(data.completionRate)}%</span>
        </Ring>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold">{title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accent.soft}`}>
              {data.totalWords} words
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Average progress <b className="text-slate-700">{data.averageProgress}%</b> ·{" "}
            <b className="text-slate-700">{data.remainingWords}</b> remaining
          </p>
          <div className="mt-2">
            <SplitBar data={data} />
          </div>
        </div>
      </div>
      <Legend data={data} />
    </Link>
  );
}

// Level-wise details from A1 to C1
function LevelBreakdown({ levels }) {
  const [lang, setLang] = useState("english");

  const rows = LEVELS.map((level) => {
    const found = levels.find((l) => l.language === lang && l.level === level);
    return {
      level,
      total: found?.totalWords || 0,
      done: found?.completedWords || 0,
      avg: found?.averageProgress || 0,
    };
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">Progress by level</h3>
        <div className="flex rounded-full bg-slate-100 p-0.5">
          {["english", "german"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                lang === l ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-3">
        {rows.map((r) => {
          const donePct = r.total ? (r.done / r.total) * 100 : 0;
          return (
            <li key={r.level} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600">
                {r.level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {r.done}/{r.total} done
                  </span>
                  <span className="text-slate-400">avg {r.avg}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                    style={{ width: `${donePct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const MiniStat = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
      <Icon size={16} />
    </span>
    <p className="mt-2 text-xl font-extrabold leading-none">{value}</p>
    <p className="mt-1 text-[11px] text-slate-500">{label}</p>
  </div>
);

// ---------- Page ----------

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadStats = useCallback(() => {
    setError("");
    setStats(null);

    getStats()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-base font-semibold">Something went wrong</p>
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={loadStats}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    );
  }

  if (!stats) return <DashboardSkeleton />;

  const find = (lang) => stats.languages.find((l) => l.language === lang) || EMPTY;
  const overall = stats.overall;
  const toPractice = overall.inProgressWords + overall.notStartedWords;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">{greeting()}, Rohit Dhaka</p>
        <h1 className="text-2xl font-extrabold">Your vocabulary</h1>
      </div>

      {/* Hero: ring + totals */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-200">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-5">
          <Ring
            percent={overall.completionRate}
            size={104}
            stroke={10}
            track="rgba(255,255,255,0.25)"
            color="#ffffff"
          >
            <span className="text-2xl font-extrabold">{Math.round(overall.completionRate)}%</span>
            <span className="text-[10px] opacity-80">complete</span>
          </Ring>

          <div className="min-w-0 flex-1">
            <p className="text-xs opacity-80">Total words</p>
            <p className="text-4xl font-extrabold leading-tight">{overall.totalWords}</p>
            <p className="mt-1 text-xs opacity-90">
              <b>{overall.completedWords}</b> done · <b>{overall.remainingWords}</b> remaining
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="bg-emerald-300"
            style={{ width: `${(overall.completedWords / (overall.totalWords || 1)) * 100}%` }}
          />
          <div
            className="bg-amber-300"
            style={{ width: `${(overall.inProgressWords / (overall.totalWords || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/practice"
          className="flex items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-white active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Dumbbell size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold">Practice</span>
            <span className="block text-[11px] opacity-70">{toPractice} words to go</span>
          </span>
        </Link>

        <Link
          to="/add"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 active:scale-[0.98]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Plus size={20} />
          </span>
          <span>
            <span className="block text-sm font-bold">New word</span>
            <span className="block text-[11px] text-slate-500">Add to your list</span>
          </span>
        </Link>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat
          icon={Flame}
          label="Learning"
          value={overall.inProgressWords}
          tone="bg-amber-50 text-amber-600"
        />
        <MiniStat
          icon={Target}
          label="Not started"
          value={overall.notStartedWords}
          tone="bg-slate-100 text-slate-600"
        />
        <MiniStat
          icon={TrendingUp}
          label="Avg. progress"
          value={`${overall.averageProgress}%`}
          tone="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Languages */}
      <h2 className="pt-1 text-base font-bold">Languages</h2>
      <LanguageCard
        title="English"
        data={find("english")}
        to="/words/english"
        accent={{ hex: "#6366f1", soft: "bg-indigo-50 text-indigo-600" }}
      />
      <LanguageCard
        title="German"
        data={find("german")}
        to="/words/german"
        accent={{ hex: "#f43f5e", soft: "bg-rose-50 text-rose-600" }}
      />

      {/* Levels */}
      <LevelBreakdown levels={stats.levels || []} />
    </div>
  );
}
