import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cityCoords } from "../data/cityCoords";

// Fix default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function SoldierMarkers({ soldiers }) {
  return soldiers.map((s) => {
    let lat = s.lat;
    let lng = s.lng;
    if ((!lat || !lng) && s.city && cityCoords[s.city]) {
      const coords = cityCoords[s.city];
      lat = coords[0] + (Math.random() - 0.5) * 0.01;
      lng = coords[1] + (Math.random() - 0.5) * 0.01;
    }
    if (!lat || !lng) return null;
    return (
      <Marker key={s._id} position={[lat, lng]}>
        <Popup>
          <b>{s.name}</b>
          <br />
          {s.city}
          <br />
          {s.phone}
        </Popup>
      </Marker>
    );
  });
}

function AlertCircles({ activeCities }) {
  return activeCities.map((city) => {
    const coords = cityCoords[city];
    if (!coords) return null;
    return (
      <Circle
        key={city}
        center={coords}
        radius={5000}
        pathOptions={{ color: "#dc2626", fillColor: "#fee2e2", fillOpacity: 0.4 }}
      >
        <Popup>
          <b>{city}</b>
          <br />
          התראה פעילה
        </Popup>
      </Circle>
    );
  });
}

export default function SoldiersMap({ soldiers, activeCities }) {
  return (
    <div id="map">
      <MapContainer center={[31.5, 34.8]} zoom={7} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SoldierMarkers soldiers={soldiers} />
        <AlertCircles activeCities={activeCities} />
      </MapContainer>
    </div>
  );
}
