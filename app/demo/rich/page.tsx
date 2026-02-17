"use client";

import React, { useEffect, useMemo, useState } from "react";

type LiftKey = "bench" | "squat" | "deadlift";
type DataQuality = "High" | "Medium" | "Low";

type IntelligencePayload = {
  series: {
    dates: string[];
    e1rm: number[];
    volume_7d: number[];
    volume_30d: number[];
  };
  signals: {
    slope: number;
    plateau_detected: boolean;
    fatigue_index?: number;
    readiness_score?: number;
    acute_chronic_ratio?: number;
  };
  meta: {
    confidence_score: number;
    data_quality: DataQuality;
    observations: number;
  };
};

function fmtDateRange(dates: string[]) {
  if (!dates?.length) return "";
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(start)} → ${fmt(end)}`;
}

function round(n: number, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}

export default function DemoRichPage() {
  const [lift, setLift] = useState<LiftKey>("bench");
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

      try {
        const url = `/api/intelligence?lift=${encodeURIComponent(lift)}`;
        const res = await fetch(url, {
          cache: "no-store",
          headers: { accept: "application/json" },
        });

        const json = await res.json().catch(async () => {
          const t = await res.text();
          throw new Error(`Non-JSON response. HTTP ${res.status}. Body:\n${t.slice(0, 2000)}`);
        });

        if (!res.ok) {
          throw new Error(json?.error || `Request failed: ${res.status}`);
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

  const derived = useMemo(() => {
    if (!data) return null;

    const obs = data?.meta?.observations ?? 0;
    const range = fmtDateRange(data?.series?.dates ?? []);
    const confidence = data?.meta?.confidence_score ?? 0;
    const quality = data?.meta?.data_quality ?? "Low";

    const slope = data?.signals?.slope ?? 0;
    const plateau = !!data?.signals?.plateau_detected;

    const readiness = data?.signals?.readiness_score ?? null;
    const fatigue = data?.signals?.fatigue_index ?? null;
    const acr = data?.signals?.acute_chronic_ratio ?? null;

    const whyLines: string[] = [];
    whyLines.push(`Trend slope (recent e1RM): ${round(slope, 4)}`);
    whyLines.push(`Plateau detected: ${plateau ? "Yes" : "No"}`);
    if (acr !== null) whyLines.push(`Acute/Chronic ratio: ${round(acr, 3)}`);
    if (fatigue !== null) whyLines.push(`Fatigue index: ${round(fatigue, 0)}/100`);
    if (readiness !== null) whyLines.push(`Readiness score: ${round(readiness, 0)}/100`);
    whyLines.push(`Observations used: ${obs}`);
    whyLines.push(`Data quality: ${quality}`);
    whyLines.push(`Confidence score: ${confidence}/100`);

    return { obs, range, confidence, quality, slope, plateau, readiness, fatigue, acr, whyLines };
  }, [data]);

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        Workout Intelligence Demo (Rich)
      </h1>
      <p style={{ opacity: 0.8, marginBottom: 18 }}>
        Rich rendering + guardrails. If this crashes, we’ll see exactly where.
      </p>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 320 }}>
          <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ fontWeight: 700 }}>Lift</label>
              <select
                value={lift}
                onChange={(e) => setLift(e.target.value as LiftKey)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.2)" }}
              >
                <option value="bench">Bench</option>
                <option value="squat">Squat</option>
                <option value="deadlift">Deadlift</option>
              </select>

              <div style={{ marginLeft: "auto", opacity: 0.75 }}>
                {derived ? (
                  <>
                    Observations: <b>{derived.obs}</b> · <span>{derived.range}</span>
                  </>
                ) : (
                  <>—</>
                )}
              </div>
            </div>
          </div>

          {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
          {err && (
            <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,0,0,0.08)", marginBottom: 12 }}>
              <b>Error:</b> {err}
            </div>
          )}

          {data && derived && (
            <>
              <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                      Signals Summary
                    </div>
                    <div style={{ fontSize: 16 }}>
                      Readiness: <b>{derived.readiness ?? "—"}</b> · Fatigue: <b>{derived.fatigue ?? "—"}</b>
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 6 }}>
                      Slope: <b>{round(derived.slope, 4)}</b> · Plateau: <b>{derived.plateau ? "Yes" : "No"}</b> · ACR:{" "}
                      <b>{derived.acr !== null ? round(derived.acr, 3) : "—"}</b>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>Confidence</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{derived.confidence}/100</div>
                    <div style={{ opacity: 0.8 }}>Data quality: <b>{derived.quality}</b></div>
                  </div>
                </div>
              </div>

              <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Why this output?</summary>
                <div style={{ marginTop: 10 }}>
                  <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                    {derived.whyLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </details>

              <details style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 12, padding: 12 }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Debug: raw payload</summary>
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
              <li><b>Signal detection</b>: trend slope + plateau heuristics.</li>
              <li><b>Fatigue/Readiness</b>: acute/chronic + slope + RPE missingness.</li>
              <li><b>Uncertainty</b>: confidence score + data quality gating.</li>
            </ol>
            <p style={{ opacity: 0.8, marginTop: 10 }}>
              Keep <code>/demo</code> as safe mode. Use <code>/demo/rich</code> for the real demo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

