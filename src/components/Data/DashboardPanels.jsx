import React, { useEffect, useRef, useState } from 'react';

// ─── Shared bar for panel headers ─────────────────────────────────────────────
const PanelHeader = ({ title, sub }) => (
    <div className="panel-title-bar">
        <span>{title}</span>
        {sub && <span style={{ fontWeight: 'normal', marginLeft: 'auto' }}>[{sub}]</span>}
    </div>
);

// ─── 1. System Status Panel ───────────────────────────────────────────────────
export const SystemStatus = ({ data }) => {
    const gpsActive = data?.gps?.valid || data?.gps?.fix || false;
    const mpuActive = data?.imu?.calibrated || false;
    const loraActive = data?.radio?.rssi_dbm !== undefined && data?.radio?.rssi_dbm !== null;
    const rssi = data?.radio?.rssi_dbm ?? 0;
    const snr = data?.radio?.snr_db ?? 0;

    const StatusRow = ({ label, isActive, detail }) => (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '2px 0',
            borderBottom: '1px solid var(--border-light-inner)'
        }}>
            <div className="classic-inset" style={{
                width: '10px', height: '10px',
                background: isActive ? '#00ff00' : '#ff0000',
                flexShrink: 0
            }} />
            <span style={{ flex: 1 }}>
                {label}
            </span>
            {detail && (
                <span style={{ color: isActive ? '#000080' : '#808080' }}>
                    {detail}
                </span>
            )}
            <span style={{
                fontWeight: 'bold',
                color: isActive ? '#008000' : '#ff0000',
            }}>
                {isActive ? 'ONLINE' : 'OFFLINE'}
            </span>
        </div>
    );

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
            <PanelHeader title="SYSTEM MODULES" />
            <div className="classic-inset" style={{ flex: 1, padding: '4px', margin: '2px', overflowY: 'auto', background: '#ffffff', color: '#000000' }}>
                <StatusRow label="GPS Receiver" isActive={gpsActive} detail={gpsActive ? `${data?.gps?.satellites ?? 0} SAT` : null} />
                <StatusRow label="Inertial Unit (IMU)" isActive={mpuActive} />
                <StatusRow label="RF Telemetry Link" isActive={loraActive} detail={loraActive ? `${rssi} dBm` : null} />

                {/* Divider */}
                <div style={{ margin: '4px 0', height: '2px', borderTop: '1px solid var(--border-dark)', borderBottom: '1px solid var(--border-light)' }} />

                {/* Quick telemetry stats */}
                {[
                    { label: 'Signal RSSI', value: rssi !== 0 ? `${rssi} dBm` : '— dBm', warn: rssi < -110 },
                    { label: 'Signal SNR', value: snr !== 0 ? `${snr} dB` : '— dB', warn: snr < 0 },
                ].map(({ label, value, warn }) => (
                    <div key={label} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '2px 0'
                    }}>
                        <span>{label}</span>
                        <span style={{ fontWeight: 'bold', color: warn ? '#ff0000' : '#000000' }}>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── 2. Mission Clock ─────────────────────────────────────────────────────────
export const MissionClock = ({ timestamp }) => {
    const [ignitionStatus, setIgnitionStatus] = useState(null);
    const [missionTime, setMissionTime] = useState(0);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 500);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const r = await fetch('http://localhost:3001/api/ignition/status');
                if (r.ok) {
                    const d = await r.json();
                    setIgnitionStatus(d);
                    setMissionTime(d.ignitionOn && d.launchTime ? Date.now() - d.launchTime : 0);
                }
            } catch (_) { }
        };
        fetchStatus();
        const iv = setInterval(fetchStatus, 1000);
        return () => clearInterval(iv);
    }, []);

    const formatTime = (ms) => {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const ss = s % 60;
        const sep = tick % 2 === 0 ? ':' : ' ';
        return `${h.toString().padStart(2, '0')}${sep}${m.toString().padStart(2, '0')}${sep}${ss.toString().padStart(2, '0')}`;
    };

    const isLive = ignitionStatus?.ignitionOn || false;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
            <PanelHeader title="MISSION TIMER" sub={isLive ? 'FLIGHT TIME' : 'STANDBY'} />
            <div style={{ padding: '8px', textAlign: 'center' }}>
                {/* T+ display */}
                <div className="classic-inset" style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '24px',
                    color: isLive ? '#00ff00' : '#808080',
                    fontWeight: 'bold',
                    padding: '4px',
                    margin: '0 auto 8px auto',
                    width: 'fit-content'
                }}>
                    {isLive ? formatTime(missionTime) : '00:00:00'}
                </div>
                <div>
                    <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        fontWeight: 'bold',
                        background: isLive ? '#00ff00' : 'var(--bg-color)',
                        color: isLive ? '#000000' : '#808080',
                        borderTop: '2px solid',
                        borderLeft: '2px solid',
                        borderRight: '2px solid',
                        borderBottom: '2px solid',
                        borderColor: isLive ? 'var(--border-darkest) var(--border-light) var(--border-light) var(--border-darkest)' : 'var(--border-dark)',
                    }}>
                        {isLive ? 'FLIGHT ACTIVE' : 'AWAITING LAUNCH'}
                    </span>
                </div>

                {/* UTC time sub-display */}
                <div style={{
                    marginTop: '8px',
                    fontFamily: 'var(--font-mono)',
                    color: '#000000'
                }}>
                    {new Date().toUTCString().slice(5, 25)} UTC
                </div>
            </div>
        </div>
    );
};

