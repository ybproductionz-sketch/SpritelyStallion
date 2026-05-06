import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import type { GenerationJob } from './types.js';
import { config } from './lib/config.js';
import { validateGenerateRequest } from './lib/validate.js';
import { getJob, listJobs, saveJob, updateJob } from './lib/jobStore.js';
import { submitToLtx, pollLtx } from './adapters/ltx.js';
import { submitToComfy, pollComfy } from './adapters/comfy.js';

const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin }));
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ai-video-forge-backend',
    adapters: {
      ltx: Boolean(config.ltxApiKey),
      comfy: config.comfyBaseUrl
    }
  });
});

app.get('/api/models', (_req, res) => {
  res.json([
    { id: 'ltx2', label: 'LTX-2', provider: 'ltx', modes: ['text-to-video', 'image-to-video'] },
    { id: 'wan22', label: 'Wan 2.2', provider: 'comfy', modes: ['text-to-video', 'image-to-video'] },
    { id: 'mochi1', label: 'Mochi 1', provider: 'comfy', modes: ['text-to-video'] }
  ]);
});

app.get('/api/jobs', async (_req, res, next) => {
  try {
    res.json(await listJobs());
  } catch (error) {
    next(error);
  }
});

app.post('/api/generate', async (req, res, next) => {
  try {
    const request = validateGenerateRequest(req.body);
    const now = new Date().toISOString();
    const id = randomUUID();

    const provider = request.model === 'ltx2' ? 'ltx' : 'comfy';
    const baseJob: GenerationJob = {
      id,
      model: request.model,
      provider,
      status: 'queued',
      message: 'Job created.',
      createdAt: now,
      updatedAt: now,
      request
    };
    await saveJob(baseJob);

    try {
      const submitted = request.model === 'ltx2' ? await submitToLtx(request) : await submitToComfy(request);
      const updated = await updateJob(id, {
        provider: submitted.provider,
        status: submitted.status,
        message: submitted.message,
        providerJobId: submitted.providerJobId,
        outputUrl: submitted.outputUrl,
        raw: submitted.raw
      });
      res.status(202).json(updated);
    } catch (adapterError) {
      const failed = await updateJob(id, {
        status: 'failed',
        message: adapterError instanceof Error ? adapterError.message : 'Model adapter failed.'
      });
      res.status(500).json(failed);
    }
  } catch (error) {
    next(error);
  }
});

app.get('/api/jobs/:id', async (req, res, next) => {
  try {
    const job = await getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    if (job.status === 'running' || job.status === 'queued') {
      const patch = job.provider === 'ltx' ? await pollLtx(job) : await pollComfy(job);
      const updated = Object.keys(patch).length > 0 ? await updateJob(job.id, patch) : job;
      return res.json(updated);
    }

    return res.json(job);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : 'Unknown server error.';
  res.status(400).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`AI Video Forge backend running on http://localhost:${config.port}`);
});
