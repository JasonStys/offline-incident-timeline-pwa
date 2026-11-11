/**
 * @file Hash only actual bounded public bytes from the same admitted ordinary file descriptor.
 * Functions: createResourceRecorder gives one staging operation a cumulative actual-byte budget.
 * Variables: fixed 16 MiB member and 32 MiB total caps; no check-then-read-by-name operation exists.
 * Line locations: see docs/CODE_INDEX.md for the generated source index.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const { readRegular } = createRequire(import.meta.url)("../desktop/files.cjs");

/** @returns {(file:string)=>{data:Buffer,hash:string}} A fresh staging recorder; hashes are provenance, not signatures. */
export function createResourceRecorder() {
  let total = 0;
  return (file) => {
    const remaining = 32 * 1024 * 1024 - total;
    const data = readRegular(file, Math.min(16 * 1024 * 1024, remaining));
    total += data.length;
    return { data, hash: createHash("sha256").update(data).digest("hex") };
  };
}
