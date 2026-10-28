import http from "node:http";
/** Shared operator session bootstrap for HTTP integration tests. */
export async function createTestSession(baseUrl) {
  const res = await fetch(`${baseUrl}/api/session`);
  if (!res.ok) throw new Error(`session bootstrap failed: ${res.status}`);
  const data = await res.json();
  const jsonHeaders = {
    "Content-Type": "application/json",
    "X-Session-Token": data.sessionToken,
    "X-CSRF-Token": data.csrfToken
  };
  return { ...data, jsonHeaders };
}

/** Ask the OS for a free loopback port (avoids random-port collisions between parallel test files). */
export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
  });
}
