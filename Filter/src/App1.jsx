import React, { useState, useEffect } from "react";
import Map, { Marker, Popup, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import mbxDirections from "@mapbox/mapbox-sdk/services/directions";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoiY2hhcmxlczI5ZyIsImEiOiJjbWNrYWVzYmUwYzY4MmpweGcwZDN0c25iIn0.JJ7mcLEqZchHFAV5XY776A";

const directionsClient = mbxDirections({ accessToken: MAPBOX_TOKEN });

export default function IntramurosMapboxApp() {
  const [pins, setPins] = useState([
    {
      latitude: 14.5896,
      longitude: 120.9747,
      title: "Welcome to Intramuros!",
      mediaType: "image",
      mediaUrl:
        "https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_960_720.jpg",
    },
  ]);

  const [viewState, setViewState] = useState({
    latitude: 14.5896,
    longitude: 120.9747,
    zoom: 16,
  });

  const [userLocation, setUserLocation] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(null); // ✅ NEW
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    mediaUrl: "",
    mediaType: "image",
  });

  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);

  // 🛰️ Track user's location in real-time
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ latitude, longitude });
        setViewState((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 🧭 Route from user to all pins
  useEffect(() => {
    if (!userLocation || pins.length < 1) return;

    const coordinates = [
      [userLocation.longitude, userLocation.latitude],
      ...pins.map((pin) => [pin.longitude, pin.latitude]),
    ];

    directionsClient
      .getDirections({
        profile: "walking",
        geometries: "geojson",
        waypoints: coordinates.map((coord) => ({
          coordinates: coord,
        })),
      })
      .send()
      .then((res) => {
        const route = res.body.routes[0];
        setRouteGeoJSON(route.geometry);
        setRouteDistance(route.distance);
      })
      .catch((err) => console.error("Route error:", err));
  }, [userLocation, pins]);

  const handleMapClick = (event) => {
    const { lng, lat } = event.lngLat;
    const newPin = {
      latitude: lat,
      longitude: lng,
      title: "New Location",
      mediaUrl: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      mediaType: "video",
    };
    setPins((prev) => [...prev, newPin]);
  };

  const handleEditPin = (index) => {
    const pin = pins[index];
    setEditingIndex(index);
    setFormData({
      title: pin.title,
      mediaUrl: pin.mediaUrl,
      mediaType: pin.mediaType,
    });
  };

  const savePinChanges = () => {
    const updatedPins = [...pins];
    updatedPins[editingIndex] = { ...updatedPins[editingIndex], ...formData };
    setPins(updatedPins);
    setEditingIndex(null);
  };

  const deletePin = () => {
    const updatedPins = pins.filter((_, i) => i !== editingIndex);
    setPins(updatedPins);
    setEditingIndex(null);
  };

  const renderPopup = (pin) => (
    <Popup
      latitude={pin.latitude}
      longitude={pin.longitude}
      anchor="top"
      closeOnClick={false}
      onClose={() => {
        setSelectedPin(null);
        setSelectedDistance(null);
      }}
    >
      <div style={{ maxWidth: 250 }}>
        <h4>{pin.title}</h4>
        {selectedDistance !== null && (
          <p>🛣️ Distance: {(selectedDistance / 1000).toFixed(2)} km</p>
        )}
        {pin.mediaType === "image" ? (
          <img src={pin.mediaUrl} alt="media" style={{ width: "100%" }} />
        ) : (
          <video src={pin.mediaUrl} controls width="100%" />
        )}
      </div>
    </Popup>
  );

  return (
    <div style={{ padding: "1rem" }}>
      <h2>User Map with Directions</h2>

      <Map
        initialViewState={viewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: "1000px", height: "600px" }}
        onClick={() => {
          setSelectedPin(null);
          setSelectedDistance(null);
        }}
      >
        {userLocation && (
          <Marker
            latitude={userLocation.latitude}
            longitude={userLocation.longitude}
            anchor="bottom"
          >
            <div style={{ fontSize: "24px", color: "red" }}>🧍</div>
          </Marker>
        )}

        {pins.map((pin, index) => (
          <Marker
            key={index}
            latitude={pin.latitude}
            longitude={pin.longitude}
            anchor="bottom"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPin(index);
                setSelectedDistance(null);

                // 🧮 Calculate single distance
                if (userLocation) {
                  directionsClient
                    .getDirections({
                      profile: "walking",
                      geometries: "geojson",
                      waypoints: [
                        {
                          coordinates: [
                            userLocation.longitude,
                            userLocation.latitude,
                          ],
                        },
                        {
                          coordinates: [pin.longitude, pin.latitude],
                        },
                      ],
                    })
                    .send()
                    .then((res) => {
                      const distance = res.body.routes[0].distance;
                      setSelectedDistance(distance);
                    })
                    .catch((err) => console.error("Single route error:", err));
                }
              }}
              style={{ fontSize: "24px", cursor: "pointer" }}
            >
              📍
            </div>
          </Marker>
        ))}

        {selectedPin !== null && renderPopup(pins[selectedPin])}

        {routeGeoJSON && (
          <Source id="route" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-layer"
              type="line"
              paint={{
                "line-color": "#007cbf",
                "line-width": 5,
              }}
            />
          </Source>
        )}
      </Map>

      {routeDistance && (
        <p style={{ fontSize: "18px", marginTop: "10px" }}>
          📍 Full Route Distance: {(routeDistance / 1000).toFixed(2)} km
        </p>
      )}

      <h2>Admin Map</h2>

      <Map
        initialViewState={viewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        style={{ width: "100%", height: "500px", marginTop: "1rem" }}
      >
        {pins.map((pin, index) => (
          <Marker
            key={index}
            latitude={pin.latitude}
            longitude={pin.longitude}
            anchor="bottom"
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleEditPin(index);
              }}
              style={{ fontSize: "24px", cursor: "pointer", color: "blue" }}
            >
              🛠️
            </div>
          </Marker>
        ))}
      </Map>

      {editingIndex !== null && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
            maxWidth: "400px",
            background: "#fefefe",
          }}
        >
          <h3>Edit Pin</h3>
          <label>
            Title:
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              style={{ width: "100%", marginBottom: "0.5rem" }}
            />
          </label>
          <label>
            Media URL:
            <input
              type="text"
              value={formData.mediaUrl}
              onChange={(e) =>
                setFormData({ ...formData, mediaUrl: e.target.value })
              }
              style={{ width: "100%", marginBottom: "0.5rem" }}
            />
          </label>
          <label>
            Media Type:
            <select
              value={formData.mediaType}
              onChange={(e) =>
                setFormData({ ...formData, mediaType: e.target.value })
              }
              style={{ width: "100%", marginBottom: "0.5rem" }}
            >
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </label>
          <div style={{ marginTop: "0.5rem" }}>
            <button onClick={savePinChanges}>💾 Save Changes</button>
            <button
              onClick={deletePin}
              style={{ marginLeft: "1rem", color: "red" }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
