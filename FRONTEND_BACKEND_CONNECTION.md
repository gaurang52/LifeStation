# Frontend-Backend Connection: Geofence & Map Functionality

## Overview

This document explains how the frontend (v2-umbrella) and backend (umbrella-app-backend) are connected for geofence and map functionality.

---

## 1. API Endpoints Connection

### 1.1 Save Geofence Settings

**Frontend:**

- **File:** `v2-umbrella/app/services/api/mapService.ts`
- **Method:** `setGeoFence(device_id, lat, lng, radius)`
- **Endpoint:** `POST /devices/save-geo-fence-settings`
- **Request Body:**
  ```typescript
  {
    device_id: string,
    settings: {
      center: {
        lat: number,
        lng: number
      },
      radius: number  // in meters
    }
  }
  ```

**Backend:**

- **File:** `umbrella-app-backend/src/controllers/save.geo.fence.settings.js`
- **Route:** `POST /devices/save-geo-fence-settings`
- **Response:**
  ```json
  {
    "message": "Saved Geo Fence Settings Succesfully!"
  }
  ```

**Flow:**

1. User sets geofence center (tap/drag/search) and radius (slider) in frontend modal
2. User clicks "Save" button
3. Frontend calls `mapService.setGeoFence()` with device_id, lat, lng, radius
4. Backend receives request, validates, saves/updates in `device_geofence_settings` table
5. Frontend receives success message and closes modal

---

### 1.2 Get Geofence Settings

**Frontend:**

- **File:** `v2-umbrella/app/services/api/mapService.ts`
- **Method:** `getGeoFence(device_id)`
- **Endpoint:** `POST /devices/get-geo-fence-settings`
- **Request Body:**
  ```typescript
  {
    device_id: string;
  }
  ```

**Backend:**

- **File:** `umbrella-app-backend/src/controllers/get.geo.fence.settings.js`
- **Route:** `POST /devices/get-geo-fence-settings`
- **Response:**
  ```json
  {
    "data": {
      "device_id": "device123",
      "geo_fence_settings": {
        "center": {
          "lat": 40.7128,
          "lng": -74.006
        },
        "radius": 1000
      },
      "extra_information": {}
    },
    "message": "Geo Fence Settings Found!"
  }
  ```

**Flow:**

1. Screen loads or active device changes
2. Frontend calls `mapService.getGeoFence({ device_id })`
3. Backend queries `device_geofence_settings` table
4. Frontend receives response and updates:
   - `modalCenter` state with center lat/lng
   - `radius` state with radius value
5. If geofence exists, it's displayed on map when user opens geofence modal

---

### 1.3 Get Location Events (for Map Display)

**Frontend:**

- **File:** `v2-umbrella/app/services/api/eventService.ts`
- **Method:** `getEventsByTypeForMap(deviceId, frequency, "Periodic Location")`
- **Endpoint:** `POST /events/get-events-by-type`
- **Request Body:**
  ```typescript
  {
    device_id: string,
    frequency: string,  // "last_24_hours", "last_3_days", "last_7_days", "last_30_days"
    event_type: "Periodic Location"
  }
  ```

**Backend:**

- **File:** `umbrella-app-backend/src/controllers/get.event.history.from.essence.cloud.js` (or similar)
- **Route:** `POST /events/get-events-by-type`
- **Response:** Array of events with location data
  ```json
  {
    "data": [
      {
        "eventtime": "2024-01-01T12:00:00Z",
        "eventtype": "Periodic Location",
        "rawevent": {
          "location": {
            "latitude": 40.7128,
            "longitude": -74.006
          }
        }
      }
    ]
  }
  ```

**Flow:**

1. User selects time range (frequency) from dropdown
2. Frontend calls `eventService.getEventsByTypeForMap()` with device_id, frequency, "Periodic Location"
3. Backend fetches events from external API or database
4. Frontend receives events, filters for location data, transforms to coordinates array
5. Redux `setMapsData()` stores coordinates: `[{ latitude, longitude }, ...]`
6. Map displays polyline connecting all coordinates and marker at most recent location

---

## 2. Database Schema Connection

### 2.1 Geofence Settings Storage

**Table:** `device_geofence_settings`

**Schema:**

