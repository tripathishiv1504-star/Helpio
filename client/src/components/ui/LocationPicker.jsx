import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import Button from './Button.jsx';
import Input from './Input.jsx';

// Default center: New Delhi
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;

export function LocationPicker({
  value, // { lat, lng, address }
  onChange,
  label = 'Select Location',
  error,
  required = false,
  className = '',
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [address, setAddress] = useState(value?.address || '');
  const [coords, setCoords] = useState({
    lat: value?.lat ?? DEFAULT_LAT,
    lng: value?.lng ?? DEFAULT_LNG,
  });
  const [locating, setLocating] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = coords.lat;
    const initialLng = coords.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
    }).addTo(map);

    const updatePosition = (lat, lng, addrText) => {
      const roundedLat = Math.round(lat * 100000) / 100000;
      const roundedLng = Math.round(lng * 100000) / 100000;
      setCoords({ lat: roundedLat, lng: roundedLng });

      const finalAddr = addrText !== undefined ? addrText : address;
      if (onChange) {
        onChange({
          lat: roundedLat,
          lng: roundedLng,
          address: finalAddr,
        });
      }
    };

    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      updatePosition(pos.lat, pos.lng);
    });

    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      updatePosition(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (value && (value.lat !== coords.lat || value.lng !== coords.lng)) {
      setCoords({ lat: value.lat, lng: value.lng });
      if (value.address !== undefined) {
        setAddress(value.address);
      }
      if (mapRef.current && markerRef.current) {
        mapRef.current.setView([value.lat, value.lng], mapRef.current.getZoom());
        markerRef.current.setLatLng([value.lat, value.lng]);
      }
    }
  }, [value]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        const roundedLat = Math.round(latitude * 100000) / 100000;
        const roundedLng = Math.round(longitude * 100000) / 100000;
        setCoords({ lat: roundedLat, lng: roundedLng });

        if (mapRef.current && markerRef.current) {
          mapRef.current.setView([roundedLat, roundedLng], 15);
          markerRef.current.setLatLng([roundedLat, roundedLng]);
        }

        if (onChange) {
          onChange({
            lat: roundedLat,
            lng: roundedLng,
            address,
          });
        }
      },
      (err) => {
        setLocating(false);
        alert(`Unable to retrieve location: ${err.message}`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleAddressChange = (e) => {
    const newAddr = e.target.value;
    setAddress(newAddr);
    if (onChange) {
      onChange({
        lat: coords.lat,
        lng: coords.lng,
        address: newAddr,
      });
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleUseMyLocation}
          loading={locating}
        >
          📍 Use my location
        </Button>
      </div>

      <Input
        placeholder="Enter address or landmark description"
        value={address}
        onChange={handleAddressChange}
        name="address"
      />

      <div
        ref={mapContainerRef}
        className="w-full h-56 rounded-lg border border-slate-300 overflow-hidden shadow-inner relative z-0"
      />

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Click or drag pin on map to set coordinates</span>
        <span className="font-mono">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </span>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

export default LocationPicker;
