import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CloudLightning,
  Cpu,
  Film,
  Gauge,
  Image as ImageIcon,
  Loader2,
  Play,
  RadioTower,
  Settings2,
  Sparkles,
  Wand2
} from 'lucide-react';

type ModelId = 'ltx2' | 'wan22' | 'mochi1';
type Mode = 'text-to-video' | 'image-to-video';
type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

type Job = {
  id: string;
  model: ModelId;
  status: JobStatus;
  message?: string;
  providerJobId?: string;
  outputUrl?: string;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

const modelCards: Record<ModelId, { label: string; lane: string; icon: typeof Sparkles; desc: string }> = {
  ltx2: {
    label: 'LTX-2',
    lane: 'Hosted/API lane',
    icon: CloudLightning,
    desc: 'Best for polished pro jobs, audio-video direction, and API-backed generation.'
  },
  wan22: {
    label: 'Wan 2.2',
    lane: 'ComfyUI cinematic lane',
    icon: Camera,
    desc: 'Best for cinematic motion, 720p workflows, character scenes, and image-to-video shots.'
  },
  mochi1: {
    label: 'Mochi 1',
    lane: 'Open-source motion lane',
    icon: BrainCircuit,
    desc: 'Best for local/open-source text-to-video experiments and repeatable workflow testing.'
  }
};

const presets = [
  'cinematic close-up, soft practical lighting, shallow depth of field, slow dolly push, high detail',
  'anime-inspired hero shot, dramatic rim light, clean linework, dynamic camera orbit, premium trailer look',
  'luxury product reveal, glossy reflections, black and gold studio lighting, smooth turntable camera movement',
  'Brooklyn night street scene, wet pavement, neon bodega lights, handheld documentary texture, realistic motion'
];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(' ');
}

