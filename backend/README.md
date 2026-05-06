# Backend

Node/Express API adapter for AI Video Forge.

## Local dev

```bash
npm install
cp .env.example .env
npm run dev
```

## Routes

- `GET /api/health`
- `GET /api/models`
- `POST /api/generate`
- `GET /api/jobs/:id`

## Wan/Mochi through ComfyUI

Start ComfyUI on your GPU machine:

```bash
python main.py --listen 0.0.0.0 --port 8188
```

Then set:

```bash
COMFY_BASE_URL=http://YOUR_GPU_SERVER:8188
```

Export your ComfyUI workflow in API format and replace the templates in `workflows/`.
