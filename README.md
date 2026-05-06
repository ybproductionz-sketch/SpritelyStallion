# AI Video Forge

A GitHub-deployable AI video generation control room for **LTX-2**, **Wan 2.2**, and **Mochi** workflows.

The frontend can deploy on GitHub Pages. The backend connects to:

- LTX API / hosted LTX endpoint
- Local or remote ComfyUI server running Wan 2.2 workflows
- Local or remote ComfyUI server running Mochi workflows

## Architecture

```txt
Browser UI on GitHub Pages
        |
        | HTTPS
        v
Node/Express backend on Replit, Render, Railway, VPS, or GPU box
        |
        | model adapters
        v
LTX API / ComfyUI / local GPU workflows
```

GitHub Pages cannot run GPU models by itself. It hosts the control panel. The backend sends jobs to your GPU/API provider.

## Fast start

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:8787`

## Deploy frontend to GitHub Pages

1. Push this repo to GitHub.
2. In GitHub, go to **Settings → Pages → Source → GitHub Actions**.
3. Add repository secret if needed:
   - `VITE_API_BASE_URL=https://your-backend-url.com`
4. Push to `main`.
5. The included workflow builds and deploys the frontend.

## Deploy backend

Use Replit, Render, Railway, Fly.io, a VPS, or your GPU machine.

Backend command:

```bash
cd backend
npm install
npm run build
npm start
```

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.

### Backend variables

```bash
PORT=8787
CORS_ORIGIN=http://localhost:5173

# LTX hosted/API adapter
LTX_API_KEY=
LTX_API_BASE_URL=https://api.ltx.video
LTX_API_ENDPOINT=/v1/generations/video

# ComfyUI adapter
COMFY_BASE_URL=http://127.0.0.1:8188
COMFY_CLIENT_ID=ai-video-forge

# Workflow template files
WAN_WORKFLOW_PATH=./workflows/wan2.2-template.json
MOCHI_WORKFLOW_PATH=./workflows/mochi-template.json
```

## ComfyUI workflow setup

1. Build your Wan 2.2 or Mochi workflow in ComfyUI.
2. Export it in **API format**.
3. Replace the matching template in `backend/workflows/`.
4. Add text replacement markers in the workflow JSON:
   - `{{PROMPT}}`
   - `{{NEGATIVE_PROMPT}}`
   - `{{SEED}}`
   - `{{WIDTH}}`
   - `{{HEIGHT}}`
   - `{{FPS}}`
   - `{{FRAMES}}`
   - `{{IMAGE_URL}}`
5. Restart the backend.

The backend performs safe string replacement, posts the workflow to ComfyUI `/prompt`, then tracks job state locally.

## Model strategy

- **LTX-2**: use for high-quality hosted/pro workflow, synchronized audio/video experiments, and production tests.
- **Wan 2.2**: use through ComfyUI for cinematic text-to-video and image-to-video.
- **Mochi**: use through ComfyUI or a local endpoint as a lighter open-source text-to-video lane.

## Included API

```txt
GET  /api/health
GET  /api/models
POST /api/generate
GET  /api/jobs/:jobId
```

Example request:

```bash
curl -X POST http://localhost:8787/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "wan22",
    "mode": "text-to-video",
    "prompt": "cinematic cyberpunk subway platform, slow dolly shot, neon reflections",
    "negativePrompt": "blurry, warped hands, low quality",
    "duration": 5,
    "resolution": "1280x720",
    "fps": 24,
    "steps": 28
  }'
```

## Notes

This package is a production-ready scaffold, not a bundled model distribution. LTX-2, Wan 2.2, and Mochi weights are not included. Install the model workflows on your own GPU server or connect to a hosted endpoint.
