# Umbrella (Production) vs LifeStation — What We Have / What We Don’t

Comparison of **umbrella-app-backend** + **v2-umbrella** (other vendor’s production app) with **LifeStation** (our backend + `src` app).

---

## 1. Backend: Umbrella vs LifeStation

### 1.1 Auth & Users

| Feature                         | Umbrella                                           | LifeStation                        |
| ------------------------------- | -------------------------------------------------- | ---------------------------------- |
| Login                           | ✅ POST /users/login                               | ✅ POST /auth/login                |
| Register                        | ✅ POST /users/register                            | ✅ POST /auth/signup               |
| Get profile                     | ✅ GET /users/profile                              | ✅ GET /auth/me                    |
| Update profile                  | ✅ POST /users/profile                             | ✅ PATCH /auth/profile             |
| Logout                          | ✅ POST /users/logout                              | ✅ (client-side clear token)       |
| Forgot password                 | ✅ POST /users/forgot-password, forgot-password-v2 | ❌ **We don’t** (UI “Coming soon”) |
| Verify OTP                      | ✅ POST /users/verify-otp                          | ❌ **We don’t**                    |
| Reset password                  | ✅ POST /users/reset-password                      | ❌ **We don’t** (no forgot flow)   |
| Request delete account          | ✅ POST /users/request-delete-account (v2)         | ❌ **We don’t**                    |
| Confirm / Cancel delete account | ✅ confirm-delete-account, cancel-delete-account   | ❌ **We don’t**                    |
| Update subscription             | ✅ POST /users/profile/subscription                | ❌ **We don’t**                    |
| Update language                 | ✅ POST /users/profile/language                    | ❌ **We don’t**                    |
| Update device color             | ✅ POST /users/profile/device-color                | ❌ **We don’t**                    |
| Check app update                | ✅ POST /users/check-update                        | ❌ **We don’t**                    |
| Send feedback                   | ✅ POST /users/feedback                            | ❌ **We don’t**                    |
| Update FCM token                | ✅ POST /users/update-fcm-token                    | ✅ (in login)                      |
| Remove FCM token                | ✅ POST /users/remove-fcm-token                    | ❌ **We don’t** (explicit remove)  |

### 1.2 Devices

| Feature                              | Umbrella                                 | LifeStation                                 |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| Get devices                          | ✅ POST /devices/get-devices             | ✅ GET /devices                             |
| Add device                           | ✅ POST /devices/add-device              | ✅ POST /devices                            |
| Get mapped devices                   | ✅ POST /devices/get-mapped-devices      | ✅ (in GET /devices with access control)    |
| Add device mapping                   | ✅ POST /devices/add-device-mapping      | ✅ (via add device)                         |
| Remove device mapping                | ✅ POST /devices/remove-device-mapping   | ❌ **We don’t** (no explicit unlink)        |
| Save geofence                        | ✅ POST /devices/save-geo-fence-settings | ✅ POST /devices/save-geo-fence-settings    |
| Get geofence                         | ✅ POST /devices/get-geo-fence-settings  | ✅ POST /devices/get-geo-fence-settings     |
| Device read / recent / signal / fall | N/A (different API shape)                | ✅ GET/POST/PUT per Device API              |
| Fall detection toggle                | N/A                                      | ✅ PUT /devices/:id_type/:id/fall-detection |

### 1.3 Caregivers / Senior (Care Circle)

| Feature                                           | Umbrella                                            | LifeStation                                     |
| ------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------- |
| Get mapped caregivers                             | ✅ GET /caregiver/get-mapped-caregiver-list (v1/v2) | ✅ GET /senior/get-mapped-caregiver-list        |
| Add caregiver                                     | ✅ POST /caregiver/add-caregiver (v1/v2)            | ✅ POST /senior/add-caregiver + invitations     |
| Delete caregiver                                  | ✅ POST /caregiver/delete-caregiver                 | ✅ POST /senior/delete-caregiver                |
| Send emergency help                               | ✅ POST /caregiver/send-emergency-help-message      | ✅ POST /senior/help                            |
| Notify caregivers (FCM)                           | ✅ POST /caregiver/notify-caregivers                | ❌ **We don’t** (only via help/critical events) |
| Get settings status                               | ✅ POST /caregiver/get-settings-status              | ❌ **We don’t**                                 |
| Set WiFi configuration                            | ✅ POST /caregiver/set-wifi-configuration           | ❌ **We don’t**                                 |
| Caregiver invitations (invite/resend/revoke/list) | Via add-caregiver v2                                | ✅ Full invitation flow                         |

