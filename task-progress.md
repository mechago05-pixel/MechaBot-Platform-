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
- [ ] Optional: enable email verification via SMTP env vars
