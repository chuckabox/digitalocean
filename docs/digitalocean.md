# DigitalOcean — Complete Tools & Capabilities Reference

## AI / Inference

One API key, one OpenAI-compatible endpoint (`https://inference.do-ai.run/v1/`) — unlocks every model and modality.

### Serverless Inference
- 55+ models (text, image, audio, video) with auto-scaling, pay-per-token
- Swap models by changing the model name — no other code changes
- OpenAI SDK + LangChain + LlamaIndex all work out of the box

### Model Catalog Highlights

| Model | Provider | Type |
|---|---|---|
| `anthropic-claude-opus-4.8` | Anthropic | Text/Reasoning |
| `anthropic-claude-4.6-sonnet` | Anthropic | Text/Reasoning |
| `anthropic-claude-haiku-4.5` | Anthropic | Text/Reasoning |
| `openai-gpt-5.5` | OpenAI | Text |
| `openai-o3` | OpenAI | Reasoning |
| `llama3.3-70b-instruct` | Meta | Text *(often 404 for our key — verify via `listModels`; Wavelength uses Haiku/Sonnet — see [STATUS.md](../STATUS.md))* |
| `deepseek-3.2` | DeepSeek | Text |
| `alibaba-qwen3-32b` | Alibaba | Text |
| `openai-gpt-image-2` | OpenAI | Image (sync) |
| `stable-diffusion-3.5-large` | Stability AI | Image (sync) |
| `fal-ai/flux/schnell` | fal | Image (async) |
| `fal-ai/elevenlabs/tts/multilingual-v2` | fal | Text-to-speech |
| `fal-ai/stable-audio-25/text-to-audio` | fal | Audio |

### Batch Inference
- Async jobs with 24-hour SLA, up to ~50% cheaper than real-time
- Good for bulk classification, summarization, embeddings backfills

### Dedicated Inference
- Reserved GPU endpoints for sustained high-throughput workloads
- Bring Your Own Model via Hugging Face imports
- Public or private endpoints

### Inference Router *(preview)*
- Auto-routes each request to the cheapest or fastest model
- Automatic fallback if a model is unavailable

### Evaluations *(preview)*
- LLM-as-a-Judge: score models, routers, and deployments against your own datasets
- Configure candidate + judge model, pick metrics, run from console or API

### Agent Platform + Knowledge Bases
- Persistent AI agents with RAG (retrieval-augmented generation)
- Attach knowledge bases — agents retrieve from your uploaded docs at inference time
- Separate agent endpoint: `https://agents.do-ai.run/v1/<agent-id>`

---

## App Platform

Continuous deployment from GitHub — push code, get a live URL.

- Deploy from GitHub repos (auto-deploys on push)
- Supports Docker, Python, Node, Go, Ruby, PHP, and more
- Listen on port `8080`; use `gunicorn --timeout 120` for Flask/image gen workloads
- Managed SSL, custom domains, environment variables
- Horizontal scaling, zero-downtime deploys

---

## Databases

- **Managed PostgreSQL** — with `pgvector` extension for embeddings + semantic search (RAG storage layer)
- **Managed MySQL**
- **Managed MongoDB**
- **Managed Redis** — caching and pub/sub
- **Managed OpenSearch** — full-text search
- Automated backups, point-in-time restore, connection pooling

---

## Spaces (Object Storage)

- S3-compatible object storage with built-in CDN
- Store generated images, audio, video, user uploads
- Pre-signed URLs for temporary access
- Sync local project files to buckets

---

## Droplets (VMs)

- Linux virtual machines, scalable from $4/mo
- GPU Droplets for ML workloads
- Custom images, snapshots, backups
- Fully managed or bare-metal control

---

## Kubernetes (DOKS)

- Managed Kubernetes clusters
- Auto-scaling node pools
- Integrated with container registry and load balancers

---

## Networking

- Load Balancers
- Managed SSL certificates (auto-renew)
- Firewalls
- VPC (private networking between resources)
- DNS management

---

## Marketplace

- One-click apps: WordPress, Ghost, n8n, Supabase, etc.
- Pre-configured stacks ready to deploy

---

## MCP Server — What AI Can Actually Do

Connect Claude Code, Cursor, or any MCP client to DigitalOcean. No local binary needed — pure HTTPS endpoints.

### Wavelength (this repo) — Cursor setup

