# Relay

Send order and delivery status updates to a customer’s WhatsApp number, and collect their replies.

Relay is a small operations desk: pick a customer, choose a status (confirmed, packed, shipped, out for delivery, delivered, and more), preview the WhatsApp message, then send it.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run build
npm start
```

Open http://127.0.0.1:43147

With no Cloud API credentials, the app runs in demo mode.
