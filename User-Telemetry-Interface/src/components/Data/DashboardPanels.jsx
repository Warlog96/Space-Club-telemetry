import React, { useEffect, useRef, useState } from 'react';

// --- Reusable Panel Container ---
const Panel = ({ title, children, className = '' }) => (
    <div className={`glass-panel ${className}`} style={{ padding: '1rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ borderBottom: '1px solid #66fcf1', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '1rem', color: '#66fcf1' }}>
            {title}
        </h3>
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
    </div>
);

// --- 1. System Status Panel ---
export const SystemStatus = ({ data }) => {
    // Track component activity based on data reception
    const gpsActive = data?.gps?.valid || false;
    const mpuActive = data?.imu?.calibrated || false;
    const loraActive = data?.radio?.rssi_dbm !== undefined && data?.radio?.rssi_dbm !== null;

    // Get RSSI and SNR values
    const rssi = data?.radio?.rssi_dbm || 0;
    const snr = data?.radio?.snr_db || 0;

    const StatusIndicator = ({ label, isActive }) => (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem'
        }}>
            <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: isActive ? '#00ff00' : '#ff0000',
                boxShadow: isActive
                    ? '0 0 8px rgba(0, 255, 0, 0.6)'
                    : '0 0 8px rgba(255, 0, 0, 0.6)',
                transition: 'all 0.3s ease'
            }} />
            <span style={{
                color: '#c5c6c7',
                fontSize: '0.95rem',
                fontWeight: '500',
                letterSpacing: '0.5px'
            }}>
                {label}
            </span>
        </div>
    );

    return (
        <Panel title="SYSTEM STATUS">
            <div style={{ padding: '0.5rem 0' }}>
                {/* Component Status Indicators */}
                <StatusIndicator label="GPS" isActive={gpsActive} />
                <StatusIndicator label="MPU" isActive={mpuActive} />
                <StatusIndicator label="LoRa" isActive={loraActive} />

                {/* Signal Strength Section */}
                <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(102, 252, 241, 0.2)'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem'
                    }}>
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>RSSI</span>
                        <span style={{
                            color: rssi > -90 ? '#03dac6' : '#cf6679',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            fontFamily: 'Orbitron'
                        }}>
                            {rssi} dBm
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: '#888', fontSize: '0.85rem' }}>SNR</span>
                        <span style={{
                            color: snr > 0 ? '#03dac6' : '#cf6679',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            fontFamily: 'Orbitron'
                        }}>
                            {snr} dB
                        </span>
                    </div>
                </div>
            </div>
        </Panel>
    );
};

// --- 2. GPS Info ---
export const GPSInfo = ({ gps }) => (
    <div className="light-card">
        <h4 style={{ borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>GPS DATA</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div>Lat: <b>{gps?.latitude.toFixed(5)}</b></div>
            <div>Lon: <b>{gps?.longitude.toFixed(5)}</b></div>
            <div>Alt: <b>{gps?.altitude_m.toFixed(2)}m</b></div>
            {/* Speed not in new JSON, assume 0 or calc? */}
            <div>Valid: <b>{gps?.valid ? 'YES' : 'NO'}</b></div>
        </div>
    </div>
);

// --- 3. Mission Clock ---
export const MissionClock = ({ timestamp }) => {
    // Timestamp is likely ms since boot or epoch. 
    // We can display it as raw mission time.
    const seconds = Math.floor(timestamp / 1000);
    const mm = Math.floor((seconds % 3600) / 60);
    const ss = seconds % 60;
    const format = `T+ ${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;

    return (
        <Panel title="MISSION CLOCK">
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontFamily: 'Orbitron', color: '#03dac6' }}>
                    {format}
                </div>
            </div>
        </Panel>
    );
};

// --- 4. Max Altitude ---
export const MaxAltitude = ({ gpsAlt, bmpAlt }) => {
    const [maxGps, setMaxGps] = useState(0);
    const [maxBmp, setMaxBmp] = useState(0);

    useEffect(() => {
        if (gpsAlt > maxGps) setMaxGps(gpsAlt);
        if (bmpAlt > maxBmp) setMaxBmp(bmpAlt);
    }, [gpsAlt, bmpAlt]);

    return (
        <div className="light-card">
            <h4>PEAK ALTITUDE</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>GPS: {maxGps.toFixed(1)}m</span>
                <span>BMP: {maxBmp.toFixed(1)}m</span>
            </div>
        </div>
    );
};

// --- 5. Raw Data ---
export const RawLog = ({ data }) => {
    const endRef = useRef(null);
    useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [data]);

    return (
        <Panel title="RAW TELEMETRY" className="raw-log">
            <pre style={{ fontSize: '0.7rem', color: '#03dac6', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(data, null, 2)}
            </pre>
            <div ref={endRef} />
        </Panel>
    );
};
