import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
fs.rm=async()=>{};
syncBuiltinESMExports();
