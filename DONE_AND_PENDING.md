# LifeStation Mobile App – What’s Done vs What’s Pending

This document summarizes what has been implemented and what is still pending, based on a full read of the codebase and env configuration. It is aligned with the Affiliated/Brighton integration and webhook specs from Gil/Dan C.

---

## 1. Environment & configuration

### Root `.env` (frontend / app)

| Variable       | Purpose                            | Status                                                       |
| -------------- | ---------------------------------- | ------------------------------------------------------------ |
| `API_BASE_URL` | Backend base URL for the app       | Set to `https://api-backend-staging.allwellapp.com/brighton` |
| `API_TIMEOUT`  | Request timeout (ms)               | 30000                                                        |
| `ENV`          | development / staging / production | development                                                  |
| `APP_NAME`     | LifeStation                        | Set                                                          |
| `APP_VERSION`  | 1.0.0                              | Set                                                          |

- App talks to **your backend** at `API_BASE_URL`, not directly to Affiliated.

### Backend `.env`

| Area          | Variables / usage                                             | Status                                     |
| ------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Server        | `NODE_ENV`, `PORT`                                            | Set                                        |
| Database      | `DB_*` (Postgres)                                             | Set (brighton_db, pool, etc.)              |
| JWT           | `JWT_SECRET_KEY`, `REFRESH_SECRET_KEY`                        | Set (internal auth)                        |
| External API  | `EXTERNAL_API_BASE_URL` = `https://qa1-api.alertmessage.com/` | Set                                        |
| External API  | `EXTERNAL_API_USERNAME`, `EXTERNAL_API_PASSWORD`              | Set (LS_AW_API; same credentials from Gil) |
| Encryption    | `ENCRYPTION_KEY` (tokens at rest)                             | Set                                        |
| Redis         | `REDIS_URL`, `REDIS_TTL`                                      | Optional; empty = cache disabled           |
| Firebase      | `FIREBASE_*` (push)                                           | Placeholder; needs real project for FCM    |
| Rate limiting | `RATE_LIMIT_*`, `EXTERNAL_API_RATE_LIMIT_*`                   | Set                                        |
| Email         | `GMAIL_*`, `FROM_NAME`                                        | Set (for notifications)                    |

- **Security:** Do not commit backend `.env`. For production, move secrets (especially `EXTERNAL_API_PASSWORD`) to Secret Server or similar.

### External API config (`backend/src/config/external-apis.js`)

- **Account API:** `affiliated-api`, token + refresh from env.
- **Device API:** `brighton-api`, token + refresh from env.
- **Reports API:** `affiliated-report`, token + refresh from env.
- Base URL normalized to `https://<host>.alertmessage.com` (from `EXTERNAL_API_BASE_URL`).

All three APIs use the same `EXTERNAL_API_USERNAME` / `EXTERNAL_API_PASSWORD`. Token service stores encrypted tokens in `external_api_tokens` and refreshes on 401.

---

## 2. Backend – What’s done

### 2.1 Auth (internal only – Option A style)

- **Login:** `POST /auth/login` – email/password vs internal DB; JWT + refresh; FCM token update.
- **Signup:** `POST /auth/signup` – creates user in DB; optional `cs_no` on user.
- **Update password:** `POST /auth/update-password` – authenticated user only.
- No Affiliated OAuth for end-users; Affiliated credentials are service-level for backend ↔ Affiliated calls.

### 2.2 Affiliated API integration

- **Token service** (`external-api-token.service.js`): OAuth2 password grant + refresh; tokens stored encrypted; 401 → refresh and retry.
- **Device API service:** getDevices, getDevice, getDeviceRecent, addDevice, requestDeviceSignal, getFallDetection, turnOnFallDetection, turnOffFallDetection, rebootDevice, getSIM, activateSIM, deactivateSIM. All use `brighton-api` and service credentials.
- **Account API service:** getAccount, getAccounts, getContacts, getServcoNo, setServcoNo, searchAccounts, create/update/activate/deactivate/link/delete account and contacts (present but not used for internal user management).
- **Reports API service:** getRecentReports, createHistoryReport, getHistoryReportStatus, getHistoryReport, getEventHistory (create + poll + fetch), getSignalTypes, createAccountReport, getAccountReportStatus, getAccountReport.

### 2.3 Device controllers (proxy to Affiliated + your DB)

- **GET /devices** – Access control from your DB (UserDeviceMapping, SeniorCaregiverMapping); then Device API (getDevice) + Account API (getAccount by cs_no) per device; normalized response.
- **GET /devices/:id_type/:id** – Same pattern: Device API + Account API; access control.
- **GET /devices/:id_type/:id/recent** – Device API “most recent info” + Account API for name; access control.
- **GET /devices/:id_type/:id/telemetry** – Uses device recent + normalization.
- **GET /devices/:id_type/:id/fall-detection** – Device API fall detection status; **display only** (no toggle in routes).
- **POST /devices/:id_type/:id/signal** – Device API request signal.
- **POST /devices** (add device) – Validates senior; calls Device API PUT /device/; creates/updates local Device + UserDeviceMapping and sets `cs_no` from response.
- **GET /devices/imei/:imei/metadata** – Device API + Account API; access control.
- **POST /devices/save-geo-fence-settings**, **POST /devices/get-geo-fence-settings** – Geofence settings in your DB (device_id, center, radius, etc.).

