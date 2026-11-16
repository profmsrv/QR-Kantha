import { useEffect, useState } from "react";
import useLocalStorage from "./useLocalStorage";

const QUERY = "(prefers-color-scheme: dark)";

// mode: "system" (default) | "light" | "dark"
// The resolved theme is written to <html data-theme="..."> and styles.js does the rest.
export default function useTheme() {
  const [mode, setMode] = useLocalStorage("qr_theme", "system");
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(QUERY).matches);

  // Follow the phone's theme live while mode is "system".
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0c0e15" : "#f4f6fb");
  }, [resolved]);

  return { mode, setMode, resolved };
}
