import type { AdapterPollResult, AdapterSubmitResult, GenerateRequest, GenerationJob } from '../types.js';
import { config } from '../lib/config.js';

function extractOutputUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const directKeys = ['video_url', 'videoUrl', 'output_url', 'outputUrl', 'url'];
  for (const key of directKeys) {
    if (typeof record[key] === 'string') return record[key] as string;
  }
  const nested = record.output || record.result || record.data;
  if (Array.isArray(nested)) {
    const firstString = nested.find((item) => typeof item === 'string');
    if (firstString) return firstString;
    const firstObject = nested.find((item) => item && typeof item === 'object') as Record<string, unknown> | undefined;
    if (firstObject) return extractOutputUrl(firstObject);
  }
  if (nested && typeof nested === 'object') return extractOutputUrl(nested);
  return undefined;
}

function extractJobId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  for (const key of ['id', 'job_id', 'jobId', 'generation_id', 'generationId']) {
    if (typeof record[key] === 'string') return record[key] as string;
  }
  return undefined;
}

function extractStatus(data: unknown): AdapterPollResult['status'] | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const raw = typeof record.status === 'string' ? record.status.toLowerCase() : '';
  if (['completed', 'complete', 'succeeded', 'success', 'done'].includes(raw)) return 'completed';
  if (['failed', 'error', 'cancelled', 'canceled'].includes(raw)) return 'failed';
  if (['running', 'processing', 'started'].includes(raw)) return 'running';
  if (['queued', 'pending'].includes(raw)) return 'queued';
  return undefined;
}

export async function submitToLtx(request: GenerateRequest): Promise<AdapterSubmitResult> {
  if (!config.ltxApiKey) {
    throw new Error('LTX_API_KEY is missing. Add it to backend/.env or switch to Wan/Mochi ComfyUI mode.');
  }

  const url = `${config.ltxApiBaseUrl.replace(/\/$/, '')}${config.ltxApiEndpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.ltxApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: request.prompt,
      negative_prompt: request.negativePrompt,
      mode: request.mode,
      image_url: request.imageUrl,
      duration: request.duration,
      resolution: request.resolution,
      fps: request.fps,
      steps: request.steps,
      seed: request.seed
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`LTX request failed: ${JSON.stringify(data)}`);
  }

  const outputUrl = extractOutputUrl(data);
  return {
    provider: 'ltx',
    status: outputUrl ? 'completed' : 'running',
    providerJobId: extractJobId(data),
    outputUrl,
    message: outputUrl ? 'LTX returned an output URL.' : 'LTX job submitted. Polling endpoint will check status.',
    raw: data
  };
}

export async function pollLtx(job: GenerationJob): Promise<AdapterPollResult> {
  if (!job.providerJobId || !config.ltxApiKey) return {};

  const endpoint = config.ltxStatusEndpointTemplate.replace('{{JOB_ID}}', encodeURIComponent(job.providerJobId));
  const url = `${config.ltxApiBaseUrl.replace(/\/$/, '')}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.ltxApiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { status: 'running', message: 'LTX status check is not ready or endpoint format needs adjustment.', raw: data };
  }

  const outputUrl = extractOutputUrl(data);
  const status = outputUrl ? 'completed' : extractStatus(data) || 'running';
  return {
    status,
    outputUrl,
    message: status === 'completed' ? 'LTX generation completed.' : 'LTX generation still processing.',
    raw: data
  };
}
