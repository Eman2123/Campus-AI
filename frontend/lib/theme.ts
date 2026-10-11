"use client";

import { useEffect, useState } from "react";

export type ThemePref = "Light" | "Dark" | "System";

const KEY = "campus-ai-theme";
const EVENT = "campus-ai-theme-change";

export function getThemePref(): ThemePref {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "Dark" || v === "System" ? v : "Light";
  } catch {
    return "Light";
  }
}

export function setThemePref(pref: ThemePref): void {
  try {
    window.localStorage.setItem(KEY, pref);
  } catch {
    // storage blocked: the choice just won't persist
  }
  window.dispatchEvent(new Event(EVENT));
}

/** True when the dashboard/admin shell should render with the dark palette. */
export function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const pref = getThemePref();
      setDark(pref === "Dark" || (pref === "System" && mq.matches));
    };
    apply();
    window.addEventListener(EVENT, apply);
    window.addEventListener("storage", apply);
    mq.addEventListener("change", apply);
    return () => {
      window.removeEventListener(EVENT, apply);
      window.removeEventListener("storage", apply);
      mq.removeEventListener("change", apply);
    };
  }, []);

  return dark;
}
