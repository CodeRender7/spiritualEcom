# Setup Documentation

Complete setup-plan documentation for DivineKart — from a fresh VPS to a fully hardened production deployment.

## Leveling convention

Every guide follows a three-level mermaid diagram style:

- **Level 1** — area overview (what the area covers)
- **Level 2** — per-area flow (the steps for one setup path)
- **Level 3** — provider/guide-specific detail (deep dive)

## Areas

| Area | Location | Covers |
|------|----------|--------|
| 🖥️ VPS & Infra | [`docs/setup/vps/`](vps/README.md) | AWS EC2, GCP, Azure, DigitalOcean, Hetzner, Vultr, PaaS (Railway, Render, Fly.io), self-hosted (Coolify, Rancher, aaPanel), shared infra (reverse proxy, TLS, backup, monitoring) |
| 💳 Payments | [`docs/setup/payments/`](payments/README.md) | Generic Medusa payment wiring + Razorpay, Stripe, PayPal, PayU |
| 🛍️ Storefront & Admin | [`docs/setup/storefront-admin/`](storefront-admin/README.md) | Local dev, env vars, admin dashboard, seed workflow, production build |
| 🛡️ Security | [`docs/setup/security/`](security/README.md) | Baseline setup + hardening (TLS, firewall, fail2ban, containers, secrets) |
| 🔌 Integrations | [`docs/setup/integrations/`](integrations/README.md) | WhatsApp, Langfuse, OpenObserve, MinIO, OmniRoute, and more |

## How to use this documentation

1. **Try locally first** — follow the [Quick Start](../../README.md#-quick-start--docker-compose) in the root README.
2. **Deploy to production** — pick a provider from the [VPS guide](vps/README.md) and follow it end-to-end.
3. **Wire payments** — use the [Payments guide](payments/README.md) to connect a gateway.
4. **Harden the deployment** — work through the [Security guide](security/README.md).
5. **Add integrations** — see the [Integrations guide](integrations/README.md).

## Mermaid diagram index

| Guide | Level 1 | Level 2 | Level 3 |
|-------|---------|---------|---------|
| VPS | provider overview | single-provider flow | per-provider detail |
| Payments | gateway architecture | payment flow | per-gateway setup |
| Security | security layers | hardening flow | per-layer detail |
| Integrations | integration map | per-integration flow | per-integration setup |