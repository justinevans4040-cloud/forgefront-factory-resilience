import {readFileSync, writeFileSync} from 'node:fs';

function stripOpenGate(src) {
  const marker = "document.querySelector('#workspace-switcher').open";
  while (src.includes(marker)) {
    const at = src.indexOf(marker);
    // Walk backward to the controlling if(
    let start = src.lastIndexOf('if(', at);
    if (start < 0) throw new Error('if start missing');
    // Find matching closing } for this if block by scanning braces from start.
    let i = src.indexOf('{', start);
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    src = src.slice(0, start) + src.slice(i);
  }
  return src;
}

for (const rel of ['browser-smoke.mjs', 'primary-guide-smoke.mjs']) {
  const path = new URL('./' + rel, import.meta.url);
  let src = stripOpenGate(readFileSync(path, 'utf8'));
  src = src.replaceAll('#workspace-switcher summary', '#workspace-switcher button');
  if (src.includes("workspace-switcher').open") || src.includes('workspace-switcher summary')) {
    throw new Error('residual disclosure refs in ' + rel);
  }
  writeFileSync(path, src);
  console.log('fixed', rel, 'len', src.length);
}
