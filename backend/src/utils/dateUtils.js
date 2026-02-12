/**
 * Normalize any timestamp value to UTC ISO 8601 string with Z suffix.
 * Used so we always store and send UTC; clients/caregiver timezone formatting can then be correct.
 * DST-safe: we work in UTC only; display timezone handling is done with IANA (e.g. Intl).
 *
 * @param {Date|string|number} value - Date, ISO string (with or without Z), or ms since epoch
 * @returns {string} - ISO string ending with Z, e.g. "2025-02-12T10:30:00.000Z"
 */
function toUtcIso(value) {
  if (value == null) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return new Date().toISOString();
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  }
  return new Date().toISOString();
}

module.exports = { toUtcIso };
