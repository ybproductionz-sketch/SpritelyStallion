import fs from 'node:fs/promises';
import type { AdapterPollResult, AdapterSubmitResult, GenerateRequest, ModelId, GenerationJob } from '../types.js';
import { config } from '../lib/config.js';

function workflowPathForModel(model: ModelId) {
  if (model === 'wan22') return config.wanWorkflowPath;
  if (model === 'mochi1') return config.mochiWorkflowPath;
  throw new Error(`ComfyUI workflow is not configured for model ${model}`);
}

function parseResolution(resolution = '1280x720') {
  const [width, height] = resolution.split('x').map((value) => Number(value));
  return {
    width: Number.isFinite(width) ? width : 1280,
    height: Number.isFinite(height) ? height : 720
  };
}

function escapeForJsonString(value: unknown): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function buildWorkflow(request: GenerateRequest) {
  const filePath = workflowPathForModel(request.model);
  const template = await fs.readFile(filePath, 'utf8');
  const { width, height } = parseResolution(request.resolution);
  const seed = request.seed ?? Math.floor(Math.random() * 2147483647);
  const fps = request.fps ?? 24;
  const duration = request.duration ?? 5;
  const frames = request.frames ?? fps * duration;

  const replaced = template
    .replaceAll('{{PROMPT}}', escapeForJsonString(request.prompt))
    .replaceAll('{{NEGATIVE_PROMPT}}', escapeForJsonString(request.negativePrompt || ''))
    .replaceAll('{{IMAGE_URL}}', escapeForJsonString(request.imageUrl || ''))
    .replaceAll('{{SEED}}', String(seed))
    .replaceAll('{{WIDTH}}', String(width))
    .replaceAll('{{HEIGHT}}', String(height))
    .replaceAll('{{FPS}}', String(fps))
    .replaceAll('{{FRAMES}}', String(frames))
    .replaceAll('{{STEPS}}', String(request.steps ?? 28));

  try {
    return JSON.parse(replaced);
  } catch (error) {
    throw new Error(`Workflow JSON is invalid after replacement: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

function findOutputUrl(history: unknown): string | undefined {
  if (!history || typeof history !== 'object') return undefined;
  const historyRecord = history as Record<string, unknown>;
  const firstHistory = Object.values(historyRecord)[0];
  if (!firstHistory || typeof firstHistory !== 'object') return undefined;

  const outputs = (firstHistory as Record<string, unknown>).outputs;
  if (!outputs || typeof outputs !== 'object') return undefined;

  for (const nodeOutput of Object.values(outputs as Record<string, unknown>)) {
    if (!nodeOutput || typeof nodeOutput !== 'object') continue;
    const record = nodeOutput as Record<string, unknown>;
    const candidates = [record.videos, record.gifs, record.images].filter(Array.isArray) as Array<Array<Record<string, unknown>>>;

    for (const list of candidates) {
      const item = list[0];
      if (!item || typeof item.filename !== 'string') continue;
      const params = new URLSearchParams({
        filename: item.filename,
        subfolder: typeof item.subfolder === 'string' ? item.subfolder : '',
        type: typeof item.type === 'string' ? item.type : 'output'
      });
      return `${config.comfyBaseUrl.replace(/\/$/, '')}/view?${params.toString()}`;
    }
  }

  return undefined;
}

export async function submitToComfy(request: GenerateRequest): Promise<AdapterSubmitResult> {
  const workflow = await buildWorkflow(request);
  const url = `${config.comfyBaseUrl.replace(/\/$/, '')}/prompt`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: config.comfyClientId })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`ComfyUI request failed: ${JSON.stringify(data)}`);
  }

  const promptId = typeof data.prompt_id === 'string' ? data.prompt_id : undefined;
  return {
    provider: 'comfy',
    status: promptId ? 'running' : 'queued',
    providerJobId: promptId,
    message: promptId ? 'ComfyUI workflow submitted.' : 'ComfyUI accepted the request, but no prompt_id was returned.',
    raw: data
  };
}

export async function pollComfy(job: GenerationJob): Promise<AdapterPollResult> {
  if (!job.providerJobId) return {};
  const url = `${config.comfyBaseUrl.replace(/\/$/, '')}/history/${encodeURIComponent(job.providerJobId)}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: 'running', message: 'ComfyUI history is not available yet.', raw: data };
  }

  const outputUrl = findOutputUrl(data);
  if (outputUrl) {
    return { status: 'completed', outputUrl, message: 'ComfyUI generation completed.', raw: data };
  }

  return { status: 'running', message: 'ComfyUI generation still processing.', raw: data };
}
