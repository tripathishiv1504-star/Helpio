import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export function MapView({
  lat,
  lng,
  radiusKm,
  zoom = 13,
  height = '220px',
  className = '',
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !lat || !lng) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    } else {
      mapRef.current.setView([lat, lng], zoom);
      // Remove existing layers other than tile layer
      mapRef.current.eachLayer((layer) => {
        if (!(layer instanceof L.TileLayer)) {
          mapRef.current.removeLayer(layer);
        }
      });
    }

    const map = mapRef.current;
    L.marker([lat, lng]).addTo(map);

    if (radiusKm && radiusKm > 0) {
      L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#0d9488',
        fillColor: '#14b8a6',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);
    }
  }, [lat, lng, radiusKm, zoom]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`w-full rounded-lg border border-slate-200 overflow-hidden shadow-inner relative z-0 ${className}`}
    />
  );
}

export default MapView;
