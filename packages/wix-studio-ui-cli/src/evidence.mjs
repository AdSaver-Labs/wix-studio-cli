import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export function defaultEvidencePath(command) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return resolve(process.cwd(), 'evidence', `${stamp}-${command}.jsonl`);
}

export async function logEvidence(path, event) {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await appendFile(resolved, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n');
  return resolved;
}

export async function writeArtifact(path, payload, encoding = 'utf8') {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, payload, encoding);
  return resolved;
}
