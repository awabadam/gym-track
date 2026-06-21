"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

// Last-resort boundary: catches errors thrown by the root layout itself, which
// `app/error.tsx` cannot. It replaces the root layout, so it must render its own
// <html>/<body>. Uses inline styles so it renders even if app CSS failed to load.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // TODO(observability): forward to an error-reporting service.
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          background: "#171717",
          color: "#ffffff",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "2rem", margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ opacity: 0.7, fontSize: "0.875rem", margin: 0 }}>
            A critical error occurred. Try reloading the app.
          </p>
          {error.digest && (
            <p style={{ opacity: 0.6, fontSize: "0.75rem", marginTop: "0.5rem" }}>
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1.5rem",
              border: "2px solid #ffffff",
              background: "#ffffff",
              color: "#171717",
              padding: "0.5rem 1rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
