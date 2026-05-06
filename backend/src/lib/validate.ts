import type { GenerateRequest } from '../types.js';

const allowedModels = new Set(['ltx2', 'wan22', 'mochi1']);
const allowedModes = new Set(['text-to-video', 'image-to-video']);

export function validateGenerateRequest(body: unknown): GenerateRequest {
  if (!body || typeof body !== 'object') throw new Error('Request body must be an object.');
  const input = body as Record<string, unknown>;

  if (typeof input.model !== 'string' || !allowedModels.has(input.model)) {
    throw new Error('model must be one of: ltx2, wan22, mochi1.');
  }

  if (typeof input.mode !== 'string' || !allowedModes.has(input.mode)) {
    throw new Error('mode must be text-to-video or image-to-video.');
  }

  if (typeof input.prompt !== 'string' || input.prompt.trim().length < 3) {
    throw new Error('prompt is required and must be at least 3 characters.');
  }

  if (input.mode === 'image-to-video' && (!input.imageUrl || typeof input.imageUrl !== 'string')) {
    throw new Error('imageUrl is required for image-to-video mode.');
  }

  return {
    model: input.model as GenerateRequest['model'],
    mode: input.mode as GenerateRequest['mode'],
    prompt: input.prompt.trim(),
    negativePrompt: typeof input.negativePrompt === 'string' ? input.negativePrompt : undefined,
    imageUrl: typeof input.imageUrl === 'string' ? input.imageUrl : undefined,
    duration: typeof input.duration === 'number' ? input.duration : 5,
    resolution: typeof input.resolution === 'string' ? input.resolution : '1280x720',
    fps: typeof input.fps === 'number' ? input.fps : 24,
    frames: typeof input.frames === 'number' ? input.frames : undefined,
    steps: typeof input.steps === 'number' ? input.steps : 28,
    seed: typeof input.seed === 'number' ? input.seed : undefined
  };
}
