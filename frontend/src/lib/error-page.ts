function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function renderErrorPage(error?: unknown): string {
  const errorObj = error instanceof Error ? error : (error ? new Error(String(error)) : null);
  const errorMessage = errorObj ? errorObj.message : "";
  const errorStack = errorObj && errorObj.stack ? errorObj.stack : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font: 14px/1.5 system-ui, -apple-system, sans-serif;
        background: #fafafa;
        color: #111;
        display: grid;
        place-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 1.5rem;
        box-sizing: border-box;
      }
      @media (prefers-color-scheme: dark) {
        body { background: #0a0a0a; color: #ededed; }
      }
      .card {
        max-width: 32rem;
        width: 100%;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 1rem;
        padding: 2.5rem;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.05);
        box-sizing: border-box;
      }
      @media (prefers-color-scheme: dark) {
        .card { background: #121212; border-color: #262626; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3); }
      }
      .icon-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 9999px;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        margin: 0 auto 1.5rem;
      }
      .icon-wrapper svg {
        width: 1.5rem;
        height: 1.5rem;
      }
      .text-center { text-align: center; }
      h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      @media (prefers-color-scheme: dark) {
        p { color: #a3a3a3; }
      }
      .error-box {
        margin-top: 1.5rem;
        border: 1px solid rgba(239, 68, 68, 0.15);
        background: rgba(239, 68, 68, 0.02);
        border-radius: 0.75rem;
        padding: 1rem;
        text-align: left;
      }
      .error-header {
        display: inline-block;
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        margin-bottom: 0.5rem;
      }
      .error-msg {
        font-size: 0.875rem;
        font-weight: 600;
        margin: 0 0 0.75rem;
      }
      .details {
        margin-top: 0.5rem;
      }
      .details summary {
        font-size: 0.75rem;
        color: #6b7280;
        cursor: pointer;
        user-select: none;
        font-weight: 500;
      }
      @media (prefers-color-scheme: dark) {
        .details summary { color: #a3a3a3; }
      }
      .details summary:hover {
        color: #111;
      }
      @media (prefers-color-scheme: dark) {
        .details summary:hover { color: #fff; }
      }
      .details pre {
        margin-top: 0.75rem;
        padding: 0.75rem;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 0.5rem;
        overflow-x: auto;
        font-family: monospace;
        font-size: 0.6875rem;
        max-height: 12rem;
        white-space: pre-wrap;
        word-break: break-all;
        color: #4b5563;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }
      @media (prefers-color-scheme: dark) {
        .details pre { background: rgba(0, 0, 0, 0.3); color: #a3a3a3; border-color: rgba(255, 255, 255, 0.05); }
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 2rem;
      }
      a, button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.625rem 1.25rem;
        border-radius: 0.75rem;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: all 0.2s;
        font-family: inherit;
      }
      .primary {
        background: #111;
        color: #fff;
      }
      .primary:hover {
        background: #222;
        transform: translateY(-1px);
      }
      @media (prefers-color-scheme: dark) {
        .primary { background: #f5f5f5; color: #171717; }
        .primary:hover { background: #e5e5e5; }
      }
      .secondary {
        background: #fff;
        color: #374151;
        border-color: #d1d5db;
      }
      .secondary:hover {
        background: #f9fafb;
        border-color: #c4c7c5;
        transform: translateY(-1px);
      }
      @media (prefers-color-scheme: dark) {
        .secondary { background: #1f1f1f; color: #d1d5db; border-color: #374151; }
        .secondary:hover { background: #2d2d2d; border-color: #4b5563; }
      }
    </style>
  </head>
  <body>
    <div class="card text-center">
      <div class="icon-wrapper">
        <svg fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      
      ${errorMessage ? `
      <div class="error-box">
        <div class="error-header">Error</div>
        <div class="error-msg">${escapeHtml(errorMessage)}</div>
        <details class="details">
          <summary>Show technical details</summary>
          <pre>${escapeHtml(errorStack || "No stack trace available")}</pre>
        </details>
      </div>
      ` : ""}

      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
