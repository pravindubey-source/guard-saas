"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setTheme(stored === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="w-full flex items-center justify-center gap-2 text-sm bg-white/10 hover:bg-white/20 rounded-lg py-2 transition"
    >
      <span>{theme === "dark" ? "☀️" : "🌙"}</span>
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
