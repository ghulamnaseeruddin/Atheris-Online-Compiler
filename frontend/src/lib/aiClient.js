const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

// Streams a chat completion from the backend's OpenAI-compatible SSE proxy.
// onDelta(text) is called for every incremental chunk of assistant text;
// onDone() when the stream ends cleanly; onError(message) on any failure.
export async function streamAIChat(messages, { onDelta, onDone, onError, signal }) {
  const token = localStorage.getItem("atheris_token");
  console.log("[aiClient] sending request to", `${API_BASE}/ai/chat`, "token present:", !!token);

  let res;
  try {
    res = await fetch(`${API_BASE}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ messages }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return;
    onError("Couldn't reach the server. Check your connection and try again.");
    return;
  }
  console.log("[aiClient] response received, status:", res.status, "content-type:", res.headers.get("content-type"));
  // If the AI generated a file instead of a text stream, the backend sends
  // back a normal one-time JSON response (not SSE) — handle that first.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    let data;
    try {
      data = await res.json();
    } catch {
      onError("Something went wrong talking to the AI assistant.");
      return;
    }
   if (data?.type === "file") {
      const backendOrigin = API_BASE.replace(/\/api\/?$/, "");
      const fullDownloadUrl = data.downloadUrl.startsWith("http")
        ? data.downloadUrl
        : `${backendOrigin}${data.downloadUrl}`;
      onDone({ type: "file", downloadUrl: fullDownloadUrl, filename: data.filename, reply: data.reply });
      return;
    }
    onError(data?.message || "Something went wrong talking to the AI assistant.");
    return;
  }

  if (!res.ok || !res.body) {
    let message = "Something went wrong talking to the AI assistant.";
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // response wasn't JSON — keep the default message
    }
    onError(message);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onDelta(delta);
        } catch {
          // ignore malformed / partial chunk
        }
      }
    }
    onDone();
  } catch (err) {
    if (err.name === "AbortError") return;
    onError("The response was interrupted. Please try again.");
  }
}

// Splits assistant markdown-ish text into alternating text/code segments so
// the UI can render fenced code blocks with their own copy/insert actions.
export function parseMessageSegments(content) {
  const segments = [];
  const fenceRe = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fenceRe.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", lang: match[1] || "", content: match[2].replace(/\n$/, "") });
    lastIndex = fenceRe.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", content: content.slice(lastIndex) });
  }
  return segments.length ? segments : [{ type: "text", content }];
}