### 2.4 Events and reports (Affiliated Reports API + your DB)

- **POST /events/get-events-by-type** – Resolves device → cs_no (mapping or Device API); fetches via Reports API (History + Recent); normalizes; filters by type; optional cache; access control.
- **POST /events/get-all-events** – Same idea; all events for device/cs_no.
- **GET /reports/recent**, **GET /reports/recent/download**, **POST /reports/history/download**, **GET /reports/signal-types** – All use Reports API and cs_no from device context.

### 2.5 Webhook (generic shape today)

- **POST /events/webhook** – No auth (rate limit only); intended for external systems (e.g. Affiliated).
- Logic:
  - Requires `device_id` or `imei` or `device_imei`; uses `event_type` / `eventName` / `signal_type` / `eventrpt_id`; extracts location from several possible shapes.
  - **Geofence:** For “Periodic Location” or “Panic” with location, runs `geofenceService.checkGeofenceStatus` (in/out fence, writes to `all_events`).
  - **Critical events:** `criticalEventNotificationService.isCriticalEvent(event)` checks for signal types `B, F, HU, M, RN`; if critical, `processCriticalEvent` finds senior by **device_id/imei** (getSeniorForDevice), then sends push + SMS to caregivers and logs.
- Returns 200 even on processing errors to avoid webhook retries.

### 2.6 Critical event notifications

- Critical types: Burglary (B), Fire (F), HoldUp/Panic (HU), Personal Emergency (M), Runaway (RN).
- Senior resolved from **device_id/imei** via Devices → UserDeviceMapping → Users (senior).
- Caregivers from SeniorCaregiverMapping; FCM + SMS via fcm.service and sms.service; duplicate prevention via EventNotificationLogs.

### 2.7 Geofence

- **Models:** DeviceGeoFenceSettings, AllEvents (in/out fence events).
- **Services:** calculate-distance (Haversine), geofence.service (check status, save/get settings, persist events).
- Geofence is evaluated **inside the webhook** when a location event is received; no separate “status” webhook handler yet.

### 2.8 Caregivers and help

- **GET /senior/get-mapped-caregiver-list**, **POST /senior/add-caregiver**, **POST /senior/delete-caregiver**, **POST /senior/help** (send help notification).
- Invitations: create, list, resend, revoke.
- **GET /caregiver/get-mapped-seniors-list** – List seniors for caregiver.
- Help uses same notification path as critical events (FCM + SMS to mapped caregivers).

### 2.9 Vitals and other

- **GET /vitals/recent**, **GET /vitals/download** – Use Reports API and cs_no from device context.
- **Middleware:** verify-token (JWT), require-auth, require-role, rate limits, audit logger, error handler.
- **Models:** Users, Devices, UserDeviceMapping (includes cs_no), SeniorCaregiverMapping, ExternalApiTokens, DeviceGeoFenceSettings, AllEvents, CaregiverInvitations, EventNotificationLogs, AuditLogs, etc.

---

## 3. Frontend – What’s done

- **API client** (`src/core/api/client.ts`) – Base URL from env; Bearer token from getter; interceptors; error handling.
- **APIs:** authApi (login, signup, updatePassword), deviceApi (getDevices, getDevice, getDeviceRecent, getFallDetection, requestSignal, addDevice – no fall toggle), eventsApi, mapApi (geofence, get-events-by-type), caregiverApi, reportsApi, vitalsApi.
- **Screens:** Welcome, Login, Signup, Home, Devices, DeviceDetails, AddDevice, Events, Map (with geofence modal, time range, polyline), CareCircle (caregivers/seniors), Profile, Vitals.
- **Home:** SOS/help, device status (battery, signal, location), recent events.
- **Map:** Location history (events by type), geofence circle, save/clear geofence.
- **Device details:** Fall detection **status** (read-only), request signal, device/recent info.
- **Store:** authStore (user, tokens).

---

## 4. What’s pending (high level)

### 4.1 Affiliated webhook payload formats (high priority)

- **Current webhook** expects a **generic** body with `device_id` or `imei`, `event_type`/`signal_type`, and location. It does **not** explicitly handle Affiliated’s two formats:
  - **Emergency:** `cs_no`, `eventid`, `resolutionCode`, `signaltype`, `time`, `location` (no `imei`). First call `resolutionCode` null = new emergency; second call with `resolutionCode` = resolved.
  - **Status:** `imei`, `cs_no`, `signal` (battery, location, signal_strength, timestamps).
