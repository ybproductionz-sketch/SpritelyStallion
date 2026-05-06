import path from 'node:path';

export const config = {
  port: Number(process.env.PORT || 8787),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  ltxApiKey: process.env.LTX_API_KEY || '',
  ltxApiBaseUrl: process.env.LTX_API_BASE_URL || 'https://api.ltx.video',
  ltxApiEndpoint: process.env.LTX_API_ENDPOINT || '/v1/generations/video',
  ltxStatusEndpointTemplate: process.env.LTX_STATUS_ENDPOINT_TEMPLATE || '/v1/generations/video/{{JOB_ID}}',
  comfyBaseUrl: process.env.COMFY_BASE_URL || 'http://127.0.0.1:8188',
  comfyClientId: process.env.COMFY_CLIENT_ID || 'ai-video-forge',
  wanWorkflowPath: path.resolve(process.cwd(), process.env.WAN_WORKFLOW_PATH || './workflows/wan2.2-template.json'),
  mochiWorkflowPath: path.resolve(process.cwd(), process.env.MOCHI_WORKFLOW_PATH || './workflows/mochi-template.json')
};
