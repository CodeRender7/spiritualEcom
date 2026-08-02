import { createRequire } from 'node:module';
import process from 'node:process';
const require = createRequire(import.meta.url);
const lbugPath = "C:/Users/raj90/AppData/Local/pnpm/store/v11/links/@/gitnexus/1.6.9/da6107e205edd91a009754dc8e345fa5f70cd76d256a23ac4df0d951e0626e5b/node_modules/@ladybugdb/core";

// Add @ladybugdb/core to PATH so Windows loader can resolve dependencies from it
process.env.PATH = lbugPath + ";" + process.env.PATH;

const lbugModule = require(lbugPath);
const lbug = lbugModule.default ?? lbugModule;
const db = new lbug.Database(':memory:', 0, false, false, 67108864);
const conn = new lbug.Connection(db);
try {
  console.log("Loading fts extension...");
  await conn.query('LOAD EXTENSION fts');
  console.log("Success!");
} catch (err) {
  console.error("Failed:", err);
} finally {
  await conn.close();
  await db.close();
}