User-level Cursor config lives at `~/.cursor/mcp.json` (**not committed** — contains the DO
API token). Servers enabled for deploy agents:

- `digitalocean-apps`
- `digitalocean-databases`
- `digitalocean-spaces`
- `digitalocean-droplets`
- `digitalocean-insights`

Reload Cursor after changing MCP config. Prefer these tools to create the App Platform app
from [`.do/app.yaml`](../.do/app.yaml) / root `Dockerfile`. Do **not** revive
`wavelength-brain-37j5z`. See [agent-handoff.md](./agent-handoff.md).

### Setup (generic)

```json
{
  "mcpServers": {
    "digitalocean-apps": {
      "url": "https://apps.mcp.digitalocean.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_DO_API_TOKEN" }
    },
    "digitalocean-databases": {
      "url": "https://databases.mcp.digitalocean.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_DO_API_TOKEN" }
    },
    "digitalocean-spaces": {
      "url": "https://spaces.mcp.digitalocean.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_DO_API_TOKEN" }
    }
  }
}
```

### MCP Endpoints

| Service | Endpoint |
|---|---|
| App Platform | `https://apps.mcp.digitalocean.com/mcp` |
| Databases | `https://databases.mcp.digitalocean.com/mcp` |
| Droplets | `https://droplets.mcp.digitalocean.com/mcp` |
| Kubernetes | `https://doks.mcp.digitalocean.com/mcp` |
| Spaces | `https://spaces.mcp.digitalocean.com/mcp` |
| Networking | `https://networking.mcp.digitalocean.com/mcp` |
| Accounts | `https://accounts.mcp.digitalocean.com/mcp` |
| Insights | `https://insights.mcp.digitalocean.com/mcp` |
| Marketplace | `https://marketplace.mcp.digitalocean.com/mcp` |

### App Platform Tools

| Tool | What it does |
|---|---|
| `list_apps` | List all your apps |
| `create_app` | Deploy a new app from GitHub |
| `get_app` | Get details on a specific app |
| `update_app` | Modify app config/spec |
| `delete_app` | Remove an app |
| `restart_app` | Restart a running app |
| `list_deployments` | View deployment history |
| `create_deployment` | Trigger a new deployment |
| `get_deployment` | Get deployment details |
| `cancel_deployment` | Stop an in-progress deployment |
| `retrieve_active_deployment_logs` | Stream live logs |
| `download_logs` | Export logs |
| `list_app_regions` | See available regions |
| `list_instance_sizes` | Check available resource tiers |
| `list_app_alerts` | View configured alerts |
| `update_app_alert_destinations` | Change alert routing |
| `validate_app_rollback` | Check if rollback is safe |
| `rollback_app` | Roll back to a previous version |
| `commit_app_rollback` | Confirm rollback |
| `revert_app_rollback` | Undo a rollback |
| `validate_app_spec` | Validate app spec before deploying |
| `get_app_bandwidth_daily_metrics` | Bandwidth stats for one app |
| `get_all_app_bandwidth_daily_metrics` | Bandwidth stats for all apps |

### Spaces Tools
- Upload files from local directories to buckets
- Create temporary access keys
- Generate public URLs for files
- Sync project files to a bucket folder

### Databases Tools
- Provision a new PostgreSQL (or other) database
- Create databases with specific versions and configs

### Networking Tools
- Check SSL certificate status
- Monitor certificate validation

### Insights Tools
- View per-app spending
- Monitor cloud costs and billing history

---

## Key Endpoints Summary

| Purpose | URL |
|---|---|
| Inference (chat, images, audio) | `https://inference.do-ai.run/v1/` |
| Agents | `https://agents.do-ai.run/v1/<agent-id>` |
| Console | `https://cloud.digitalocean.com` |
| Docs | `https://docs.digitalocean.com/products/inference/` |
| Model catalog | `https://docs.digitalocean.com/products/inference/details/models/` |

---

## Hackathon Notes

- **Gradient AI** = old brand name for DigitalOcean's inference platform — now called **DigitalOcean Inference Engine**. Using the inference endpoint qualifies for Gradient AI bonus prizes.
- Gradient SDK is deprecated — use the **OpenAI SDK** pointed at `https://inference.do-ai.run/v1/`
- $200 in credits covers inference calls + App Platform deploy + a managed database
- Install the agent skill: `npx skills add ajot/digitalocean-ai`
