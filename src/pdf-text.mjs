/**
 * Dependency-free PDF text-layer extraction (server-side; uses node:zlib).
 * Supports: FlateDecode streams, object streams (/ObjStm), Type0/Identity-H and simple
 * fonts with /ToUnicode CMaps (bfchar + bfrange), literal and hex strings, Tj / TJ / ' / ",
 * line breaks from Td / TD / T* / Tm. This covers Chrome/Skia "Save as PDF", Word/LibreOffice
 * exports and most generated certificates.
 * Not supported (reported honestly): image-only / scanned PDFs (no OCR in this build),
 * encrypted PDFs, LZW/ASCII85-only streams.
 */
import { inflateSync, constants as zc } from "node:zlib";

const OBJ_RE = /(\d+)\s+(\d+)\s+obj\b/g;
/** Cap decompressed FlateDecode output before allocating attacker-controlled memory. */
export const MAX_INFLATED_BYTES = 8 * 1024 * 1024;

/** Test / intake hook: bounded FlateDecode decompress (returns INFLATE_BOMB when over cap). */
export function tryInflateFlate(buf) {
  const inflated = inflate(buf);
  if (inflated?.error === "INFLATE_BOMB") return { error: "INFLATE_BOMB" };
  if (!inflated) return { error: "INFLATE_FAILED" };
  return { ok: true, length: inflated.length };
}

function inflate(buf) {
  const opts = { maxOutputLength: MAX_INFLATED_BYTES };
  try { return inflateSync(buf, opts); } catch (e) {
    if (e?.code === "ERR_BUFFER_TOO_LARGE") return { error: "INFLATE_BOMB" };
  }
  try { return inflateSync(buf, { ...opts, finishFlush: zc.Z_SYNC_FLUSH }); } catch (e) {
    if (e?.code === "ERR_BUFFER_TOO_LARGE") return { error: "INFLATE_BOMB" };
  }
  return null;
}

function parseObjects(bin) {
  const raw = bin.toString("latin1");
  const objects = new Map();
  let m;
  OBJ_RE.lastIndex = 0;
  while ((m = OBJ_RE.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endobj", start);
    if (end < 0) break;
    const chunk = raw.slice(start, end);
    const sIdx = chunk.search(/\bstream\r?\n/);
    let dict = chunk, stream = null;
    if (sIdx >= 0) {
      dict = chunk.slice(0, sIdx);
      const nl = chunk.indexOf("\n", sIdx) + 1;
      const lenMatch = dict.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
      let eIdx = lenMatch ? nl + Number(lenMatch[1]) : -1;
      if (eIdx < 0 || chunk.slice(eIdx, eIdx + 30).search(/endstream/) < 0) eIdx = chunk.lastIndexOf("endstream");
      const absStart = start + nl;
      stream = bin.subarray(absStart, start + eIdx);
    }
    objects.set(Number(m[1]), { dict, stream });
    OBJ_RE.lastIndex = end;
  }
  return objects;
}

function decodeStream(obj) {
  if (!obj?.stream) return null;
  const filters = (obj.dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)?.[1] || "").match(/\/\w+/g) || [];
  let data = obj.stream;
  for (const f of filters) {
    if (f === "/FlateDecode" || f === "/Fl") {
      const inflated = inflate(data);
      if (inflated?.error === "INFLATE_BOMB") return { error: "INFLATE_BOMB" };
      data = inflated;
      if (!data) return null;
    } else {
      return null;
    }
  }
  return data;
}

function expandObjectStreams(objects) {
  for (const [, obj] of [...objects]) {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const data = decodeStream(obj);
    if (!data) continue;
    const n = Number(obj.dict.match(/\/N\s+(\d+)/)?.[1] || 0);
    const first = Number(obj.dict.match(/\/First\s+(\d+)/)?.[1] || 0);
    const text = data.toString("latin1");
    const header = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const num = header[i * 2];
      const off = first + header[i * 2 + 1];
      const next = i + 1 < n ? first + header[(i + 1) * 2 + 1] : text.length;
      if (!objects.has(num)) objects.set(num, { dict: text.slice(off, next), stream: null });
    }
  }
}

const refsIn = s => [...String(s).matchAll(/(\d+)\s+\d+\s+R/g)].map(m => Number(m[1]));

