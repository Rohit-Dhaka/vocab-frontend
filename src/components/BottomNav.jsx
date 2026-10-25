import { NavLink, Link } from "react-router-dom";
import { Home, Dumbbell, Plus, BookOpen, Languages } from "lucide-react";

// Left side: Home + Practice | Right side: English + German
const leftLinks = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/practice", label: "Practice", icon: Dumbbell },
];

const rightLinks = [
  { to: "/words/english", label: "English", icon: BookOpen },
  { to: "/words/german", label: "German", icon: Languages },
];

const NavItem = ({ to, label, icon: Icon, end }) => (
  <NavLink
    to={to}
    end={end}
    className={({ isActive }) =>
      `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
        isActive ? "text-indigo-600" : "text-slate-400"
      }`
    }
  >
    <Icon size={22} />
    {label}
  </NavLink>
);

export default function BottomNav() {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-md items-center">
        {leftLinks.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}

        {/* Center: naya word add karne ka button */}
        <div className="flex flex-1 justify-center">
          <Link
            to="/add"
            aria-label="Add new word"
            className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-300 active:scale-95"
          >
            <Plus size={28} />
          </Link>
        </div>

        {rightLinks.map((link) => (
          <NavItem key={link.to} {...link} />
        ))}
      </div>
    </nav>
  );
}