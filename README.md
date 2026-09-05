# Relay

Send order and delivery status updates to a customer’s WhatsApp number, and collect their replies.

Relay is a small operations desk: pick a customer, choose a status (confirmed, packed, shipped, out for delivery, delivered, and more), preview the WhatsApp message, then send it.

WhatsApp traffic goes through a **Hermes Agent** session (Baileys / WhatsApp Web), not Meta’s Cloud API and not a third-party WhatsApp vendor.

## Run locally

From any machine with Git and Node.js 18+:

```bash
git clone https://github.com/mayurshcode/whatapp_test.git
cd whatapp_test
bash scripts/setup-local.sh .
npm start
```

Or one step from scratch (clones into `~/whatapp_test`):

```bash
curl -fsSL https://raw.githubusercontent.com/mayurshcode/whatapp_test/main/scripts/setup-local.sh | bash
cd ~/whatapp_test
npm start
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

`npm start` runs a small front door on port 43147 (IPv4 and IPv6) and proxies to Next.js. That avoids Cursor preview failures from chunked `next dev` responses and missing `::1` listeners.

With no Hermes bridge URL, the app runs in **demo mode**. Updates are stored on this machine and never leave the app. Use **Simulate reply** to pretend a customer answered on WhatsApp.
