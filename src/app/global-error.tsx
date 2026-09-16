"use client";

// Last-resort boundary: catches failures in the root layout itself, which the
// route-level error.tsx files sit inside and therefore cannot catch.
//
// global-error replaces the root layout when active, so it must render its own
// <html> and <body>, and it does NOT receive globals.css. Everything here is
// inline-styled deliberately — a stylesheet that failed to load could be the very
// reason this boundary is showing. The emergency advice must survive that.

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <title>Something went wrong — Meridian Health Clinic</title>
        <main
          style={{
            maxWidth: "36rem",
            width: "100%",
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            padding: "2rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", lineHeight: 1.6, color: "#475569" }}>
            This site hit an unexpected error and could not load. Nothing you entered has been assessed or
            submitted. Please try again, or call the clinic on (02) 5550 1234 to book directly.
          </p>

          <div
            role="alert"
            style={{
              marginTop: "1.5rem",
              border: "2px solid #dc2626",
              backgroundColor: "#fef2f2",
              color: "#7f1d1d",
              borderRadius: "0.5rem",
              padding: "1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            If this is a medical emergency, do not wait for this website. Call 000 or attend your nearest
            emergency department now.
          </div>

          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
              Reference: {error.digest}
            </p>
          )}

          <button
            onClick={() => retry()}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              border: "none",
              borderRadius: "0.5rem",
              backgroundColor: "#0f766e",
              color: "#ffffff",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