### 1.4 Seniors (Caregiver view)

| Feature             | Umbrella                                         | LifeStation                               |
| ------------------- | ------------------------------------------------ | ----------------------------------------- |
| Get mapped seniors  | ✅ GET /senior/get-mapped-seniors-list           | ✅ GET /caregiver/get-mapped-seniors-list |
| Add senior          | ✅ POST /senior/add-senior                       | N/A (we use signup + cs_no)               |
| Medication add      | ✅ POST /senior/medication-reminder/add          | ❌ **We don’t**                           |
| Medication retrieve | ✅ POST /senior/medication-reminder/retrieve     | ❌ **We don’t**                           |
| Medication update   | ✅ PUT /senior/medication-reminder/update/:id    | ❌ **We don’t**                           |
| Medication delete   | ✅ DELETE /senior/medication-reminder/delete/:id | ❌ **We don’t**                           |

_(Umbrella mounts the same caregiver routes under both /senior and /caregiver; medication is under caregiver router in umbrella.)_

### 1.5 Events

| Feature                                   | Umbrella                                   | LifeStation                                                            |
| ----------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| Get events by type                        | ✅ POST /events/get-events-by-type         | ✅ POST /events/get-events-by-type                                     |
| Get all events                            | ✅ POST /events/get-all-events             | ✅ POST /events/get-all-events                                         |
| Real-time webhook                         | ✅ POST /real-time-events/receive (apiKey) | ✅ POST /events/webhook (rate limit)                                   |
| Event types (panic, fall, location, etc.) | ✅ Named handlers                          | ✅ Generic + Affiliated emergency/status                               |
| **Fall Detection alerts**                 | ✅ Sends FCM + SMS + Email (same as Panic) | ✅ Sends FCM + SMS for Fall Detection (FD); FD added to critical types |

### 1.6 Goals

| Feature            | Umbrella                   | LifeStation     |
| ------------------ | -------------------------- | --------------- |
| Set goal           | ✅ POST /goals/set-goal    | ❌ **We don’t** |
| Get goals          | ✅ POST /goals/get-goals   | ❌ **We don’t** |
| Update goal        | ✅ POST /goals/update-goal | ❌ **We don’t** |
| Delete goal        | ✅ POST /goals/delete-goal | ❌ **We don’t** |
| Goal progress cron | ✅ Cron job                | ❌ **We don’t** |

### 1.7 Reporting & Cron & Vendor

| Feature                                                                                         | Umbrella                                      | LifeStation                                 |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| Send reports by email                                                                           | ✅ POST /send-report, /reporting/send-reports | ❌ **We don’t** (no admin email reports)    |
| Cron jobs (event history, emergency sim, device status, nudges, goal progress, milestone reset) | ✅ /cron-jobs/\*                              | ❌ **We don’t** (no cron dashboard)         |
| Vendor API (vendor admin: register, login, devices, caregivers, seniors, link, etc.)            | ✅ /vendor/\*                                 | ❌ **We don’t** (single-tenant LifeStation) |
| SMS test                                                                                        | ✅ POST /sms/test                             | ❌ **We don’t** (SMS used internally only)  |

### 1.8 External API (LifeStation only)

| Feature                         | Umbrella                     | LifeStation                                                            |
| ------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Affiliated/Brighton Account API | N/A (different architecture) | ✅ account-api.service (getAccount, getAccounts, etc.)                 |
| Device API (brighton)           | N/A                          | ✅ device-api.service (full device + fall + SIM)                       |
| Reports API                     | N/A                          | ✅ reports-api.service (recent, history, signal types, account report) |
| Token refresh / encryption      | N/A                          | ✅ external-api-token.service                                          |

---

## 2. Frontend: v2-umbrella vs LifeStation

### 2.1 Screens & Tabs

