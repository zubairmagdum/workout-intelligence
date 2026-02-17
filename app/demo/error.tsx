"use client";

import React from "react";

export default function DemoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // This will show in the browser console + Vercel client logs
  console.error("Demo route error:", error);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Demo crashed</h1>
      <p style={{ opacity: 0.85, marginBottom: 12 }}>
        This is the actual runtime error (copy/paste it to me):
      </p>

      <pre style={{ whiteSpace: "pre-wrap", padding: 12, borderRadius: 10, background: "rgba(0,0,0,0.06)" }}>
{String(error?.message || error)}
{"\n\n"}
{(error as any)?.stack || "(no stack available)"}
{"\n\n"}
Digest: {(error as any)?.digest || "(none)"}
      </pre>

      <button
        onClick={() => reset()}
        style={{
          marginTop: 12,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.2)",
          background: "white",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Retry
      </button>
    </div>
  );
}

