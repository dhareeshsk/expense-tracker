import { useEffect, useState } from "react";

function getInitial() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(getInitial);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return reduced;
}
