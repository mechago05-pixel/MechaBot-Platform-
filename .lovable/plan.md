
## Goal
Reduce MechaBot to a pure mechanic-tracking + job-coordination MVP. Remove every pricing, payment, estimate, invoice, and fee feature from UI, routing, and data flows. Keep auth, request creation, real-time job status, map tracking, and the basic admin panel.

## Scope of removal (UI / routing)
Remove these routes and their pages from `src/App.tsx` and delete the page files:
- `/repair-estimates` → `RepairEstimatesPage.tsx`
- `/price-breakdown` → `PriceBreakdownPage.tsx`
- `/service-prices` → `ServicePricesPage.tsx`

Update remaining pages to remove price/payment UI:
- `HomePage.tsx` — remove any "Estimates", "Service Prices", or pricing entry points/cards.
- `SelectProblemPage.tsx` — after problem selection, navigate directly to `/request-form` (skip estimates).
- `RequestFormPage.tsx` — remove all price fetching, min/max display, payment method selector. Keep car type/model, problem, description, vehicle size (kept only as a request field, no pricing use), GPS location.
- `JobStatusPage.tsx` — remove any remaining cost/invoice references; keep status timeline (Searching → Accepted → On the way → Completed).
- `MechanicDashboardPage.tsx` / `MechanicOrdersPage.tsx` — remove any price columns/badges, diagnosis fee, earnings.
- `MechanicOnboardingPage.tsx` — remove `diagnosis_fee` input.
- `HistoryPage.tsx` — remove price columns from order cards.
- `RatingPage.tsx` — remove invoice/total references if present.
- `AdminPage.tsx` — remove "Service Prices" management tab; keep requests + mechanics + suspend/block.
- `BottomNav.tsx` and `lib/i18n.tsx` — drop pricing-related labels/links.

## Scope of removal (backend)
Database changes via one migration:
- Drop table `public.service_prices` (and its policies).
- Drop columns: `service_requests.estimated_price_min`, `service_requests.estimated_price_max`, `service_requests.final_price`, `service_requests.payment_method`.
- Drop columns: `orders.estimated_price`, `orders.payment_method`.
- Drop column: `mechanic_profiles.diagnosis_fee`.
- Update trigger function `validate_service_request` to remove the price-cap checks.
- Add `is_blocked boolean default false` to `profiles` and `mechanic_profiles` for the admin suspend/block feature (used to be missing).

Code follow-up:
- Remove all queries against `service_prices` and removed columns.
- Admin: implement suspend/block toggle that flips `is_blocked` and hides blocked mechanics from customer-facing lists/maps.

## Job status flow (kept, simplified)
Customer-visible statuses: `pending` (Searching), `in_progress` (Accepted), `on_the_way`, `completed`, `cancelled`. Trigger `notify_on_request_status_change` already covers these — leave as is, just drop pricing-only statuses from UI copy.

## Out of scope (kept untouched)
- Auth (customer + mechanic), role selection, email verification, password reset.
- Real-time map (`LiveTrackingMap`, `FullMapPage`, `MechanicMapPage`) and location updates.
- Chat/messages, notifications.

## Migration order
1. Migration: drop pricing tables/columns, add `is_blocked`, update validator.
2. Code: remove pages, routes, references; update admin block UI.
3. Verify build, click through customer + mechanic + admin flows.

## Notes
- The previous direction added pricing seeds and a Repair Estimates page; this plan reverses that direction per the new MVP scope.
- `vehicle_size` is retained on `service_requests` as a descriptive field only (no pricing use).