- **Pending:**
  1. **Emergency webhook handler:** Detect Affiliated emergency payload (e.g. by presence of `cs_no` + `eventid` + `signaltype`). Resolve **senior (and device) by cs_no** (e.g. UserDeviceMapping.cs_no → device → senior), not only by imei. Map `signaltype` to your critical event codes (B, F, HU, M, RN) if needed; trigger existing critical notification flow; persist “emergency” and “resolved” in your events/DB if desired.
  2. **Status webhook handler:** Detect Affiliated status payload (e.g. `imei` + `signal`). Update last-known device status (battery, location, signal_strength) in your DB or cache so the app can show it without calling Device API every time; optionally run geofence check on `signal.location`.
  3. **Webhook auth:** Affiliated will send to your QA/Prod URLs. Add verification (e.g. shared secret header or signature) and document; store secret in env/Secret Server. Do not rely only on rate limit.

### 4.2 Fall detection toggle (product decision)

- Backend **Device API service** already has `turnOnFallDetection` / `turnOffFallDetection`.
- **Routes:** Only GET fall-detection exists; **no PUT/DELETE** (display only, per comment).
- **Pending:** If product wants toggle in app, add backend routes (e.g. PUT/DELETE or POST) that call deviceApiService.turnOnFallDetection/turnOffFallDetection and wire them in the app.

### 4.3 Webhook URL and auth (ops / Vaidhi)

- **Pending:** LifeStation/Vaidhi to provide **QA and Production** webhook endpoint URLs to Affiliated.
- **Pending:** Affiliated to provide **auth method and keys** (e.g. Secret Server); implement verification in `POST /events/webhook` (or a dedicated `/events/webhook/affiliated` if you want to keep generic webhook separate).

### 4.4 Resolve senior by cs_no (for emergency webhook)

- **Critical notification** today resolves senior only by **device_id/imei** (getSeniorForDevice). Affiliated **emergency** payload has **cs_no**, not imei.
- **Pending:** Add a way to resolve senior (and device) from **cs_no** (e.g. UserDeviceMapping by cs_no → device → user_id as senior), and use it in the emergency webhook path so notifications and event storage work when Affiliated sends only cs_no.

### 4.5 Optional / nice-to-have

- **Login model (A vs B):** Already Option A (LifeStation controls identity). If you later support Option B (vendor-controlled), that would be a separate auth flow and user linking.
- **SMS/device behavior:** Confirmed with Dan C – 6-hour check-in; on-demand via Device API. No code change required; just product/ops alignment.
- **Goals, medication reminders, activity (steps):** Per FEATURE_COMPARISON.md these are missing vs reference app; only add if product wants them.
- **Weather on Home:** Missing; add if desired.
- **Firebase:** Replace placeholders in backend `.env` with real project for push notifications in production.

---

## 5. Summary table

| Area                      | Done                                                                     | Pending                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Env & external API config | Yes (Affiliated base URL, LS_AW_API, brighton/affiliated/report clients) | Production secrets in Secret Server; Firebase for FCM                                                           |
| Auth (internal)           | Yes (login, signup, JWT, refresh)                                        | -                                                                                                               |
| Device API proxy          | Yes (list, read, recent, add, signal, fall status)                       | Fall **toggle** route + UI if product wants it                                                                  |
| Account API usage         | Yes (getAccount by cs_no for device names)                               | -                                                                                                               |
| Reports API usage         | Yes (events, recent, history, signal types, vitals)                      | -                                                                                                               |
| Events by type / map      | Yes (Reports API + cache + normalization)                                | -                                                                                                               |
| Geofence                  | Yes (save/get settings; check on location events in webhook)             | -                                                                                                               |
| Webhook (generic)         | Yes (device_id/imei, geofence, critical B/F/HU/M/RN)                     | **Affiliated emergency (cs_no) + status (imei+signal)** handlers; **webhook auth**; **resolve senior by cs_no** |
| Caregivers & help         | Yes                                                                      | -                                                                                                               |
| Frontend screens & APIs   | Yes (Home, Devices, Map, Events, CareCircle, Profile, Auth)              | Fall toggle UI if added on backend                                                                              |
| QA device / credentials   | Used in backend .env (qa1-api.alertmessage.com, LS_AW_API)               | -                                                                                                               |
| Webhook URLs & auth keys  | -                                                                        | **Provide URLs to Affiliated; implement verification**                                                          |

---

## 6. Next steps (recommended order)

1. **Webhook payload handling:** Implement Affiliated emergency and status handlers in `webhook-event.js` (or separate controllers), including resolve-by-cs_no for emergency and optional status persistence/geofence for status.
2. **Webhook security:** Agree with Affiliated on auth (header/signature); add verification; store secret in env/Secret Server.
3. **Provide webhook URLs:** Give Affiliated QA and Prod endpoint(s) (e.g. `https://your-api/events/webhook` or dedicated path) after auth is in place.
4. **Fall detection toggle:** If product wants it, add backend routes and app UI.
5. **Production:** Move all secrets out of `.env` into Secret Server; set `EXTERNAL_API_BASE_URL` (and any other env) for production Affiliated host.

This document reflects the state of the repo and env as of the audit. When you complete an item, you can move it from “Pending” to “Done” and update the summary table.
