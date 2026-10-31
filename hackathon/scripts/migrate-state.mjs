import { migrateLegacyState } from '../src/security/migrate-state.mjs';
try{console.log(JSON.stringify(migrateLegacyState({source:process.env.HACKATHON_STATE_DIR,destination:process.env.HACKATHON_MIGRATION_DESTINATION,key:process.env.HACKATHON_LEDGER_KEY})));}
catch{console.error('Migration refused. Verify source integrity, stable key and a new destination. Source was not modified.');process.exitCode=1;}
