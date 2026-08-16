# D6 — SMTP email transport with attachments

- Map: `.scratch/document-builder/map.md`
- Labels: `wayfinder:task`
- Status: Open
- Blocking: D7
- Blocked by: D3, D4

## Question

How does email go from the current `console.log` seam (`brm-notify.ts` `sendEmailSeam`) to a real SMTP sender that can render a bound template and attach a generated PDF — configurable from the admin dashboard, with graceful fallback when SMTP is unset?

## Decide + build

1. **Settings block**: add an `email`/`smtp` section to the `divinekart_settings` blob (host, port, secure, user, pass, from_name, from_email, enabled) via the admin settings UI (extend `/admin/settings` page) — admin-role configurable per the effort's requirement.
2. **Transport**: nodemailer (or the D1-researched alternative) — `sendEmailWithAttachment({to, subject, html, attachments: [{filename, content: pdfBuffer}]})`; render subject/body from the bound template (D3), attach the D4 PDF.
3. **Seam replacement**: `brm-notify.ts` email path sends through the real transport when `email.enabled` + SMTP set; falls back to the log seam otherwise (no regression to A5).
4. **No regression**: WhatsApp path, inline email bodies, and existing settings read/write unaffected.

## Verification

- Typecheck + build green.
- Live: SMTP config saved via admin; a renewal notification sends a real email with the generated PDF attached (use a test sink or logged envelope if no live SMTP); log-seam fallback verified when SMTP unset.