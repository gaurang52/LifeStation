/**
 * Service for calculating distance between two geographic points using Haversine formula
 * Returns distance in meters
 */
class CalculateDistanceService {
  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of first point (in degrees)
   * @param {number} lon1 - Longitude of first point (in degrees)
   * @param {number} lat2 - Latitude of second point (in degrees)
   * @param {number} lon2 - Longitude of second point (in degrees)
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Validate inputs
    if (
      lat1 === null ||
      lat1 === undefined ||
      isNaN(lat1) ||
      lon1 === null ||
      lon1 === undefined ||
      isNaN(lon1) ||
      lat2 === null ||
      lat2 === undefined ||
      isNaN(lat2) ||
      lon2 === null ||
      lon2 === undefined ||
      isNaN(lon2)
    ) {
      throw new Error('Invalid coordinates provided to calculateDistance');
    }

    // Validate latitude range (-90 to 90)
    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }

    // Validate longitude range (-180 to 180)
    if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }

    const R = 6371000; // Radius of Earth in meters
    const toRadians = degree => (degree * Math.PI) / 180;

    const deviceLatInRadians = toRadians(lat1);
    const geoFenceLatInRadians = toRadians(lat2);

    const dLatInRadians = toRadians(lat2 - lat1);
    const dLongInRadians = toRadians(lon2 - lon1);

    // Haversine formula
    const a =
      Math.sin(dLatInRadians / 2) ** 2 +
      Math.cos(deviceLatInRadians) *
        Math.cos(geoFenceLatInRadians) *
        Math.sin(dLongInRadians / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
  }
}

module.exports = new CalculateDistanceService();
