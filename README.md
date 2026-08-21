# AURENIX Store

Multi-file Vercel storefront for premium everyday technology.

## Local setup

1. Copy `.env.example` to `.env.local` and add test credentials. Never put secrets in frontend files.
2. Run `npm install -g vercel` once if needed.
3. Run `npm run dev` and open the URL shown by Vercel.

The browser uses `/api/create-order` and `/api/verify-payment`; Razorpay secret and Supabase service-role values remain server-only.

## Deployment

Connect the repository to Vercel, set the variables from `.env.example` in Project Settings, and deploy from `main`. Use Razorpay test keys first.

After deployment, verify `https://YOUR-DOMAIN.vercel.app/api/health` returns `{ "ok": true }` before testing payments. The product catalog is available at `/api/products`.

## Structure

- `public/`: storefront HTML
- `src/`: browser application logic
- `styles/`: responsive visual system
- `data/`: browser fallback product data
- `api/`: Vercel serverless functions
