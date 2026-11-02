/**
 * Computes distance between two coordinates in kilometers using Haversine formula.
 * Coordinates can be { lat, lng } or { latitude, longitude } or [lng, lat] (GeoJSON format).
 */
export function haversineKm(a, b) {
  if (!a || !b) return Infinity;

  const parseCoord = (coord) => {
    if (Array.isArray(coord)) {
      // GeoJSON Point coordinates: [lng, lat]
      return { lng: coord[0], lat: coord[1] };
    }
    if (typeof coord === 'object') {
      const lat = coord.lat !== undefined ? coord.lat : coord.latitude;
      const lng = coord.lng !== undefined ? coord.lng : coord.longitude;
      return { lat: Number(lat), lng: Number(lng) };
    }
    return null;
  };

  const p1 = parseCoord(a);
  const p2 = parseCoord(b);

  if (!p1 || !p2 || isNaN(p1.lat) || isNaN(p1.lng) || isNaN(p2.lat) || isNaN(p2.lng)) {
    return Infinity;
  }

  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km

  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const lat1 = toRad(p1.lat);
  const lat2 = toRad(p2.lat);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const hav =
    sinHalfDLat * sinHalfDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinHalfDLng * sinHalfDLng;

  const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));
  return Math.round(R * c * 100) / 100; // round to 2 decimal places
}

export default haversineKm;
