# Events timeline – sort order and date fields

## Two date fields in the API response

Each event in the response has two relevant timestamps:

| Field          | Location                            | Meaning                                                                                                                      | Example (from `response.txt`)                                         |
| -------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **eventtime**  | Top-level on each event             | **Preferred:** actual occurrence time (when backend has it). **Otherwise:** report/batch time (when the report was fetched). | Often same for all events in a batch, e.g. `2026-02-02T18:07:26.280Z` |
| **event_date** | `rawevent.originalEvent.event_date` | **Actual occurrence time** – when the event really happened.                                                                 | Varies per event, e.g. `2026-01-30 10:44:47`, `2026-01-22 05:48:10`   |

## How to sort events

- **Sort by when the event happened:** use **event_date** (from `rawevent.originalEvent.event_date`).  
  If that’s missing, fall back to **eventtime**.

- **Backend** (`get-all-events.js`):

  - Normalizes so **eventtime** is set from **event_date** when the API provides it.
  - Sorts by: `rawevent.originalEvent.event_date || eventtime` (newest first).

- **Frontend** (Events Timeline):
  - Sorts and groups by the same logic: use **event_date** when present, else **eventtime**.
  - Displays the time from **event_date** (so the user sees “Jan 30” when the event actually happened, not “Feb 2” report time).

So: **yes, the API and UI are designed to sort by “event time”** – and that time is the **actual occurrence** (event_date) when available, not the batch report time.

## Postman / API contracts

- **Account API** – accounts, auth. No events.
- **Device API** – devices, fall detection, etc. No “get all events” request; events come from the LifeStation backend.
- **ReportsAPI** – report/recent, report/history. The backend calls these; the **events** list you see is returned by **LifeStation backend** `POST /events/get-all-events` (see `backend/src/routes/events.routes.js`).

Sort order for events is defined by the backend (see above); there is no separate `sort` query parameter. The backend returns events **newest first** using occurrence time (event_date when available).
