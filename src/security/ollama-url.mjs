const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function resolveOllamaEndpoint() {
  const raw = process.env.OLLAMA_ENDPOINT || "http://127.0.0.1:11434/v1/chat/completions";
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("OLLAMA_ENDPOINT_INVALID");
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("OLLAMA_ENDPOINT_FORBIDDEN");
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("OLLAMA_ENDPOINT_INVALID");
  return url.toString();
}
