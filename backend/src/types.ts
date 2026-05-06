export type ModelId = 'ltx2' | 'wan22' | 'mochi1';
export type Mode = 'text-to-video' | 'image-to-video';
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type Provider = 'ltx' | 'comfy';

export type GenerateRequest = {
  model: ModelId;
  mode: Mode;
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  duration?: number;
  resolution?: string;
  fps?: number;
  frames?: number;
  steps?: number;
  seed?: number;
};

export type GenerationJob = {
  id: string;
  model: ModelId;
  provider: Provider;
  status: JobStatus;
  message?: string;
  providerJobId?: string;
  outputUrl?: string;
  createdAt: string;
  updatedAt: string;
  request: GenerateRequest;
  raw?: unknown;
};

export type AdapterSubmitResult = {
  provider: Provider;
  status: JobStatus;
  message?: string;
  providerJobId?: string;
  outputUrl?: string;
  raw?: unknown;
};

export type AdapterPollResult = Partial<Pick<GenerationJob, 'status' | 'message' | 'outputUrl' | 'raw'>>;
