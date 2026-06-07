import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Corrige ícone padrão quebrado no CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Re-centraliza o mapa quando lat/lng mudam externamente (após geocodificação)
function Recenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

// Permite clicar no mapa para mover o pino
function ClickToMove({ onChange }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const LocationPicker = ({ lat, lng, onChange }) => {
  const markerRef = useRef(null);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      style={{ height: 220, width: "100%", borderRadius: 8, border: "1px solid #ccc" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter lat={lat} lng={lng} />
      <ClickToMove onChange={onChange} />
      <Marker
        position={[lat, lng]}
        draggable
        ref={markerRef}
        eventHandlers={{
          dragend: () => {
            if (markerRef.current) {
              const { lat: newLat, lng: newLng } = markerRef.current.getLatLng();
              onChange(newLat, newLng);
            }
          },
        }}
      />
    </MapContainer>
  );
};

export default LocationPicker;
