# Relay

Send order and delivery status updates to a customer’s WhatsApp number, and collect their replies.

Relay is a small operations desk: pick a customer, choose a status (confirmed, packed, shipped, out for delivery, delivered, and more), preview the WhatsApp message, then send it.

WhatsApp traffic goes through a **Hermes Agent** session (Baileys / WhatsApp Web), not Meta’s Cloud API and not a third-party WhatsApp vendor.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run build
npm start
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

`npm start` runs a small front door on port 43147 (IPv4 and IPv6) and proxies to Next.js. That avoids Cursor preview failures from chunked `next dev` responses and missing `::1` listeners.

With no Hermes bridge URL, the app runs in **demo mode**. Updates are stored on this machine and never leave the app. Use **Simulate reply** to pretend a customer answered on WhatsApp.

## Send a real WhatsApp message through Hermes

1. Install [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp) and Node.js 18+.
2. Pair a **dedicated** WhatsApp number:

```bash
hermes whatsapp
```

Scan the QR code from WhatsApp → Settings → Linked Devices.

3. Allow the customers you will message, then start the gateway so the bridge stays up:

```bash
# ~/.hermes/.env
WHATSAPP_ENABLED=true
WHATSAPP_MODE=bot
WHATSAPP_ALLOWED_USERS=*

hermes gateway
```

The Node bridge listens on `http://127.0.0.1:3000` by default (`GET /health`, `POST /send`, `GET /messages`).

4. In Relay **Settings**, set the bridge URL to `http://127.0.0.1:3000` (or set `HERMES_WHATSAPP_URL` in `.env.local`) and save. The header badge switches from `Demo mode` to `Live Hermes` when `/health` reports `connected`.

```bash
HERMES_WHATSAPP_URL=http://127.0.0.1:3000
HERMES_WEBHOOK_SECRET=
WHATSAPP_BUSINESS_NAME=Your store name
```

Environment variables override anything saved in Settings.

Use a dedicated bot number and keep outbound conversational. Hermes uses the unofficial WhatsApp Web protocol; bulk sends can get the number restricted.

If the Hermes AI gateway is also polling `GET /messages`, it will drain replies before Relay sees them. Either let Relay be the only consumer of the bridge inbox, or POST the same event objects to `/api/webhook/hermes`.

## How it works

- `POST /api/updates` builds the status text and sends it with Hermes `POST /send` (`chatId` is `15551234567@s.whatsapp.net`).
- Relay polls Hermes `GET /messages` on the Activity refresh so customer replies land in the feed.
- `POST /api/webhook/hermes` accepts the same inbound JSON if something forwards events to Relay.
- `.data/store.json` keeps customers and the activity feed for local use. This file is gitignored.

The Hermes bridge binds to loopback. Relay must run on the same machine as Hermes, or you must tunnel that port yourself.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Same front door as `npm start` (expects a prior `npm run build`) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
