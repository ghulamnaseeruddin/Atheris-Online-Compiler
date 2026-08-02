// Consumes POST /api/execute/stream, which sends newline-delimited JSON
// events as they happen (see backend/src/routes/execute.js for the exact
// shape) rather than one JSON blob at the end. Deliberately not
// EventSource/SSE: EventSource can only send GET requests with no custom
// headers, and code + auth token don't fit that.
//
// `onEvent` is called once per event, in order, as soon as it arrives:
//   { type: "deps" | "build" | "stdout" | "stderr", chunk: string }
//   { type: "done", status: string, executionTimeMs: number }
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function streamExecute({ language, code, stdin, fileName }, onEvent, { signal } = {}) {
  const token = localStorage.getItem("atheris_token");

  const res = await fetch(`${API_BASE}/execute/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language, code, stdin, fileName }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeLine = (line) => {
    if (!line.trim()) return;
    try {
      onEvent(JSON.parse(line));
    } catch {
      // A malformed/partial line should never take down the whole run —
      // just drop it rather than throwing mid-stream.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // last (possibly partial) line stays buffered
    for (const line of lines) consumeLine(line);
  }
  if (buffer) consumeLine(buffer);
}
