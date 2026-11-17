"use client";

import { useEffect, useState } from "react";

function themeRoot() {
  return document.querySelector<HTMLElement>('[data-platform-module="talent"]') ?? document.documentElement;
}

export function useTrackerTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = themeRoot();
    const previous = root.getAttribute("data-theme");
    return () => {
      if (previous === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previous);
    };
  }, []);

  useEffect(() => {
    themeRoot().dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("brasaland-theme", next);
  };
  return { theme, toggleTheme };
}
