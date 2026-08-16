# MinIO Integration

MinIO provides S3-compatible object storage for DivineKart — product images and uploads.

## Level 3 — MinIO setup

```mermaid
flowchart TB
    A[Compose service starts] --> B[Login to console :9001]
    B --> C[Set MINIO_ROOT creds]
    C --> D[Create bucket]
    D --> E[Point backend at it]
    E --> F[Verify upload]
```

## Step 1 — Start & access

```bash
docker compose up -d minio minio-init
```

- **API**: `http://localhost:9000` (S3 endpoint)
- **Console**: `http://localhost:9001` (web UI)

## Step 2 — Login

Console credentials come from `.env`:

```dotenv
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<strong-password>
```

## Step 3 — Create a bucket

In the console → **Buckets → Create Bucket** → name it (e.g. `divinekart`) and make it **public** for storefront image URLs (or use presigned URLs for private access).

## Step 4 — Point the backend at it

The backend uses MinIO as its file storage provider. Set the connection in the backend config / env:

```dotenv
S3_ENDPOINT=http://minio:9000
S3_BUCKET=divinekart
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=<same-as-minio>
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

Restart: `docker compose restart backend`.

## Step 5 — Verify

1. In the admin dashboard, upload a product image.
2. Confirm the object appears in the `divinekart` bucket.
3. Confirm the image URL loads in the storefront.

## Notes & gotchas

- **Path-style URLs** — MinIO needs `S3_FORCE_PATH_STYLE=true` (it's not virtual-host style like AWS).
- **Internal endpoint** — the backend container must use `http://minio:9000` (service name), not `localhost`.
- **Public bucket** vs **presigned** — for a public storefront, a public bucket is simplest; switch to presigned URLs for private files.
- **Persistent volume** — MinIO must have a persistent volume or uploads are lost on recreate.

## Verification checklist

- [ ] Console reachable at `:9001`, login works
- [ ] Bucket created (public or presigned configured)
- [ ] Backend uploads to MinIO (image appears in bucket)
- [ ] Storefront serves the uploaded image
- [ ] Volume persists across restarts