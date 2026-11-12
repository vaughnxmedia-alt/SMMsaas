"use client";
import { useEffect, useState } from "react";
export function Opening({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const hold = reduce ? 0 : 1700;
    const leave = reduce ? 0 : 420;
    const start = window.setTimeout(() => setPhase("out"), hold);
    const finish = window.setTimeout(() => setPhase("done"), hold + leave);
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhase("done");
    };
    window.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(finish);
      window.removeEventListener("keydown", skip);
    };
  }, []);
  return (
    <>
      {children}
      {phase !== "done" && (
        <div className={`intro ${phase === "out" ? "out" : ""}`} role="dialog" aria-label="JUSS CMS">
          <div className="intro-mark">
            JUSS <em>CMS</em>
          </div>
          <span className="intro-line" />
          <p className="intro-caption">YOUR BUSINESSES</p>
          <button className="intro-skip" type="button" onClick={() => setPhase("done")}>
            Skip
          </button>
        </div>
      )}
    </>
  );
}