function resolveDict(objects, dict, key) {
  const direct = dict.match(new RegExp(`/${key}\\s*<<`));
  if (direct) {
    let depth = 0, i = direct.index + direct[0].length - 2;
    for (let j = i; j < dict.length - 1; j++) {
      if (dict[j] === "<" && dict[j + 1] === "<") { depth++; j++; }
      else if (dict[j] === ">" && dict[j + 1] === ">") { depth--; j++; if (depth === 0) return dict.slice(i, j + 1); }
    }
    return dict.slice(i);
  }
  const ref = dict.match(new RegExp(`/${key}\\s+(\\d+)\\s+\\d+\\s+R`));
  return ref ? objects.get(Number(ref[1]))?.dict || "" : "";
}

function hexToBytes(hex) {
  const clean = hex.replace(/[^0-9a-f]/gi, "");
  const padded = clean.length % 2 ? clean + "0" : clean;
  const out = [];
  for (let i = 0; i < padded.length; i += 2) out.push(parseInt(padded.slice(i, i + 2), 16));
  return out;
}
function utf16beHex(hex) {
  const b = hexToBytes(hex);
  let s = "";
  for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
  return s;
}

export function parseToUnicodeCMap(text) {
  const map = new Map();
  let codeBytes = 1;
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) {
      codeBytes = Math.max(codeBytes, m[1].length / 2);
      map.set(parseInt(m[1], 16), utf16beHex(m[2]));
    }
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const m of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g)) {
      codeBytes = Math.max(codeBytes, m[1].length / 2);
      const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16);
      if (hi - lo > 65535) continue;
      if (m[3].startsWith("[")) {
        const items = [...m[3].matchAll(/<([0-9a-fA-F]*)>/g)].map(x => utf16beHex(x[1]));
        for (let c = lo; c <= hi && c - lo < items.length; c++) map.set(c, items[c - lo]);
      } else {
        const base = utf16beHex(m[3].slice(1, -1));
        const lastCode = base.charCodeAt(base.length - 1);
        for (let c = lo; c <= hi; c++) map.set(c, base.slice(0, -1) + String.fromCharCode(lastCode + (c - lo)));
      }
    }
  }
  return { map, codeBytes };
}

