import fs from 'node:fs/promises';
import path from 'node:path';
import type { GenerationJob } from '../types.js';

const storageDir = path.resolve(process.cwd(), 'storage');
const storageFile = path.join(storageDir, 'jobs.json');

let jobs = new Map<string, GenerationJob>();
let hydrated = false;

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await fs.readFile(storageFile, 'utf8');
    const parsed = JSON.parse(raw) as GenerationJob[];
    jobs = new Map(parsed.map((job) => [job.id, job]));
  } catch {
    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(storageFile, '[]', 'utf8');
  }
}

async function persist() {
  await fs.mkdir(storageDir, { recursive: true });
  await fs.writeFile(storageFile, JSON.stringify([...jobs.values()], null, 2), 'utf8');
}

export async function saveJob(job: GenerationJob): Promise<GenerationJob> {
  await hydrate();
  jobs.set(job.id, job);
  await persist();
  return job;
}

export async function getJob(id: string): Promise<GenerationJob | undefined> {
  await hydrate();
  return jobs.get(id);
}

export async function updateJob(id: string, patch: Partial<GenerationJob>): Promise<GenerationJob | undefined> {
  await hydrate();
  const current = jobs.get(id);
  if (!current) return undefined;
  const updated: GenerationJob = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  jobs.set(id, updated);
  await persist();
  return updated;
}

export async function listJobs(): Promise<GenerationJob[]> {
  await hydrate();
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
