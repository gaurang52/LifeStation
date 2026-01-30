# Fall Detection Implementation Comparison

## Reference Apps (umbrella-app-backend & v2-umbrella)

### Backend (umbrella-app-backend):

1. **Event Handling**:

   - Fall Detection is received as an EVENT: `fallDetection: "Fall Detection"`
   - When "Fall Detection" event is received, it triggers notifications (same as Panic)
   - Event is saved to `AllEvents` table

2. **Status Display**:
   - Fall Detection status comes from device settings: `device.extra_info.settings.fall_detection_status`
   - **NO API endpoints** to GET/PUT/DELETE fall detection status
   - Status is READ-ONLY (displayed but not toggleable via API)

### Frontend (v2-umbrella):

1. **Display Only**:
   - Shows fall detection status on Home screen
   - Displays: `activeDevice?.extra_info?.settings?.fall_detection_status`
   - Icon color: Green if enabled, Red if disabled
   - **NO toggle functionality** - just displays the status

---

## Your Implementation

### Backend ✅:

1. **Event Handling**: ✅

   - Fall Detection events handled in webhook
   - Triggers notifications via `critical-event-notification.service`
   - Events saved to `AllEvents` table

2. **API Endpoints**: ✅ (EXTRA - More than reference)

   - `GET /devices/:id_type/:id/fall-detection` - Get status
   - `PUT /devices/:id_type/:id/fall-detection` - Turn ON
   - `DELETE /devices/:id_type/:id/fall-detection` - Turn OFF
   - Matches Brighton Device API documentation

3. **Database**: ✅
   - Stores `fall_detection_enabled` in `Devices` table
   - Syncs with external API

### Frontend ⚠️:

1. **Display**: ✅

   - Shows fall detection status on Home screen
   - Shows in DeviceDetailsScreen

2. **Toggle Functionality**: ⚠️ **NEEDS UPDATE**
   - Currently calls: `toggleFallDetection(idType, id, enabled)` with body `{ enabled: boolean }`
   - **Backend now expects**:
     - `PUT` (no body) to turn ON
     - `DELETE` (no body) to turn OFF
   - **MISMATCH** - Frontend API needs to be updated

---

## Summary

### ✅ What You Have (Matching/Matching+):

1. ✅ Fall Detection event handling with notifications
2. ✅ Fall Detection status display on Home screen
3. ✅ **EXTRA**: API endpoints to GET/PUT/DELETE fall detection (reference doesn't have this)
4. ✅ Database storage

### ⚠️ What Needs Fixing:

1. ⚠️ **Frontend API mismatch**: `toggleFallDetection` sends body, but backend expects PUT (no body) or DELETE
2. ⚠️ Frontend needs to be updated to use separate `turnOnFallDetection` and `turnOffFallDetection` methods

---

## Recommendation

Update frontend `deviceApi.ts` to match the new backend implementation:

- Replace `toggleFallDetection(idType, id, enabled)`
- With separate methods:
  - `turnOnFallDetection(idType, id)` - calls PUT
  - `turnOffFallDetection(idType, id)` - calls DELETE

This will match the Brighton Device API documentation exactly.