| Screen                 | v2-umbrella                      | LifeStation                                    |
| ---------------------- | -------------------------------- | ---------------------------------------------- |
| Home                   | ✅ HomeScreen                    | ✅ HomeScreen                                  |
| Events                 | ✅ EventScreen                   | ✅ RecentEventsScreen                          |
| Location / Map         | ✅ LocationScreen                | ✅ MapScreen                                   |
| Care Circle            | ✅ CareScreen (Pro-gated)        | ✅ CareCircleScreen                            |
| Settings               | ✅ SettingScreen                 | ✅ ProfileScreen                               |
| Auth: Sign In          | ✅ SignInScreen                  | ✅ LoginScreen                                 |
| Auth: Create Account   | ✅ CreateAccountScreen           | ✅ SignupScreen                                |
| Auth: Forgot Password  | ✅ ForgotPasswordScreen          | ❌ **We don’t** (placeholder)                  |
| Auth: Set New Password | ✅ SetNewPasswordScreen          | ❌ **We don’t**                                |
| Splash                 | ✅ SplashScreen                  | ✅ WelcomeScreen                               |
| WebView                | ✅ WebViewScreen                 | ❌ **We don’t** (optional)                     |
| Add Caregiver          | ✅ AddCaregiverScreen            | ✅ AddCaregiverScreen                          |
| Activity               | ✅ ActivityScreen                | ❌ **We don’t**                                |
| Goals                  | ✅ GoalScreen                    | ❌ **We don’t**                                |
| Medication list        | ✅ MedicationListScreen          | ❌ **We don’t**                                |
| Set/Edit Medication    | ✅ SetMedicationScreen           | ❌ **We don’t**                                |
| Device Details         | Via Settings / device            | ✅ DeviceDetailsScreen, DeviceDetailsTabScreen |
| Add Device             | ✅ AddDeviceScreen (Settings)    | ✅ AddDeviceScreen                             |
| Edit Profile           | ✅ EditProfileScreen / edit view | ✅ ProfileScreen (edit modal)                  |
| Feedback               | ✅ FeedbackView in Settings      | ❌ **We don’t**                                |
| WiFi config            | ✅ WifiView in Settings          | ❌ **We don’t**                                |
| Language               | ✅ Language screen               | ❌ **We don’t** (no i18n)                      |

### 2.2 Home

| Feature                         | v2-umbrella                    | LifeStation          |
| ------------------------------- | ------------------------------ | -------------------- |
| Help/SOS button                 | ✅ send-emergency-help-message | ✅ POST /senior/help |
| Device status (battery, signal) | ✅                             | ✅                   |
| Recent events                   | ✅                             | ✅                   |
| Weather                         | ✅                             | ❌ **We don’t**      |
| Activity/Steps summary          | ✅ (Pro)                       | ❌ **We don’t**      |
| Goals entry (set goal)          | ✅ (Pro)                       | ❌ **We don’t**      |
| Medication entry                | ✅ (Pro)                       | ❌ **We don’t**      |

### 2.3 Map / Location

| Feature                             | v2-umbrella | LifeStation |
| ----------------------------------- | ----------- | ----------- |
| Location history (polyline)         | ✅          | ✅          |
| Time range (24h, 7d, 30d, All)      | ✅          | ✅          |
| Geofence circle                     | ✅          | ✅          |
| Set/Clear geofence (modal + slider) | ✅          | ✅          |

### 2.4 Care Circle

| Feature                               | v2-umbrella | LifeStation |
| ------------------------------------- | ----------- | ----------- |
| List caregivers/seniors               | ✅          | ✅          |
| Add caregiver                         | ✅          | ✅          |
| Invitations (pending, resend, revoke) | Via v2 API  | ✅ Full UI  |
| Delete caregiver                      | ✅          | ✅          |

### 2.5 Settings / Profile

| Feature                                 | v2-umbrella | LifeStation              |
| --------------------------------------- | ----------- | ------------------------ |
| Edit name, mobile                       | ✅          | ✅                       |
| Notification toggle                     | ✅          | ✅                       |
| Update password                         | ✅          | ✅                       |
| Language                                | ✅          | ❌ **We don’t**          |
| Device color                            | ✅          | ❌ **We don’t**          |
| WiFi configuration                      | ✅          | ❌ **We don’t**          |
| Feedback                                | ✅          | ❌ **We don’t**          |
| Delete account (request/confirm/cancel) | ✅          | ❌ **We don’t**          |
| App version / check update              | ✅          | ❌ **We don’t**          |
| LifeStation account (cs_no)             | N/A         | ✅ getLifestationAccount |

