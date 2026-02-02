# LifeStation API – What data is fetched (date range)

Summary of the 3 LifeStation Postman collections and how many days of data are fetched when we call them from the frontend/backend.

---

## 1. LifeStation API collections (Postman)

### Account API

- **Purpose:** Accounts (acct), auth, contacts, etc.
- **Date range:** None. These endpoints do not fetch “last N days” of data; they return account/contact info.

### Device API

- **Purpose:** Devices, device read, “Device Get Most Recent Information” (`/device/{{id_type}}/{{id}}/recent`), fall detection, etc.
- **Date range:** None documented. `/recent` returns the **most recent** device state/snapshot, not a time-windowed list of events. No `before`/`after` or “days” parameters.

### ReportsAPI

- **Recent:** `GET /report/recent/{{cs_no}}`
  - No query or body parameters.
  - **How many days?** Not specified in the Postman collection. The LifeStation API decides what “recent” means (e.g. last 7 days, last 30 days, or a fixed window). We do not send a date range.
- **History:** `POST /report/history` with JSON body:
  - `before` (optional) – end date; defaults to **time of request**.
  - `after` (optional) – start date; defaults to **today − 30 days** (per collection description).
  - So if you omit both, the API returns **last 30 days** by default. If you send `before` and `after`, you get exactly that range.

---

## 2. Our backend – `get-all-events`

- **Accepts:** `frequency` = `last_24_hours` | `last_30_days` | `all` (default: `last_24_hours`).
- **Internal date range (used only when History is called):**
  - `last_24_hours` → 24 hours (not sent to Recent; Recent has no date params)
  - `last_30_days` → 30 days
  - `all` → 365 days

**Which LifeStation API is called:**

| Frontend sends  | Backend calls LifeStation         | Date range we control?          |
| --------------- | --------------------------------- | ------------------------------- |
| `last_24_hours` | **Recent** only (one GET; fast)   | No – “recent” is vendor-defined |
| `last_30_days`  | **History** with `before`/`after` | Yes – 30 days                   |
| `all`           | **History** with `before`/`after` | Yes – 365 days                  |

- For `last_24_hours`: backend calls **Reports Recent** only (`GET /report/recent/{{cs_no}}`). One fast request; no History fallback.
- For `last_30_days` or `all`, backend uses **History** only (create report → poll ready → get data), with `before` and `after` from `getDateRange(frequency)`.

---

## 3. Our frontend – what it sends

| Screen / flow   | API called                                             | Frequency sent                                |
| --------------- | ------------------------------------------------------ | --------------------------------------------- |
| Events Timeline | `eventsApi.getEvents(device_id, 'last_24_hours')`      | **last_24_hours** (fast – Recent only)        |
| Home (events)   | `eventsApi.getEvents(device_id, 'last_24_hours')`      | **last_24_hours**                             |
| Map (location)  | `eventsApi.getEventsByType(device_id, frequency, ...)` | User choice: last_24_hours, last_30_days, all |

Events and Home use **last_24_hours** so the backend uses the fast **Recent** endpoint. Map allows last_24_hours, last_30_days, or all.

---

## 4. Summary

- **Account API / Device API:** No “last N days” – they are not event-history-by-date.
- **ReportsAPI Recent:** We use it only for `last_24_hours` (one GET; fast). Number of days is whatever LifeStation’s “recent” window is.
- **ReportsAPI History:** We use it for `last_30_days` and `all`, with explicit `before`/`after` (create → poll → get; slower).
- **Frontend:** Events Timeline and Home request **last_24_hours** by default for a fast response. Map offers last_24_hours, last_30_days, and all.
