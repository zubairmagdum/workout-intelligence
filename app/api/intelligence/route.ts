import { createClient } from "@supabase/supabase-js";

type DataQuality = "High" | "Medium" | "Low";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// Simple linear regression slope
function slopeLinear(y: number[]) {
  const n = y.length;
  if (n < 2) return 0;

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    sumX += x;
    sumY += y[i];
    sumXY += x * y[i];
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;

  return (n * sumXY - sumX * sumY) / denom;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lift = searchParams.get("lift") || "bench";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await supabase
    .from("workout_sets")
    .select("*")
    .eq("lift_key", lift)
    .order("performed_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return Response.json({ error: "No data" }, { status: 404 });
  }

  const dates: string[] = [];
  const e1rm: number[] = [];
  const volume: number[] = [];
  const rpe: (number | null)[] = [];

  for (const row of rows) {
    const weight = Number(row.weight);
    const reps = Number(row.reps);
    const r = row.rpe !== null ? Number(row.rpe) : null;

    const est = weight * (1 + reps / 30); // Epley

    dates.push(row.performed_at);
    e1rm.push(est);
    volume.push(weight * reps);
    rpe.push(r);
  }

  // Rolling volume
  const rolling = (arr: number[], window: number) =>
    arr.map((_, i) => {
      const start = Math.max(0, i - window + 1);
      return arr.slice(start, i + 1).reduce((a, b) => a + b, 0);
    });

  const volume7 = rolling(volume, 7);
  const volume30 = rolling(volume, 30);

  // Trend slope (last 12)
  const lastN = Math.min(12, e1rm.length);
  const slope = Number(slopeLinear(e1rm.slice(-lastN)).toFixed(4));

  // Plateau detection
  const obs = rows.length;
  let plateau_detected = false;

  if (obs >= 8) {
    const last4 = e1rm.slice(-4);
    const prev4 = e1rm.slice(-8, -4);

    const avg = (arr: number[]) =>
      arr.reduce((a, b) => a + b, 0) / arr.length;

    if (avg(last4) <= avg(prev4) && slope <= 0) {
      plateau_detected = true;
    }
  }

  // Readiness logic
  const lastVol7 = volume7[volume7.length - 1] ?? 0;
  const lastVol30 = volume30[volume30.length - 1] ?? 1;

  const chronicWeekly = lastVol30 / 4;
  const acute_chronic_ratio = lastVol7 / (chronicWeekly || 1);

  const recentRpeVals = rpe.slice(-4).filter(
    (x): x is number => x !== null
  );

  const avgRecentRpe =
    recentRpeVals.length > 0
      ? recentRpeVals.reduce((a, b) => a + b, 0) /
        recentRpeVals.length
      : null;

  let fatigue_index = 0;

  if (acute_chronic_ratio >= 1.2) fatigue_index += 15;
  if (acute_chronic_ratio >= 1.4) fatigue_index += 20;
  if (acute_chronic_ratio >= 1.6) fatigue_index += 25;

  if (slope < 0) fatigue_index += 15;
  if (slope < -0.25) fatigue_index += 10;

  if (avgRecentRpe !== null) {
    if (avgRecentRpe >= 8.5) fatigue_index += 15;
    if (avgRecentRpe >= 9.0) fatigue_index += 10;
  }

  if (obs < 6) fatigue_index += 10;

  fatigue_index = clamp(fatigue_index, 0, 100);
  const readiness_score = clamp(100 - fatigue_index, 0, 100);

  // Confidence score
  const lastDate = new Date(rows[rows.length - 1].performed_at);
  const now = new Date();
  const recencyDays = daysBetween(now, lastDate);
  const recencyBonus = recencyDays <= 10 ? 20 : 0;

  const base = Math.min(60, obs * 5);
  const confidence_score = clamp(base + recencyBonus, 0, 100);

  let data_quality: DataQuality = "Low";
  if (obs >= 12 && recencyDays <= 10) data_quality = "High";
  else if (obs >= 6) data_quality = "Medium";

  return Response.json({
    series: {
      dates,
      e1rm,
      volume_7d: volume7,
      volume_30d: volume30,
    },
    signals: {
      slope,
      plateau_detected,
      fatigue_index,
      readiness_score,
      acute_chronic_ratio: Number(
        acute_chronic_ratio.toFixed(3)
      ),
    },
    meta: {
      confidence_score,
      data_quality,
      observations: obs,
    },
  });
}

