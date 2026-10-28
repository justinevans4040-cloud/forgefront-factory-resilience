/**
 * JSON.parse rejects duplicate object keys silently (last wins). For meta-brief
 * allowlist input we fail closed on any duplicate key at any depth.
 */

function skipWs(s, i) {
  while (i < s.length && /[\s\u00a0]/.test(s[i])) i++;
  return i;
}

function parseValue(s, i, onDup) {
  i = skipWs(s, i);
  const c = s[i];
  if (c === "{") return parseObject(s, i, onDup);
  if (c === "[") return parseArray(s, i, onDup);
  if (c === '"') return parseString(s, i);
  if (c === "t" && s.slice(i, i + 4) === "true") return { value: true, end: i + 4 };
  if (c === "f" && s.slice(i, i + 5) === "false") return { value: false, end: i + 5 };
  if (c === "n" && s.slice(i, i + 4) === "null") return { value: null, end: i + 4 };
  return parseNumber(s, i);
}

function parseString(s, i) {
  if (s[i] !== '"') throw new SyntaxError("EXPECTED_STRING");
  let out = "";
  i++;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '"') return { value: out, end: i + 1 };
    if (ch === "\\") {
      i++;
      if (i >= s.length) throw new SyntaxError("BAD_ESCAPE");
      const esc = s[i];
      if (esc === "u") {
        const hex = s.slice(i + 1, i + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new SyntaxError("BAD_UNICODE");
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
      } else {
        out += ({ n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", '"': '"', "\\": "\\", "/": "/" })[esc] ?? esc;
        i++;
      }
      continue;
    }
    out += ch;
    i++;
  }
  throw new SyntaxError("UNTERMINATED_STRING");
}

function parseNumber(s, i) {
  const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(s.slice(i));
  if (!m) throw new SyntaxError("EXPECTED_NUMBER");
  const raw = m[0];
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new SyntaxError("BAD_NUMBER");
  return { value, end: i + raw.length };
}

function parseArray(s, i, onDup) {
  if (s[i] !== "[") throw new SyntaxError("EXPECTED_ARRAY");
  i++;
  const out = [];
  i = skipWs(s, i);
  if (s[i] === "]") return { value: out, end: i + 1 };
  while (i < s.length) {
    const el = parseValue(s, i, onDup);
    out.push(el.value);
    i = skipWs(s, el.end);
    if (s[i] === "]") return { value: out, end: i + 1 };
    if (s[i] !== ",") throw new SyntaxError("EXPECTED_COMMA");
    i = skipWs(s, i + 1);
  }
  throw new SyntaxError("UNTERMINATED_ARRAY");
}

function parseObject(s, i, onDup) {
  if (s[i] !== "{") throw new SyntaxError("EXPECTED_OBJECT");
  i++;
  const out = Object.create(null);
  const keys = new Set();
  i = skipWs(s, i);
  if (s[i] === "}") return { value: out, end: i + 1 };
  while (i < s.length) {
    const keyPart = parseString(s, i);
    const key = keyPart.value;
    if (keys.has(key)) onDup(key);
    keys.add(key);
    i = skipWs(s, keyPart.end);
    if (s[i] !== ":") throw new SyntaxError("EXPECTED_COLON");
    const val = parseValue(s, skipWs(s, i + 1), onDup);
    out[key] = val.value;
    i = skipWs(s, val.end);
    if (s[i] === "}") return { value: out, end: i + 1 };
    if (s[i] !== ",") throw new SyntaxError("EXPECTED_COMMA");
    i = skipWs(s, i + 1);
  }
  throw new SyntaxError("UNTERMINATED_OBJECT");
}

export function parseJsonStrict(text) {
  const s = String(text ?? "").trim();
  if (!s) throw new Error("DUPLICATE_KEY:empty");
  let dupKey = null;
  const onDup = key => { dupKey = key; };
  const { value, end } = parseValue(s, 0, onDup);
  if (dupKey) throw new Error(`DUPLICATE_KEY:${dupKey}`);
  if (skipWs(s, end) !== s.length) throw new SyntaxError("TRAILING_CONTENT");
  return value;
}

export function parseJsonStrictOrError(text) {
  try {
    return { ok: true, value: parseJsonStrict(text) };
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.startsWith("DUPLICATE_KEY:")) return { ok: false, error: msg };
    return { ok: false, error: `JSON_STRICT:${msg}` };
  }
}
