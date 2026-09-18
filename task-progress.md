- [x] Analyze existing codebase architecture
- [x] Understand current request lifecycle
- [x] Identify gaps: client location not captured, no proximity-based mechanic matching
- [x] Add client_lat/client_lng columns schema
- [x] Add haversine helper to bootstrap.php
- [x] Update RequestFormPage to capture client geolocation
- [x] Update MechanicDashboardPage to show distance from client
- [x] Update MechanicOrdersPage to show distance from client
- [x] ~~Delete expired requests entirely after 30 seconds~~ → **Changed: mark status="expired"** so the admin dashboard keeps a record
- [x] NearbyMechanicsPage + JobStatusPage handle expired requests (client sees "No mechanic took this request" + Try Again)
- [x] AdminPage shows Expired stats/analytics
- [x] **REMOVED auto-assignment** — requests now always created with mechanic_id=NULL (all mechanics compete)
- [x] **First-come-first-serve** — accept endpoint uses atomic UPDATE WHERE mechanic_id IS NULL (prevents double-accept)
- [x] **30s visibility window** — GET /requests for mechanics only returns pending requests < 30 seconds old
- [x] Fix TypeScript errors (total_reviews type, t() calls)
- [x] **GO-LIVE (2026-09-18)** — deployed to Render: https://mechabot-7pha.onrender.com
  - ADMIN_EMAIL set to mechago05@gmail.com (auto-promoted to admin on registration, no restart needed)
- [x] **FIX: requests "failing" instantly** — API timestamps are UTC but browsers parsed them as local time (TZ = UTC+3),
      so the 30s countdown expired instantly and mechanics never saw new orders. Added `parseServerDate()` helper
      (api.ts) and used it in NearbyMechanicsPage, MechanicDashboardPage, MechanicOrdersPage
- [x] **FIX: location tracking not working** — mechanic GPS was only shared from MechanicMapPage; the dashboard now
      streams /mechanics/me/location while online, so clients can track mechanics live
- [x] **FIX: CORS** — skip CORS headers when no Origin header (same-origin /api calls now always work)
- [x] Added GET /api/time (UTC server clock) for future clock-skew handling
- [ ] Optional: client clock-skew handling via /api/time (timestamps now parse correctly, but a wrong device clock can still skew countdowns)
- [ ] Optional: persistent disk/MySQL on Render so data survives redeploys

## NEXT SESSION: Enable email verification via Brevo (2026-09-18 status)

**Goal:** user wants: sign-up writes own email+password → verification code arrives in their own Gmail → sign-in is BLOCKED (403) until they verify.

**Already DONE (all code live on Render):**
- Email verification flow fully wired: registration sends code, /verify-email page calls POST /auth/verify-email,
  LoginPage routes unverified users (403) to /verify-email with email pre-filled, resend works (POST /auth/resend-verification)
- Login gate active server-side: `email_verification_required() && email_verified==0 → 403`
- Email delivery now goes through **Brevo HTTPS API** when BREVO_API_KEY is set (send_email_via_brevo in api/bootstrap.php),
  SMTP/PHPMailer fallback kept — **because Render free tier blocks outbound SMTP port 587** (verified live: register hangs
  when VERIFY_EMAIL_ENABLED=true with only SMTP configured)

**Why it's currently OFF:**
- Render env vars now: VERIFY_EMAIL_ENABLED=false (rolled back so registrations work), MAIL_USERNAME=mechago05@gmail.com,
  MAIL_PASSWORD=Gmail app password (tccihmivadqwhmss — now useless for Render, user may revoke it in Google account)
- User does NOT yet have a Brevo account. Stuck at Brevo onboarding/payment-upsell screens.

**REMAINING STEPS (next session):**
1. User creates free Brevo account (https://app.brevo.com, sign up with mechago05@gmail.com, plan = FREE $0 —
   do NOT pay; org: MechaBot, website: https://mechabot-7pha.onrender.com)
2. Verify sender: dashboard → profile menu → "Senders, Domains & Dedicated IPs" → Add sender → mechago05@gmail.com →
   confirm from Gmail inbox
3. Get API key: profile menu → "SMTP & API" → API tab → Generate new key → copy xkeysib-... value
4. User pastes BREVO_API_KEY in chat → agent sets env vars via Render API:
   BREVO_API_KEY=<key>, VERIFY_EMAIL_ENABLED=true (both in one save)
5. Wait for deploy, then TEST live end-to-end: register new user → login must return 403 "verify your email" →
   resend-verification → check Brevo dashboard for delivered email → verify code → login succeeds
6. Remind user to delete the Gmail app password (tccihmivadqwhmss) from Google account, and rotate the Render API key
   (rnd_p7prp6Bx8RUq3qtRhBfjuNDLKpB5) shared in chat
