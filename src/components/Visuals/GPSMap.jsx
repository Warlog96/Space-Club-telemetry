import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import './GPSMap.css';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for admin location
const AdminIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
            <circle cx="15" cy="15" r="12" fill="#66fcf1" opacity="0.3"/>
            <circle cx="15" cy="15" r="8" fill="#66fcf1" opacity="0.6"/>
            <circle cx="15" cy="15" r="4" fill="#66fcf1"/>
        </svg>
    `),
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center[0] !== 0 && center[1] !== 0) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
}

const GPSMap = ({ data }) => {
    const [adminLocation, setAdminLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isTracking, setIsTracking] = useState(false);
    const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'

    // Rocket position from telemetry
    const rocketLat = data?.gps?.latitude || 0;
    const rocketLon = data?.gps?.longitude || 0;
    const rocketPos = [rocketLat, rocketLon];

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    };

    // Calculate bearing between two coordinates
    const calculateBearing = (lat1, lon1, lat2, lon2) => {
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const y = Math.sin(Δλ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
        const θ = Math.atan2(y, x);
        const bearing = (θ * 180 / Math.PI + 360) % 360;

        return bearing;
    };

    // Get admin location using browser geolocation API
    const getAdminLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        setIsTracking(true);
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setAdminLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
                setIsTracking(false);
            },
            (error) => {
                setLocationError(error.message);
                setIsTracking(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    // Share location (copy Google Maps link to clipboard)
    const shareLocation = () => {
        if (!adminLocation) {
            alert('Please enable location tracking first');
            return;
        }

        const googleMapsUrl = `https://www.google.com/maps?q=${adminLocation.lat},${adminLocation.lon}`;

        navigator.clipboard.writeText(googleMapsUrl).then(() => {
            alert('Google Maps link copied to clipboard!');
        }).catch(() => {
            alert('Failed to copy location');
        });
    };

    // Share rocket location (copy Google Maps link to clipboard)
    const shareRocketLocation = () => {
        if (rocketLat === 0 && rocketLon === 0) {
            alert('No rocket location data available');
            return;
        }

        const googleMapsUrl = `https://www.google.com/maps?q=${rocketLat},${rocketLon}`;

        navigator.clipboard.writeText(googleMapsUrl).then(() => {
            alert('✅ Rocket location copied to clipboard!\n\nPaste the link in your browser to view on Google Maps.');
        }).catch(() => {
            alert('❌ Failed to copy location. Please try again.');
        });
    };

    // Toggle between satellite and street view
    const toggleMapType = () => {
        setMapType(prev => prev === 'street' ? 'satellite' : 'street');
    };

    // Calculate stats if both locations are available
    const stats = adminLocation && rocketLat !== 0 && rocketLon !== 0 ? {
        distance: calculateDistance(adminLocation.lat, adminLocation.lon, rocketLat, rocketLon),
        bearing: calculateBearing(adminLocation.lat, adminLocation.lon, rocketLat, rocketLon)
    } : null;

    // Determine map center
    const mapCenter = rocketLat !== 0 && rocketLon !== 0
        ? rocketPos
        : adminLocation
            ? [adminLocation.lat, adminLocation.lon]
            : [28.6139, 77.2090]; // Default to Delhi

    return (
        <div className="gps-map-container">
            {/* Map Controls Overlay */}
            <div className="map-controls">
                <button
                    className={`control-btn ${mapType === 'satellite' ? 'active' : ''}`}
                    onClick={toggleMapType}
                    title={`Switch to ${mapType === 'street' ? 'Satellite' : 'Street'} View`}
                >
                    {mapType === 'street' ? '🛰️ Satellite View' : '🗺️ Street View'}
                </button>

                {rocketLat !== 0 && rocketLon !== 0 && (
                    <button
                        className="control-btn rocket-share"
                        onClick={shareRocketLocation}
                    >
                        🚀 Copy Rocket Location
                    </button>
                )}

                {locationError && (
                    <div className="location-error">
                        ⚠️ {locationError}
                    </div>
                )}
            </div>

            {/* Stats Overlay */}
            {stats && (
                <div className="map-stats">
                    <div className="stat-card">
                        <div className="stat-label">Distance</div>
                        <div className="stat-value">
                            {stats.distance >= 1000
                                ? `${(stats.distance / 1000).toFixed(2)} km`
                                : `${stats.distance.toFixed(0)} m`
                            }
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Bearing</div>
                        <div className="stat-value">{stats.bearing.toFixed(0)}°</div>
                    </div>
                </div>
            )}

            {/* Leaflet Map */}
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                {mapType === 'street' ? (
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                ) : (
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        maxZoom={19}
                    />
                )}
                <MapUpdater center={mapCenter} />

                {/* Rocket Marker */}
                {rocketLat !== 0 && rocketLon !== 0 && (
                    <Marker position={rocketPos}>
                        <Popup>
                            <strong>🚀 Rocket Location</strong><br />
                            Lat: {rocketLat.toFixed(6)}<br />
                            Lon: {rocketLon.toFixed(6)}<br />
                            Alt: {data?.gps?.altitude_m?.toFixed(2) || 'N/A'} m
                        </Popup>
                    </Marker>
                )}

                {/* Admin Marker */}
                {adminLocation && (
                    <>
                        <Marker
                            position={[adminLocation.lat, adminLocation.lon]}
                            icon={AdminIcon}
                        >
                            <Popup>
                                <strong>👤 Admin Location</strong><br />
                                Lat: {adminLocation.lat.toFixed(6)}<br />
                                Lon: {adminLocation.lon.toFixed(6)}<br />
                                Accuracy: ±{adminLocation.accuracy.toFixed(0)} m
                            </Popup>
                        </Marker>

                        {/* Accuracy circle */}
                        <Circle
                            center={[adminLocation.lat, adminLocation.lon]}
                            radius={adminLocation.accuracy}
                            pathOptions={{
                                color: '#66fcf1',
                                fillColor: '#66fcf1',
                                fillOpacity: 0.1,
                                weight: 1
                            }}
                        />
                    </>
                )}

                {/* Shortest Path Line */}
                {adminLocation && rocketLat !== 0 && rocketLon !== 0 && (
                    <Polyline
                        positions={[
                            [adminLocation.lat, adminLocation.lon],
                            rocketPos
                        ]}
                        pathOptions={{
                            color: '#cf6679',
                            weight: 3,
                            opacity: 0.7,
                            dashArray: '10, 10'
                        }}
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default GPSMap;