### 2.6 Pro / Gating

| Feature                        | v2-umbrella         | LifeStation                                 |
| ------------------------------ | ------------------- | ------------------------------------------- |
| isPro / Care Circle tab gating | ✅ extra_info.isPro | ❌ **We don’t** (all users see Care Circle) |

---

## 3. Summary Tables

### We have (aligned with or beyond Umbrella)

**Backend**

- Auth: login, signup, me, profile, update password; FCM in login.
- Devices: list, add, get, recent, telemetry, fall detection (read + toggle), signal, name, geofence save/get; device metadata by IMEI.
- Care Circle: get caregivers/seniors, add/delete caregiver, help (emergency message); full invitation flow (invite, list, resend, revoke).
- Events: get-events-by-type, get-all-events; webhook with Affiliated emergency/status + generic.
- Reports: recent, history download, signal types; vitals recent/download.
- Geofence: save/get, in/out fence in webhook.
- Critical event notifications (FCM + SMS).
- External APIs: Account, Device, Reports (Affiliated/Brighton); token handling.

**Frontend**

- Tabs: Home, Events, Map, Care Circle, Profile.
- Home: device status, recent events, help button, refresh.
- Map: location history, time range, geofence modal (set/clear).
- Care Circle: list, add caregiver, invitations, delete.
- Devices: list, add, device details, fall detection switch, request signal, edit name, reports download.
- Profile: edit profile, notification toggle, update password, LifeStation account, logout.
- Auth: Welcome, Login, Signup.
- Vitals screen (recent + download).

### We don’t have (Umbrella has)

**Backend**

- Forgot password + verify OTP + reset password.
- Request/confirm/cancel delete account.
- Update subscription, language, device color.
- Check app update, send feedback.
- Remove FCM token (explicit).
- Remove device mapping (unlink device).
- Get settings status, set WiFi configuration.
- Medication reminders (add, get, update, delete).
- Goals (set, get, update, delete) + goal progress cron.
- Activity/daily steps storage and cron (e.g. milestone reset, nudges).
- Admin: send reports by email; cron control endpoints; vendor API; SMS test.

**Frontend**

- Forgot password + set new password screens.
- Goals screen + set goal from Home.
- Medication list + set/edit medication screens.
- Activity screen (steps, charts).
- Weather on Home.
- Language selection / i18n.
- Device color in settings.
- WiFi configuration screen.
- Feedback screen.
- Delete account (request/confirm/cancel).
- App update check + update modal.
- Pro feature gating (e.g. Care Circle by isPro).
- WebView screen (optional).

---

## 4. Quick reference

| Area                | We have                                                   | We don’t                                                                                                                        |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**            | Login, signup, me, profile, update password, FCM on login | Forgot/reset password, OTP, delete account, subscription/language/device-color, check update, feedback, remove FCM              |
| **Devices**         | Full CRUD-style, geofence, fall toggle, signal, reports   | Remove device mapping                                                                                                           |
| **Care Circle**     | Caregivers/seniors, add/delete, help, invitations         | Notify-caregivers only, settings status, WiFi config                                                                            |
| **Events**          | By type, all, webhook (Affiliated + generic)              | —                                                                                                                               |
| **Goals**           | —                                                         | Set/get/update/delete goals, goal cron                                                                                          |
| **Medication**      | —                                                         | Add/get/update/delete reminders                                                                                                 |
| **Activity**        | —                                                         | Steps, activity screen, related crons                                                                                           |
| **Reports**         | Recent, history, signal types, vitals                     | Email send, admin reporting                                                                                                     |
| **Vendor / Cron**   | —                                                         | Vendor API, cron control, SMS test                                                                                              |
| **Frontend extras** | Vitals, LifeStation account in profile                    | Goals, Medication, Activity, Weather, Language, Device color, WiFi, Feedback, Delete account, Update check, Pro gating, WebView |

This document reflects the current state of **umbrella-app-backend**, **v2-umbrella**, and **LifeStation** (backend + `src`).