// ─── 3. Peak / Max Altitude ───────────────────────────────────────────────────
export const MaxAltitude = ({ gpsAlt, bmpAlt }) => {
    const [maxGps, setMaxGps] = useState(0);
    const [maxBmp, setMaxBmp] = useState(0);

    useEffect(() => {
        if (gpsAlt > maxGps) setMaxGps(gpsAlt);
        if (bmpAlt > maxBmp) setMaxBmp(bmpAlt);
    }, [gpsAlt, bmpAlt]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
            <PanelHeader title="MAXIMUM ALTITUDE" sub="AGL · m" />
            <div className="classic-inset" style={{ padding: '4px', margin: '2px', display: 'flex', flexDirection: 'column', gap: '4px', background: '#ffffff', color: '#000000' }}>
                {[
                    { label: 'GPS PEAK', value: maxGps.toFixed(1), color: '#000080' },
                    { label: 'BARO PEAK', value: maxBmp.toFixed(1), color: '#800000' },
                ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div className="classic-outset" style={{ width: '8px', height: '8px', background: color }} />
                            <span>{label}</span>
                        </div>
                        <span style={{ color, fontWeight: 'bold' }}>
                            {value} <span style={{ fontWeight: 'normal' }}>m</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─── 4. GPS Info (legacy) ─────────────────────────────
export const GPSInfo = ({ gps }) => (
    <div style={{ padding: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div style={{ color: '#6b7280' }}>Lat: <b style={{ color: '#111827' }}>{gps?.latitude?.toFixed(5)}</b></div>
            <div style={{ color: '#6b7280' }}>Lon: <b style={{ color: '#111827' }}>{gps?.longitude?.toFixed(5)}</b></div>
            <div style={{ color: '#6b7280' }}>Alt: <b style={{ color: '#111827' }}>{gps?.altitude_m?.toFixed(2)}m</b></div>
            <div style={{ color: '#6b7280' }}>Fix: <b style={{ color: gps?.valid ? '#059669' : '#dc2626' }}>{gps?.valid ? 'YES' : 'NO'}</b></div>
        </div>
    </div>
);

// ─── 5. Raw Serial Log ────────────────────────────────────────────────────────
export const RawLog = ({ data }) => {
    const logContainerRef = useRef(null);
    const [logLines, setLogLines] = useState([]);
    const prevPacketCount = useRef(0);

    useEffect(() => {
        const currentPacketCount = data?.packet?.count || 0;
        if (currentPacketCount !== prevPacketCount.current && currentPacketCount > 0) {
            prevPacketCount.current = currentPacketCount;
            const timestamp = data?.timestamp_ms || 0;
            const seconds = Math.floor(timestamp / 1000);
            const mm = Math.floor((seconds % 3600) / 60);
            const ss = seconds % 60;
            const timeStr = `T+${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
            const gpsLat = data?.gps?.latitude?.toFixed(5) || '0.00000';
            const gpsLon = data?.gps?.longitude?.toFixed(5) || '0.00000';
            const gpsAlt = data?.gps?.altitude_m?.toFixed(1) || '0.0';
            const pitch = data?.imu?.pitch?.toFixed(1) || '0.0';
            const roll = data?.imu?.roll?.toFixed(1) || '0.0';
            const yaw = data?.imu?.yaw?.toFixed(1) || '0.0';
            const bmpAlt = data?.bmp280?.altitude_m?.toFixed(1) || '0.0';
            const line = `[${timeStr}] GPS:${gpsLat},${gpsLon},${gpsAlt}m | IMU:P${pitch} R${roll} Y${yaw} | ALT:${bmpAlt}m | #${currentPacketCount}`;
            setLogLines(prev => [...prev.slice(-99), line]);
        }
    }, [data]);

    // Auto-scroll only within the log container — never moves the page
    useEffect(() => {
        const container = logContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [logLines]);

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: 'var(--bg-color)',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <PanelHeader title="TELEMETRY DATA LOG" sub="COM1" />

            {/* Log content */}
            <div ref={logContainerRef} className="classic-inset" style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: '4px',
                fontFamily: 'var(--font-mono)',
                lineHeight: '1.2',
                background: '#000000',
                margin: '2px',
                color: '#00ff00'
            }}>
                {logLines.length === 0 ? (
                    <div>Waiting for incoming serial data...</div>
                ) : (
                    logLines.map((line, i) => (
                        <div key={i} style={{
                            color: i === logLines.length - 1 ? '#ffffff' : '#00ff00',
                            marginBottom: '2px',
                            whiteSpace: 'nowrap'
                        }}>
                            {line}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
