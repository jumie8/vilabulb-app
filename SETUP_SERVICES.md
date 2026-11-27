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

## Payments (coin purchases)
Coin purchases are not activated yet. Before enabling them, choose a provider and create merchant credentials in that provider's dashboard. The payment flow must:
1. Create a pending order server-side with a unique reference and expected amount.
2. Redirect to the provider's hosted checkout.
3. Verify the payment server-side using the provider API and verify webhook signatures.
4. Credit coins exactly once only after verified successful payment (idempotent transaction).
5. Never accept a client-supplied amount or credit coins from a browser callback alone.

Required secret names depend on the chosen provider. Do not send secret keys in chat; add them to Vercel Environment Variables and Supabase Edge Function secrets.

## Admin access
Admin API access is based only on the trusted Supabase Auth `app_metadata.role = "admin"` claim. Do not set this in user-editable metadata. Assign the owner/admin role using a trusted server-side Admin API or Supabase Dashboard process, then sign out and back in to refresh the JWT. Add `SUPABASE_SERVICE_ROLE_KEY` to Vercel server environment variables only; never expose it to the browser.

## Mobile app
The Expo project is in `mobile/`. Copy `mobile/.env.example` to `mobile/.env`, fill in the Supabase project URL and publishable/anon key, then run `npm install` and `npx expo start` inside that folder. Add `vilabulb://**` to Supabase Auth redirect URLs before testing mobile OAuth/deep links.

The current mobile project is a starter with email/password login and a public video list. Native video playback, upload/recording, Google OAuth deep-link completion, messaging, LIVE, push notifications and app-store builds still need implementation and testing.
