"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";

type DataQuality = "High" | "Medium" | "Low";

type IntelligencePayload = {
  observations: { count: number; from: string; to: string };
  series: {
    dates: string[];
    e1rm: number[];
    volume: number[];
    rpe: (number | null)[];
    volume_7d: number[];
    volume_30d: number[];
  };
  signals: { slope: number; plateau_detected: boolean };
  recommendation: { next_weight: number; reps: number; sets: number; deload_flag: boolean };
  meta: { confidence_score: number; data_quality: DataQuality; warnings: string[] };
};

function fmt(n: number) {
  if (Number.isNaN(n)) return "-";
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function DemoPage() {
  const [lift, setLift] = useState<"bench" | "squat" | "deadlift">("bench");
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [raw, setRaw] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      setData(null);

      try {
        const res = await fetch(
  `/api/intelligence?lift=${encodeURIComponent(lift)}`,
  { cache: "no-store" }
);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error || `Request failed: ${res.status}`);
        }

        if (!cancelled) {
          setData(json as IntelligencePayload);
          setRaw(json);
        }
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [lift]);

  const derived = useMemo(() => {
    if (!data) return null;

    const lastIdx = data.series.dates.length - 1;
    const lastE1RM = data.series.e1rm[lastIdx] ?? null;
    const lastVol7 = data.series.volume_7d[lastIdx] ?? null;
    const lastVol30 = data.series.volume_30d[lastIdx] ?? null;

    const confidence = data.meta.confidence_score;
    const dq = data.meta.data_quality;

    const whyLines: string[] = [];
    whyLines.push(`Trend slope (recent e1RM): ${fmt(data.signals.slope)}`);
    whyLines.push(`Plateau detected: ${data.signals.plateau_detected ? "Yes" : "No"}`);
    if (lastE1RM !== null) whyLines.push(`Last estimated 1RM: ${fmt(lastE1RM)} lb`);
    if (lastVol7 !== null) whyLines.push(`Rolling volume (approx 7d): ${fmt(lastVol7)}`);
    if (lastVol30 !== null) whyLines.push(`Rolling volume (approx 30d): ${fmt(lastVol30)}`);
    whyLines.push(`Confidence: ${confidence}/100 (${dq} data quality)`);

    return { lastE1RM, lastVol7, lastVol30, whyLines };
  }, [data]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Workout Intelligence Demo</h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Deterministic “signal engine” over Supabase workout data. Recommendation + confidence + explainability.
      </p>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontWeight: 600 }}>Lift</label>
              <select
                value={lift}
                onChange={(e) => setLift(e.target.value as any)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
              >
                <option value="bench">Bench</option>
                <option value="squat">Squat</option>
                <option value="deadlift">Deadlift</option>
              </select>

              {data && (
                <div style={{ marginLeft: "auto", opacity: 0.8 }}>
                  Observations: <b>{data.observations.count}</b> · {fmtDate(data.observations.from)} →{" "}
                  {fmtDate(data.observations.to)}
                </div>
              )}
            </div>

            {loading && <p style={{ marginTop: 14 }}>Loading intelligence…</p>}
            {err && (
              <p style={{ marginTop: 14, color: "crimson" }}>
                Error: {err}
              </p>
            )}

            {data && (
              <div style={{ marginTop: 14 }}>
                <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Next Session Recommendation</div>
                      <div style={{ fontSize: 20 }}>
                        <b>{fmt(data.recommendation.next_weight)}</b> lb · {data.recommendation.sets} sets ×{" "}
                        {data.recommendation.reps} reps
                      </div>
                      <div style={{ opacity: 0.8, marginTop: 6 }}>
                        Deload flag: <b>{data.recommendation.deload_flag ? "Yes" : "No"}</b>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Confidence</div>
                      <div style={{ fontSize: 20 }}>
                        <b>{data.meta.confidence_score}</b>/100
                      </div>
                      <div style={{ opacity: 0.8, marginTop: 6 }}>
                        Data quality: <b>{data.meta.data_quality}</b>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                  <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, flex: "1 1 200px", minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>Trend Slope</div>
                    <div style={{ fontSize: 18, marginTop: 4 }}>{fmt(data.signals.slope)}</div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>Linear regression on recent e1RM.</div>
                  </div>

                  <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, flex: "1 1 200px", minWidth: 180 }}>
                    <div style={{ fontWeight: 700 }}>Plateau</div>
                    <div style={{ fontSize: 18, marginTop: 4 }}>
                      {data.signals.plateau_detected ? "Detected" : "Not detected"}
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 4 }}>Rule-based + trend gating.</div>
                  </div>
                </div>

                {data.meta.warnings?.length > 0 && (
                  <div style={{ border: "1px solid rgba(220, 38, 38, 0.35)", background: "rgba(220, 38, 38, 0.06)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Warnings / Guardrails</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {data.meta.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>Why this recommendation?</summary>
                  <div style={{ marginTop: 10, opacity: 0.95 }}>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {derived?.whyLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </details>

                <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>Debug: intelligence payload</summary>
                  <pre style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.04)", overflowX: "auto", fontSize: 12, lineHeight: 1.4 }}>
                    {JSON.stringify(raw, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: "0 1 360px", minWidth: 300 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>About the AI Engine (MVP)</div>
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li><b>Feature engineering</b>: e1RM (Epley), volume, rolling volume.</li>
              <li><b>Signal detection</b>: trend slope + plateau heuristics.</li>
              <li><b>Uncertainty</b>: confidence score + data quality gating.</li>
              <li><b>Prescriptive output</b>: next session weight/sets/reps + guardrails.</li>
            </ol>
            <p style={{ opacity: 0.8, marginTop: 10 }}>
              Next: readiness score, what-if simulator, archetypes, and evaluation metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

