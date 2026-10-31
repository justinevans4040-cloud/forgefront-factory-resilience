import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createStateCodec } from './state-codec.mjs';
import { protectDirectory } from './private-directory.mjs';

function under(parent, child) {
  const root = resolve(parent) + sep;
  const target = resolve(child);
  return target === resolve(parent) || target.startsWith(root);
}

export function migrateLegacyState({ source, destination, key }) {
  if (!source || !destination || !key || under(source, destination) || under(destination, source) || existsSync(destination)) {
    throw Error('MIGRATION_REQUIRES_NEW_DESTINATION');
  }
  const eventsPath = join(source, 'events.jsonl');
  const anchorPath = join(source, 'anchor.json');
  const sourceEvents = readFileSync(eventsPath);
  const sourceAnchor = readFileSync(anchorPath);
  const sourceDigest = createHash('sha256').update(Buffer.concat([sourceEvents, sourceAnchor])).digest('hex');
  const events = sourceEvents.toString('utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
  const anchor = JSON.parse(sourceAnchor.toString('utf8'));
  let head = 'GENESIS';
  for (const [i, e] of events.entries()) {
    const { eventHash, ...body } = e;
    if (body.sequence !== i + 1 || body.previousHash !== head || createHash('sha256').update(JSON.stringify(body)).digest('hex') !== eventHash) throw Error('LEDGER_TAMPERED');
    head = eventHash;
  }
  const expected = Buffer.from(createHmac('sha256', key).update(head).digest('hex'));
  const actual = Buffer.from(String(anchor.signature ?? ''));
  if (anchor.count !== events.length || anchor.head !== head || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw Error('LEDGER_TAMPERED');
  protectDirectory(destination);
  const codec = createStateCodec(key);
  writeFileSync(join(destination, 'events.jsonl'), events.map((e) => codec.encode(e, 'event')).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  writeFileSync(join(destination, 'anchor.json'), codec.encode(anchor, 'anchor'), { mode: 0o600, flag: 'wx' });
  const unchanged =
    createHash('sha256').update(Buffer.concat([readFileSync(eventsPath), readFileSync(anchorPath)])).digest('hex') === sourceDigest;
  if (!unchanged) throw Error('SOURCE_CHANGED_DURING_MIGRATION');
  return { ok: true, count: events.length, sourceUnchanged: unchanged, sourceDigest, encryption: 'AES-256-GCM' };
}
