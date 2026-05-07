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

function publicConfigStatus() {
  const comfyLooksLocal = config.comfyBaseUrl.includes('127.0.0.1') || config.comfyBaseUrl.includes('localhost');
  return {
    ltx: {
      configured: Boolean(config.ltxApiKey),
      message: config.ltxApiKey ? 'LTX API key is configured.' : 'LTX_API_KEY is missing in Render environment variables.'
    },
    comfy: {
      configured: Boolean(config.comfyBaseUrl) && !comfyLooksLocal,
      baseUrl: config.comfyBaseUrl,
      message: comfyLooksLocal
        ? 'COMFY_BASE_URL points to localhost. Render cannot reach your personal computer. Use a public ComfyUI/RunPod URL.'
        : 'ComfyUI base URL is configured.'
    }
  };
}

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><head><title>SpritelyStallion Backend</title></head><body style="font-family:system-ui;background:#080810;color:#f7f2e8;padding:32px"><h1>SpritelyStallion Backend</h1><p>Backend is running.</p><p>Health: <a style="color:#ffd88a" href="/api/health">/api/health</a></p></body></html>`);
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'ai-video-forge-backend',
    port: config.port,
    adapters: publicConfigStatus()
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
        message: adapterError instanceof Error ? adapterError.message : 'Model adapter failed.',
        raw: {
          adapter: provider,
          config: publicConfigStatus()
        }
      });
      res.status(200).json(failed);
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