```sql
CREATE TABLE device_geofence_settings (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id),
  geo_fence_settings JSONB DEFAULT '{}',
  extra_information JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**geo_fence_settings JSON Structure:**

```json
{
  "center": {
    "lat": 40.7128,
    "lng": -74.006
  },
  "radius": 1000
}
```

**Connection:**

- Frontend sends this exact structure when saving
- Backend stores it as-is in JSONB column
- Frontend receives same structure when fetching

---

### 2.2 Location Events Storage

**Table:** `all_events` (for geofence events)

**Schema:**

```sql
CREATE TABLE all_events (
  id INTEGER PRIMARY KEY AUTO_INCREMENT,
  deviceid VARCHAR(255) NOT NULL,
  vendorcode VARCHAR(255),
  eventtime TIMESTAMP,
  eventtype VARCHAR(255),  -- "In Fence" or "Out Fence"
  eventid VARCHAR(255) UNIQUE NOT NULL,
  rawevent JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Geofence Event Structure:**

```json
{
  "deviceid": "device123",
  "vendorcode": "vendor1",
  "eventtime": "2024-01-01T12:00:00Z",
  "eventtype": "In Fence", // or "Out Fence"
  "eventid": "uuid-here",
  "rawevent": {
    "type": "in-fence", // or "out-fence"
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}
```

**Connection:**

- Backend automatically creates these events when location updates come via webhook
- Backend checks geofence status using Haversine formula
- Events are stored for historical tracking
- Frontend can query these events to show geofence violations

---

## 3. Geofence Calculation Logic

### 3.1 Haversine Formula

**Backend:**

- **File:** `umbrella-app-backend/src/services/calculate.distance.js`
- **Function:** `calculateDistance(circleLat, circleLong, deviceLocationLat, deviceLocationLong)`
- **Returns:** Distance in meters

**Formula:**

```javascript
const R = 6371000; // Earth radius in meters
const toRadians = degree => (degree * Math.PI) / 180;

const dLat = toRadians(circleLat - deviceLocationLat);
const dLng = toRadians(circleLong - deviceLocationLong);

const a =
  Math.sin(dLat / 2) ** 2 +
  Math.cos(toRadians(deviceLocationLat)) * Math.cos(toRadians(circleLat)) * Math.sin(dLng / 2) ** 2;

const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
const distance = R * c; // in meters
```

**Status Determination:**

- If `distance <= radius` → "In Fence"
- If `distance > radius` → "Out Fence"

---

### 3.2 Geofence Check Trigger

**Backend Webhook:**

- **File:** `umbrella-app-backend/src/controllers/real.time.events.controller.js`
- **Function:** `handleGeoFenceLogic(data, transaction)`
- **Triggered:** When "Periodic Location" or "Panic" events are received via webhook

**Flow:**

1. Webhook receives location event with `deviceUid`, `location`, `vendor`, `eventTime`
2. Backend queries `device_geofence_settings` for device
3. If geofence exists, calculates distance using Haversine formula
4. Determines status (in-fence/out-fence)
5. Creates event in `all_events` table with type "In Fence" or "Out Fence"
6. Transaction commits

---

## 4. Frontend State Management

### 4.1 Redux Store Structure

**Location Data:**

- **Slice:** `app/store/slices/eventSlice.ts`
- **State:** `mapsData: Location[]`
- **Action:** `setMapsData(events[])`
- **Transformation:** Filters events, extracts lat/lng from `rawevent.location`, converts to numbers

**Geofence State:**

- **Component State:** Managed in screen component
- **State Variables:**
  - `modalCenter`: `{ latitude, longitude }` - Geofence center
  - `radius`: `number` - Geofence radius in meters
  - `showMap`: `boolean` - Modal visibility

---

## 5. Map Display Components

### 5.1 Location Polyline

**Component:** `react-native-maps` → `<Polyline>`

- **Data Source:** Redux `mapsData` array
- **Props:**
  - `coordinates`: Array of `{ latitude, longitude }`
  - `strokeWidth`: 2
- **Purpose:** Shows path/trail of device movement

### 5.2 Location Marker

**Component:** `react-native-maps` → `<Marker>`

- **Position:** First coordinate in `mapsData` (most recent)
- **Props:**
  - `coordinate`: `{ latitude, longitude }`
  - `draggable`: true (but doesn't update data)
  - `title`: "Location"

### 5.3 Geofence Circle

**Component:** `react-native-maps` → `<Circle>`

- **Data Source:** `modalCenter` and `radius` state
- **Props:**
  - `center`: `modalCenter`
  - `radius`: `radius` (in meters)
  - `strokeColor`: Primary color
  - `fillColor`: Semi-transparent overlay
- **Purpose:** Visual representation of geofence boundary

---

## 6. Complete Data Flow Diagrams

### 6.1 Setting Geofence Flow

```
User Action (Frontend)
  ↓
1. User opens "Set Geo Fence" modal
  ↓
2. User taps map / drags marker / searches place
  → Updates modalCenter state
  ↓
3. User adjusts radius slider
  → Updates radius state
  ↓
4. User clicks "Save"
  → Calls mapService.setGeoFence(device_id, lat, lng, radius)
  ↓
API Request (POST /devices/save-geo-fence-settings)
  ↓
Backend Controller (save.geo.fence.settings.js)
  ↓
5. Check if geofence exists for device_id
  ↓
6. If exists: UPDATE device_geofence_settings
   If not: INSERT into device_geofence_settings
  ↓
7. Return success message
  ↓
Frontend Response
  ↓
8. Close modal, update local state
```

### 6.2 Getting Geofence Flow

```
Screen Load (Frontend)
  ↓
1. useEffect triggers when activeDevice changes
  ↓
2. Calls mapService.getGeoFence({ device_id })
  ↓
API Request (POST /devices/get-geo-fence-settings)
  ↓
Backend Controller (get.geo.fence.settings.js)
  ↓
3. Query device_geofence_settings WHERE device_id = ?
  ↓
4. Return geo_fence_settings data
  ↓
Frontend Response
  ↓
5. Update modalCenter with center.lat/lng
6. Update radius with radius value
7. Display geofence on map when modal opens
```

### 6.3 Location Events Flow

```
User Action (Frontend)
  ↓
1. User selects time range (frequency)
  ↓
2. Calls eventService.getEventsByTypeForMap(deviceId, frequency, "Periodic Location")
  ↓
API Request (POST /events/get-events-by-type)
  ↓
Backend Controller
  ↓
3. Fetch events from external API or database
  ↓
4. Filter events with location data
  ↓
5. Return events array
  ↓
Frontend Response
  ↓
6. Transform events to coordinates array
   - Extract lat/lng from rawevent.location
   - Convert to numbers
  ↓
7. Dispatch setMapsData(coordinates) to Redux
  ↓
8. Map displays polyline and marker
```

### 6.4 Real-time Geofence Check Flow

```
External System (Device)
  ↓
1. Device sends location update via webhook
  ↓
Backend Webhook (real.time.events.controller.js)
  ↓
2. Receive event with deviceUid, location, vendor, eventTime
  ↓
3. Check if event type is "Periodic Location" or "Panic"
  ↓
4. Call handleGeoFenceLogic(data, transaction)
  ↓
5. Query device_geofence_settings WHERE device_id = deviceUid
  ↓
6. If geofence exists:
   a. Extract center (lat, lng) and radius
   b. Calculate distance using Haversine formula
   c. Determine status: distance <= radius ? "in-fence" : "out-fence"
   d. Create event in all_events table:
      - eventtype: "In Fence" or "Out Fence"
      - rawevent: { type: status, location }
  ↓
7. Commit transaction
  ↓
8. Event stored for historical tracking
  ↓
Frontend (Future)
  ↓
9. Frontend can query all_events to show geofence violations
```

---

## 7. Key Files Reference

### Frontend Files:

- `v2-umbrella/app/services/api/mapService.ts` - Geofence API calls
- `v2-umbrella/app/services/api/eventService.ts` - Location events API calls
- `v2-umbrella/app/screens/MapsScreen.tsx` - Main map screen
- `v2-umbrella/app/screens/location/location.screen.tsx` - Alternative location screen
- `v2-umbrella/app/screens/location/location.hook.ts` - Location hook
- `v2-umbrella/app/store/slices/eventSlice.ts` - Redux slice for location data

### Backend Files:

- `umbrella-app-backend/src/controllers/save.geo.fence.settings.js` - Save geofence
- `umbrella-app-backend/src/controllers/get.geo.fence.settings.js` - Get geofence
- `umbrella-app-backend/src/controllers/real.time.events.controller.js` - Webhook handler
- `umbrella-app-backend/src/services/calculate.distance.js` - Haversine formula
- `umbrella-app-backend/src/models/DeviceGeoFenceSettings.js` - Geofence model
- `umbrella-app-backend/src/models/AllEvent.js` - Events model
- `umbrella-app-backend/src/migrations/20240101000015-create-device-geofence-settings.js` - Migration

---

## 8. API Endpoint Summary

| Endpoint                           | Method | Frontend Call                          | Backend Handler                           | Purpose                  |
| ---------------------------------- | ------ | -------------------------------------- | ----------------------------------------- | ------------------------ |
| `/devices/save-geo-fence-settings` | POST   | `mapService.setGeoFence()`             | `save.geo.fence.settings.js`              | Save/update geofence     |
| `/devices/get-geo-fence-settings`  | POST   | `mapService.getGeoFence()`             | `get.geo.fence.settings.js`               | Get existing geofence    |
| `/events/get-events-by-type`       | POST   | `eventService.getEventsByTypeForMap()` | `get.event.history.from.essence.cloud.js` | Get location events      |
| `/events/webhook`                  | POST   | External system                        | `real.time.events.controller.js`          | Receive location updates |

---

## 9. Data Format Consistency

### Geofence Settings Format:

Both frontend and backend use the same structure:

```typescript
{
  center: {
    lat: number,
    lng: number
  },
  radius: number  // meters
}
```

### Location Format:

Both use:

```typescript
{
  latitude: number,
  longitude: number
}
```

### Event Format:

```typescript
{
  eventtime: string,  // ISO timestamp
  eventtype: string,  // "Periodic Location", "In Fence", "Out Fence"
  rawevent: {
    location: {
      latitude: number,
      longitude: number
    }
  }
}
```

---

## 10. Authentication & Authorization

- All API calls use Bearer token authentication
- Token stored in AsyncStorage (frontend) and sent via Authorization header
- BaseService handles token injection automatically
- Backend verifies token via `verifyToken` middleware

---

This document provides a complete overview of how geofence and map functionality connects between the frontend and backend systems.
