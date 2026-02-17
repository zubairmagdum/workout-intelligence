"use client";

import React, { useEffect, useState } from "react";

export default function DemoPage() {
  const [lift, setLift] = useState<"bench" | "squat" | "deadlift">("bench");
  const [loading, setLoading] = useState(false);
  const [rawText, setRawText] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      setRawText("");

      try {
        const url = `/api/intelligence?lift=${encodeURIComponent(lift)}`;

        const res = await fetch(url, {
          cache: "no-store",
          headers: { "accept": "application/json" },
        });

        const text = await res.text();

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}. Body:\n${text.slice(0, 2000)}`);
        }

        if (!cancelled) setRawText(text);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lift]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Workout Intelligence Demo</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Minimal demo page. If this works, the crash is in your richer rendering logic (derived/whyLines/etc).
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ fontWeight: 700 }}>Lift</label>
        <select
          value={lift}
          onChange={(e) => setLift(e.target.value as any)}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
        >
          <option value="bench">Bench</option>
          <option value="squat">Squat</option>
          <option value="deadlift">Deadlift</option>
        </select>

        {loading && <span style={{ fontWeight: 700 }}>Loading…</span>}
      </div>

      {err && (
        <pre style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.08)" }}>
{err}
        </pre>
      )}

      {!err && rawText && (
        <pre style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.06)", overflowX: "auto" }}>
{rawText}
        </pre>
      )}
    </div>
  );
}

