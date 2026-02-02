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

- **Accepts:** `frequency` = `last_24_hours` | `last_7_days` | `last_30_days` | `all`.
- **Internal date range (used only when History is called):**
  - `last_24_hours` → 24 hours
  - `last_7_days` → 7 days
  - `last_30_days` → 30 days
  - `all` → 365 days

**Which LifeStation API is called:**

| Frontend sends  | Backend calls LifeStation         | Date range we control?          |
| --------------- | --------------------------------- | ------------------------------- |
| `last_24_hours` | **Recent** only                   | No – “recent” is vendor-defined |
| `last_7_days`   | **Recent** only                   | No – “recent” is vendor-defined |
| `last_30_days`  | **History** with `before`/`after` | Yes – 30 days                   |
| `all`           | **History** with `before`/`after` | Yes – 365 days                  |

- For `last_24_hours` or `last_7_days`: backend calls **Reports Recent** only (`GET /report/recent/{{cs_no}}`). No date parameters are sent; **how many days of data you get is defined by LifeStation’s Recent endpoint**, not by our app.
- If Recent returns 0 events, backend also tries **History** (with the same `frequency` → `before`/`after`), so then the range is 24h or 7 days.
- For `last_30_days` or `all`, backend uses **History** only, with `before` and `after` set from `getDateRange(frequency)` (30 days or 365 days).

---

## 3. Our frontend – what it sends

| Screen / flow   | API called                                             | Frequency sent                                |
| --------------- | ------------------------------------------------------ | --------------------------------------------- |
| Events Timeline | `eventsApi.getEvents(device_id, 'last_7_days')`        | **last_7_days**                               |
| Home (events)   | `eventsApi.getEvents(device_id, 'last_7_days')`        | **last_7_days**                               |
| Map (location)  | `eventsApi.getEventsByType(device_id, frequency, ...)` | User choice: last_24_hours, last_7_days, etc. |

So for the main Events screen we **always** send **last_7_days**. The backend then calls LifeStation **Recent** only, so the actual number of days of data is whatever LifeStation’s Recent API returns (not documented in the 3 Postman collections).

---

## 4. Summary

- **Account API / Device API:** No “last N days” – they are not event-history-by-date.
- **ReportsAPI Recent:** We use it for `last_24_hours` and `last_7_days`. **Number of days is not documented** in the collections; it’s whatever LifeStation’s “recent” window is.
- **ReportsAPI History:** We use it for `last_30_days` and `all`, with explicit `before`/`after`. Vendor doc says default is **last 30 days** when not specified; we specify, so we get **30 days** or **365 days** as coded.
- **Frontend:** Events Timeline and Home both request **last_7_days**; the backend serves that via **Recent**, so effective window is LifeStation’s “recent” definition, not guaranteed 7 days in the API contract.

If you need a **guaranteed** “last 7 days” from LifeStation, the backend would need to call **History** with `after` = 7 days ago (and `before` = now) for `last_7_days` instead of (or in addition to) Recent.
