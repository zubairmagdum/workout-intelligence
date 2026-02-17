"use client";

import React, { useEffect, useMemo, useState } from "react";

type DataQuality = "High" | "Medium" | "Low";

type IntelligencePayload = {
  series?: {
    dates?: string[];
    e1rm?: number[];
    volume_7d?: number[];
    volume_30d?: number[];
  };
  signals?: {
    slope?: number;
    plateau_detected?: boolean;
    fatigue_index?: number;
    readiness_score?: number;
    acute_chronic_ratio?: number;
  };
  meta?: {
    confidence_score?: number;
    data_quality?: DataQuality;
    observations?: number;
  };
};

function fmtNum(n: unknown, digits = 2) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}
function fmtInt(n: unknown) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—";
  return String(Math.round(n));
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function DemoPage() {
  const [lift, setLift] = useState<"bench" | "squat" | "deadlift">("bench");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [raw, setRaw] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      setData(null);
      setRaw(null);

      try {
        const url = `/api/intelligence?lift=${encodeURIComponent(lift)}`;
        const res = await fetch(url, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });

        const json = await res.json().catch(async () => {
          const text = await res.text();
          throw new Error(`Non-JSON response. HTTP ${res.status}. Body:\n${text.slice(0, 1500)}`);
        });

        if (!res.ok) {
          throw new Error(json?.error || `Request failed: HTTP ${res.status}`);
        }

        if (!cancelled) {
          setData(json as IntelligencePayload);
          setRaw(json);
        }
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lift]);

  // Derived recommendation: simple + safe defaults (you can align to your actual rec object if you add it to the API)
  const derived = useMemo(() => {
    const obs = data?.meta?.observations ?? 0;
    const slope = data?.signals?.slope ?? 0;
    const plateau = !!data?.signals?.plateau_detected;
    const readiness = data?.signals?.readiness_score;
    const confidence = data?.meta?.confidence_score;

    // A conservative demo prescription (you can replace with your real prescription fields if/when you return them)
    // If plateau or readiness low -> reduce; else slight increase.
    const baseWeight =
      lift === "bench" ? 175 : lift === "squat" ? 225 : 315;

    const readinessNum = typeof readiness === "number" ? readiness : 80;
    const confNum = typeof confidence === "number" ? confidence : 70;

    let weight = baseWeight;
    let sets = 3;
    let reps = 5;
    let deload = false;

    if (obs < 6) {
      // low data: don't get fancy
      weight = baseWeight;
      sets = 3;
      reps = 5;
    } else if (plateau || slope < 0) {
      // plateau/negative trend: small reset
      weight = Math.round(baseWeight * 0.95 / 5) * 5;
      sets = 3;
      reps = 5;
    } else {
      // positive/flat: small push
      weight = Math.round((baseWeight + 5) / 5) * 5;
      sets = 3;
      reps = 5;
    }

    if (readinessNum < 70) {
      deload = true;
      weight = Math.round(weight * 0.9 / 5) * 5;
      sets = 2;
      reps = 5;
    }

    const whyLines: string[] = [];
    whyLines.push(`Observations used: ${obs || "—"}`);
    whyLines.push(`Trend slope (recent e1RM): ${fmtNum(slope, 4)}`);
    whyLines.push(`Plateau detected: ${plateau ? "Yes" : "No"}`);
    if (typeof readiness === "number") whyLines.push(`Readiness score: ${fmtInt(readiness)}/100`);
    if (typeof confidence === "number") whyLines.push(`Confidence score: ${fmtInt(confidence)}/100`);
    if (deload) whyLines.push("Guardrail triggered: readiness < 70 → reduced load/volume.");

    const confidenceScore = clamp(confNum, 0, 100);

    return {
      weight,
      sets,
      reps,
      deload,
      confidenceScore,
      whyLines,
    };
  }, [data, lift]);

  const rangeText = useMemo(() => {
    const dates = data?.series?.dates;
    if (!dates || dates.length < 2) return "—";
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `${fmt(start)} → ${fmt(end)}`;
  }, [data]);

  const obsText = data?.meta?.observations != null ? String(data.meta.observations) : "—";
  const dqText = data?.meta?.data_quality ?? "—";
  const confText = data?.meta?.confidence_score != null ? `${Math.round(data.meta.confidence_score)}/100` : "—";
  const readinessText =
    data?.signals?.readiness_score != null ? `${Math.round(data.signals.readiness_score)}/100` : "—";

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Workout Intelligence Demo
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Deterministic “signal engine” over Supabase workout data. Recommendation + confidence + explainability.
      </p>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
              </div>

              <div style={{ opacity: 0.75, fontWeight: 600 }}>
                Observations: {obsText} · {rangeText}
              </div>
            </div>
          </div>

          {loading && (
            <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
              Loading…
            </div>
          )}

          {err && (
            <div style={{ border: "1px solid rgba(255,0,0,0.35)", borderRadius: 12, padding: 16, color: "#b00020" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{err}</pre>
            </div>
          )}

          {!loading && !err && data && (
            <>
              <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Next Session Recommendation</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>
                      {derived.weight} lb · {derived.sets} sets × {derived.reps} reps
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.75 }}>
                      Deload flag: <b>{derived.deload ? "Yes" : "No"}</b>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Confidence</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{confText}</div>
                    <div style={{ marginTop: 8, opacity: 0.75 }}>
                      Data quality: <b>{dqText}</b>
                    </div>
                    <div style={{ marginTop: 8, opacity: 0.75 }}>
                      Readiness: <b>{readinessText}</b>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <div style={{ flex: "1 1 240px", minWidth: 220, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Trend Slope</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>
                    {fmtNum(data?.signals?.slope, 4)}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 6 }}>Linear regression on recent e1RM.</div>
                </div>

                <div style={{ flex: "1 1 240px", minWidth: 220, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Plateau</div>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>
                    {data?.signals?.plateau_detected ? "Detected" : "Not detected"}
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 6 }}>Rule-based + trend gating.</div>
                </div>
              </div>

              <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Why this recommendation?</summary>
                <div style={{ marginTop: 10, opacity: 0.95 }}>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {derived.whyLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </details>

              <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Debug: intelligence payload</summary>
                <pre style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.04)", overflowX: "auto", fontSize: 12, lineHeight: 1.4 }}>
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>

        <div style={{ flex: "0 1 360px", minWidth: 300 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>About the AI Engine (MVP)</div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li><b>Feature engineering</b>: e1RM (Epley), volume, rolling volume.</li>
              <li><b>Signal detection</b>: trend slope + plateau + fatigue/readiness heuristics.</li>
              <li><b>Uncertainty</b>: confidence score + data quality gating.</li>
              <li><b>Prescriptive output</b>: next session weight/sets/reps + guardrails.</li>
            </ol>
            <p style={{ opacity: 0.8, marginTop: 10 }}>
              Next: explicit prescription object from API, what-if simulator, archetypes, evaluation metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