async function postGenerate(payload: unknown): Promise<Job> {
  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Generation failed with ${response.status}`);
  }
  return response.json();
}

async function fetchJob(id: string): Promise<Job> {
  const response = await fetch(`${API_BASE}/api/jobs/${id}`);
  if (!response.ok) throw new Error(`Could not read job ${id}`);
  return response.json();
}

async function fetchHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  if (!response.ok) throw new Error('Backend offline');
  return response.json();
}

export function App() {
  const [model, setModel] = useState<ModelId>('wan22');
  const [mode, setMode] = useState<Mode>('text-to-video');
  const [prompt, setPrompt] = useState(presets[0]);
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, warped anatomy, jitter, unreadable text');
  const [imageUrl, setImageUrl] = useState('');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('1280x720');
  const [fps, setFps] = useState(24);
  const [steps, setSteps] = useState(28);
  const [seed, setSeed] = useState<number | ''>('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');

  const selectedModel = modelCards[model];
  const SelectedIcon = selectedModel.icon;

  const frames = useMemo(() => Math.max(1, duration * fps), [duration, fps]);

  useEffect(() => {
    fetchHealth()
      .then(() => setHealth('online'))
      .catch(() => setHealth('offline'));
  }, []);

  useEffect(() => {
    const active = jobs.filter((job) => job.status === 'queued' || job.status === 'running');
    if (active.length === 0) return undefined;

    const timer = window.setInterval(async () => {
      const updates = await Promise.allSettled(active.map((job) => fetchJob(job.id)));
      setJobs((current) =>
        current.map((job) => {
          const match = updates.find((update) => update.status === 'fulfilled' && update.value.id === job.id);
          return match && match.status === 'fulfilled' ? match.value : job;
        })
      );
    }, 2500);

    return () => window.clearInterval(timer);
  }, [jobs]);

  async function handleSubmit() {
    setError('');
    setIsSubmitting(true);
    try {
      const created = await postGenerate({
        model,
        mode,
        prompt,
        negativePrompt,
        imageUrl: mode === 'image-to-video' ? imageUrl : undefined,
        duration,
        resolution,
        fps,
        frames,
        steps,
        seed: seed === '' ? undefined : seed
      });
      setJobs((current) => [created, ...current].slice(0, 12));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something broke. Backend said no. Very rude.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="appShell">
      <section className="hero">
        <div>
          <div className="eyebrow"><Sparkles size={16} /> AI Video Forge</div>
          <h1>LTX-2 × Wan 2.2 × Mochi control room</h1>
          <p>
            One clean website for routing prompts into premium hosted generation, local ComfyUI workflows, and open-source video experiments.
          </p>
        </div>
        <div className="statusCard">
          <div className="statusRow">
            <RadioTower size={18} /> Backend
            <span className={classNames('pill', health === 'online' ? 'good' : health === 'offline' ? 'bad' : '')}>
              {health}
            </span>
          </div>
          <div className="miniGrid">
            <span><Gauge size={15} /> {fps} fps</span>
            <span><Film size={15} /> {frames} frames</span>
            <span><Settings2 size={15} /> {steps} steps</span>
          </div>
        </div>
      </section>

      <section className="modelGrid">
        {(Object.keys(modelCards) as ModelId[]).map((id) => {
          const item = modelCards[id];
          const Icon = item.icon;
          return (
            <button
              className={classNames('modelCard', model === id && 'active')}
              key={id}
              onClick={() => setModel(id)}
            >
              <div className="modelHeader">
                <Icon size={22} />
                <strong>{item.label}</strong>
              </div>
              <span>{item.lane}</span>
              <p>{item.desc}</p>
            </button>
          );
        })}
      </section>

      <section className="workspace">
        <form className="panel" onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <div className="panelHeader">
            <SelectedIcon size={24} />
            <div>
              <h2>{selectedModel.label} generation</h2>
              <p>{selectedModel.lane}</p>
            </div>
          </div>

          <div className="fieldGroup twoCols">
            <label>
              Mode
              <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
                <option value="text-to-video">Text to video</option>
                <option value="image-to-video">Image to video</option>
              </select>
            </label>
            <label>
              Resolution
              <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
                <option value="854x480">854×480</option>
                <option value="1280x720">1280×720</option>
                <option value="1920x1080">1920×1080</option>
              </select>
            </label>
          </div>

          <label className="promptBox">
            Prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} />
          </label>

          <div className="presetRow">
            {presets.map((preset) => (
              <button type="button" key={preset} onClick={() => setPrompt(preset)}>
                {preset.slice(0, 48)}...
              </button>
            ))}
          </div>

          <label>
            Negative prompt
            <input value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} />
          </label>

          {mode === 'image-to-video' && (
            <label>
              Source image URL
              <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://..." />
            </label>
          )}

          <div className="fieldGroup fourCols">
            <label>
              Duration
              <input type="number" min={1} max={15} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
            </label>
            <label>
              FPS
              <input type="number" min={8} max={60} value={fps} onChange={(event) => setFps(Number(event.target.value))} />
            </label>
            <label>
              Steps
              <input type="number" min={4} max={80} value={steps} onChange={(event) => setSteps(Number(event.target.value))} />
            </label>
            <label>
              Seed
              <input value={seed} onChange={(event) => setSeed(event.target.value === '' ? '' : Number(event.target.value))} placeholder="random" />
            </label>
          </div>

          {error && <div className="errorBox">{error}</div>}

          <button className="generateButton" disabled={isSubmitting || health === 'offline'}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            Generate video
          </button>
        </form>

        <aside className="panel queuePanel">
          <div className="panelHeader">
            <Activity size={24} />
            <div>
              <h2>Job queue</h2>
              <p>Latest generations from this browser session</p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="emptyState">
              <Wand2 size={42} />
              <strong>No jobs yet</strong>
              <span>Submit a prompt. The machine needs something to chew.</span>
            </div>
          ) : (
            <div className="jobList">
              {jobs.map((job) => (
                <article className="jobCard" key={job.id}>
                  <div className="jobTop">
                    <strong>{modelCards[job.model].label}</strong>
                    <span className={classNames('pill', job.status === 'completed' && 'good', job.status === 'failed' && 'bad')}>
                      {job.status}
                    </span>
                  </div>
                  <p>{job.message || 'Queued successfully.'}</p>
                  {job.providerJobId && <code>provider: {job.providerJobId}</code>}
                  {job.outputUrl && (
                    <a className="outputLink" href={job.outputUrl} target="_blank" rel="noreferrer">
                      <ImageIcon size={16} /> Open output
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </aside>
      </section>

      <section className="opsStrip">
        <div><Cpu size={18} /> Frontend: GitHub Pages</div>
        <div><RadioTower size={18} /> Backend: Node/Express</div>
        <div><BadgeCheck size={18} /> Models: API + ComfyUI adapters</div>
      </section>
    </main>
  );
}
