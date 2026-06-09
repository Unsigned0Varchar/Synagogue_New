# SYNAGOGUE Event Site

Dark/pink 3D event website for SYNAGOGUE by Ghost MGM, with Razorpay checkout,
server-side payment signature verification, QR ticket email delivery, and SMS
delivery.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

When Razorpay keys are not configured, the checkout runs in local demo mode so
ticket issuing, email status, and text status can still be tested.

## Environment

Copy `.env.example` to `.env.local` and fill the values:

```bash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

Razorpay payment flow:

1. `/api/create-order` creates a Razorpay order on the server.
2. Razorpay Checkout returns the payment id, order id, and signature.
3. `/api/verify-payment` verifies the HMAC signature before issuing tickets.
4. Confirmed tickets are emailed with a QR code and sent by SMS when providers are configured.

The local order store is created at `data/orders.json`. For production, replace
the file-backed store in `src/lib/orders.js` with a database.
