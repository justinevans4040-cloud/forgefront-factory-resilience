// Test-only preload: preserve scratch evidence under the no-deletion run instruction.
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { resolve, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';
fs.rm=async target=>{
 const path=resolve(String(target));
 if(dirname(path)!==resolve(tmpdir())||!basename(path).startsWith('ff-smoke-'))throw Error('SCRATCH_DELETION_BLOCKED');
 // Intentionally retain the isolated smoke directory; never remove source/state.
};
syncBuiltinESMExports();