function fontDecoders(objects, resourcesDict) {
  const fonts = new Map();
  const fontDict = resolveDict(objects, resourcesDict, "Font");
  for (const m of fontDict.matchAll(/\/([^\s/<>\[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
    const fobj = objects.get(Number(m[2]));
    if (!fobj) continue;
    const isType0 = /\/Subtype\s*\/Type0/.test(fobj.dict);
    const tu = fobj.dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    let cmap = null;
    if (tu) {
      const data = decodeStream(objects.get(Number(tu[1])));
      if (data) cmap = parseToUnicodeCMap(data.toString("latin1"));
    }
    fonts.set(m[1], { codeBytes: cmap?.codeBytes || (isType0 ? 2 : 1), map: cmap?.map || null });
  }
  return fonts;
}

function decodeWithFont(bytes, font) {
  if (!font?.map) return String.fromCharCode(...bytes);
  const n = font.codeBytes;
  let s = "";
  for (let i = 0; i + n - 1 < bytes.length; i += n) {
    let code = 0;
    for (let k = 0; k < n; k++) code = (code << 8) | bytes[i + k];
    s += font.map.get(code) ?? (n === 1 ? String.fromCharCode(code) : "");
  }
  return s;
}

/** Tokenize a content stream and emit text with line structure. */
export function extractTextFromContent(content, fonts = new Map()) {
  const src = content;
  let i = 0;
  const stack = [];
  let font = null;
  let fontSize = 12;
  let out = "";
  let lastY = null;
  const newline = () => { if (out && !out.endsWith("\n")) out += "\n"; };
  const readString = () => {
    const bytes = [];
    let depth = 1;
    i++;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "\\") {
        const n = src[i + 1];
        const esc = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 };
        if (n in esc) { bytes.push(esc[n]); i += 2; continue; }
        if (/[0-7]/.test(n)) { const oct = src.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0]; bytes.push(parseInt(oct, 8) & 255); i += 1 + oct.length; continue; }
        if (n === "\r" || n === "\n") { i += 2; if (n === "\r" && src[i] === "\n") i++; continue; }
        i += 2; continue;
      }
      if (c === "(") depth++;
      if (c === ")") { depth--; if (depth === 0) { i++; break; } }
      bytes.push(c.charCodeAt(0) & 255);
      i++;
    }
    return { str: bytes };
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === "%") { while (i < src.length && src[i] !== "\n") i++; continue; }
    if (c === "(") { stack.push(readString()); continue; }
    if (c === "<" && src[i + 1] !== "<") { const e = src.indexOf(">", i); stack.push({ str: hexToBytes(src.slice(i + 1, e)) }); i = e + 1; continue; }
    if (c === "<" || c === ">") { i += 2; continue; }
    if (c === "[") { stack.push({ arrStart: true }); i++; continue; }
    if (c === "]") {
      const arr = [];
      while (stack.length && !stack[stack.length - 1].arrStart) arr.unshift(stack.pop());
      stack.pop();
      stack.push({ arr });
      i++; continue;
    }
    if (c === "/") { const m = src.slice(i).match(/^\/[^\s/<>\[\]()%{}]*/); stack.push({ name: m[0].slice(1) }); i += m[0].length; continue; }
    const tok = src.slice(i).match(/^[^\s/<>\[\]()%{}]+/);
    if (!tok) { i++; continue; }
    i += tok[0].length;
    const t = tok[0];
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) { stack.push({ num: Number(t) }); continue; }
    const nums = stack.filter(x => "num" in x).map(x => x.num);
    switch (t) {
      case "Tf": font = fonts.get(stack.find(x => "name" in x)?.name) || null; fontSize = Math.abs(nums[nums.length - 1] || 12) || 12; break;
      case "Td": case "TD": {
        // Vertical move = new line; a horizontal jump wider than ~1.5 em = word gap.
        if (nums.length >= 2 && nums[nums.length - 1] !== 0) newline();
        else if (nums.length >= 2 && Math.abs(nums[nums.length - 2]) > fontSize * 1.5 && out && !/\s$/.test(out)) out += " ";
        break;
      }
      case "T*": newline(); break;
      case "Tm": { const y = nums[nums.length - 1]; if (lastY !== null && Math.abs(y - lastY) > 0.5) newline(); lastY = y; break; }
      case "Tj": { const s = stack.filter(x => x.str).pop(); if (s) out += decodeWithFont(s.str, font); break; }
      case "'": case "\"": { newline(); const s = stack.filter(x => x.str).pop(); if (s) out += decodeWithFont(s.str, font); break; }
      case "TJ": {
        const a = stack.filter(x => x.arr).pop();
        for (const item of a?.arr || []) {
          if (item.str) out += decodeWithFont(item.str, font);
          else if ("num" in item && item.num < -180 && !/\s$/.test(out)) out += " ";
        }
        break;
      }
      case "ET": break;
      default: break;
    }
    stack.length = 0;
  }
  return out;
}

export function extractPdfText(bin) {
  if (/\/Encrypt\b/.test(bin.toString("latin1"))) return { text: "", method: "pdf-text-layer", reason: "ENCRYPTED_PDF", pageCount: 0 };
  let inflateRejected = false;
  const objects = parseObjects(bin);
  expandObjectStreams(objects);
  const pages = [...objects.values()].filter(o => /\/Type\s*\/Page(?!s)\b/.test(o.dict));
  const parts = [];
  let compressed = false;
  for (const page of pages) {
    const resources = resolveDict(objects, page.dict, "Resources") || page.dict;
    const fonts = fontDecoders(objects, resources);
    const contentsRef = page.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/)?.[1] || "";
    for (const num of refsIn(contentsRef)) {
      const obj = objects.get(num);
      if (obj?.dict.includes("/FlateDecode")) compressed = true;
      const decoded = decodeStream(obj);
      if (decoded?.error === "INFLATE_BOMB") { inflateRejected = true; continue; }
      const data = decoded || (obj?.stream && !/\/Filter/.test(obj.dict) ? obj.stream : null);
      if (data) parts.push(extractTextFromContent(data.toString("latin1"), fonts));
    }
  }
  if (inflateRejected) {
    return { text: "", pageCount: pages.length, compressed: true, method: "pdf-text-layer", reason: "INFLATE_BOMB" };
  }
  const text = parts.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, pageCount: pages.length, compressed, method: "pdf-text-layer (FlateDecode + ToUnicode)" };
}
