# AWS S3 Asset Storage

## Overview

Large binary assets (`static/` and `resources/`) are stored in AWS S3 instead of git to keep the repo lightweight. A postinstall script downloads them automatically after `npm install`.

## Setup Details

| Item | Value |
|---|---|
| Bucket | `s3://martian-assets-public` |
| AWS Profile | `promptli` |
| AWS Account | `406271520981` |
| Region | us-east-1 (default) |

### What's stored

| Folder | Size | Objects | Contents |
|---|---|---|---|
| `static/` | 193 MB | 959 | GLB models, KTX textures, audio (MP3/WAV), UI images, WASM decoders, fonts |
| `resources/` | 152 MB | 112 | Source Blender files, PSDs, raw WAVs, renders |
| **Total** | **345 MB** | **1071** | |

## How It Works

1. `static/` and `resources/` are in `.gitignore` — not tracked by git
2. `npm install` triggers the `postinstall` hook
3. `scripts/download-assets.js` runs `aws s3 sync` for both folders
4. If folders already exist and are non-empty, download is skipped

### Manual download

```bash
aws s3 sync s3://martian-assets-public/static/ static/ --profile promptli
aws s3 sync s3://martian-assets-public/resources/ resources/ --profile promptli
```

### Uploading new/changed assets

After adding or modifying files in `static/` or `resources/`, sync back to S3:

```bash
aws s3 sync static/ s3://martian-assets-public/static/ --profile promptli
aws s3 sync resources/ s3://martian-assets-public/resources/ --profile promptli
```

## Cost Estimate

AWS S3 Standard pricing (us-east-1):

| Cost type | Rate | Estimate |
|---|---|---|
| Storage | $0.023/GB/month | 0.345 GB × $0.023 = **~$0.008/month** |
| PUT requests (uploads) | $0.005/1000 | ~1071 objects = **~$0.005 per full sync** |
| GET requests (downloads) | $0.0004/1000 | ~1071 objects = **~$0.0004 per full download** |
| Data transfer out | $0.09/GB (first 10 TB) | 0.345 GB per clone = **~$0.03 per download** |

**Total monthly cost for a solo dev: under $0.05/month.** Even with 10 contributors cloning daily, it would be under $10/month.

## Prerequisites

- AWS CLI installed (`brew install awscli` on macOS)
- `promptli` profile configured (`aws configure --profile promptli`)
- Credentials with read access to the bucket (write access for uploading)

## Key Files

- `scripts/download-assets.js` — postinstall download script
- `package.json` — `postinstall` hook
- `.gitignore` — excludes `static/` and `resources/`

---

- Created: 2026-04-28
