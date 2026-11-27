# VILABULB service setup

## Google sign-in (Supabase)
1. In Google Cloud Console, create an OAuth client of type **Web application**.
2. Add this authorized redirect URI: `https://izclqydmtkptuhakrmjn.supabase.co/auth/v1/callback`.
3. Copy the Google Client ID and Client Secret into Supabase Dashboard → Authentication → Sign In / Providers → Google, then enable Google.
4. In Supabase Authentication → URL Configuration, set the production Site URL and add the website URL, `http://localhost:3000/**`, and `vilabulb://**` to Additional Redirect URLs.
5. For Vercel preview deployments, add the exact preview URL pattern shown in Supabase's Redirect URLs guide.

Never put the Google Client Secret in browser code or a public NEXT_PUBLIC_ variable.

## LIVE (LiveKit)
Set these Vercel server environment variables:
- `LIVEKIT_URL` (LiveKit websocket URL)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

Keep the API secret server-side. The existing `app/api/livekit/token/route.ts` issues short-lived room tokens after checking the signed-in user and active live session.

## Flutterwave coin purchases
The app now has a Flutterwave Standard hosted-checkout integration for NGN coin packages.

### Vercel server environment variables
Add these variables in Vercel → Project → Settings → Environment Variables, then redeploy:
- `FLW_SECRET_KEY`: Flutterwave secret key for the selected mode (test keys first; live key only after successful testing).
- `FLW_SECRET_HASH`: a strong webhook secret hash you create and also enter in Flutterwave Dashboard → Settings → Webhooks.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key; server-side only, never prefix it with NEXT_PUBLIC_.
- Keep the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` values configured.

### Flutterwave dashboard
1. In Flutterwave, start in Test Mode and copy the test secret key.
2. Set the webhook URL to `https://YOUR-PRODUCTION-DOMAIN/api/coins/webhook`.
3. Set the webhook secret hash to exactly the same value as `FLW_SECRET_HASH` in Vercel.
4. Enable charge-completed payment notifications and save.
5. After testing, switch to Live Mode, use the live secret key, and set the corresponding live webhook secret hash.

### Coin packages
The current code contains draft prices in `lib/coin-packs.ts`:
- 100 coins — ₦500
- 500 coins — ₦2,000
- 1,000 coins — ₦3,500

Confirm these prices before accepting real payments. Change the server-side catalogue before going live if you want different prices.

### Payment safety
- Checkout is created on the server from a fixed package catalogue; the browser cannot set the amount or coin quantity.
- The callback and webhook both verify the transaction with Flutterwave's transaction verification API.
- A database function credits the wallet and records the purchase atomically and idempotently, so a callback plus webhook cannot credit the same transaction twice.
- The webhook checks Flutterwave's `verif-hash` header against `FLW_SECRET_HASH`.
- The Flutterwave secret key and Supabase service-role key must never appear in frontend code, Expo variables, or Git.

Coin purchases do not implement creator cash-outs or bank withdrawals. Do not treat earned gift coins as withdrawable money until a separate payout and compliance flow is built.

## Admin access
Admin API access is based only on the trusted Supabase Auth `app_metadata.role = "admin"` claim. Do not set this in user-editable metadata. Assign the owner/admin role using a trusted server-side Admin API or Supabase Dashboard process, then sign out and back in to refresh the JWT. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel server environment variables only; never expose it to the browser.

## Mobile app
The Expo project is in `mobile/`. Copy `mobile/.env.example` to `mobile/.env`, fill in the Supabase project URL and publishable/anon key, then run `npm install` and `npx expo start` inside that folder. Add `vilabulb://**` to Supabase Auth redirect URLs before testing mobile OAuth/deep links.

The current mobile project is a starter with email/password login and a public video list. Native video playback, upload/recording, Google OAuth deep-link completion, messaging, LIVE, push notifications and app-store builds still need implementation and testing.
