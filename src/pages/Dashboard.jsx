import React, { useEffect, useState, useCallback } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import RocketVisualizer from '../components/Visuals/RocketVisualizer';
import GPSMap from '../components/Visuals/GPSMap';
import AltitudeGraph from '../components/Data/AltitudeGraph';
import MenuBar from '../components/Navigation/MenuBar';
import GraphView from '../components/Graphs/GraphView';
import ModuleDataView from '../components/Modules/ModuleDataView';
import { SystemStatus, MissionClock, MaxAltitude, RawLog } from '../components/Data/DashboardPanels';

// ─── Classic Data Badge ───────────────────────────────────────────────────────
const TeleBadge = ({ label, value, unit, accent = '#00ff00', warn = false }) => (
    <div className="classic-inset" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        padding: '2px 4px',
        minWidth: '72px',
        color: warn ? '#ff0000' : accent,
        margin: '2px'
    }}>
        <span style={{ fontSize: '9px', color: '#c0c0c0', textTransform: 'uppercase' }}>
            {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                {value}
            </span>
            {unit && <span style={{ fontSize: '9px', color: '#c0c0c0' }}>{unit}</span>}
        </div>
    </div>
);

// ─── Section title strip matching Classic Window Title ────────────────────
const SectionLabel = ({ title, sub }) => (
    <div className="panel-title-bar">
        <span>{title}</span>
        {sub && <span style={{ fontWeight: 'normal', marginLeft: 'auto' }}>[{sub}]</span>}
        <div style={{ marginLeft: '4px', display: 'flex', gap: '2px' }}>
            <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
            <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
            <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
        </div>
    </div>
);

// ─── Self-contained UTC Clock ───────────────────────────────────────────────
const UtcClock = () => {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 500);
        return () => clearInterval(id);
    }, []);
    const now = new Date();
    const str = `${now.getUTCHours().toString().padStart(2, '0')}${tick % 2 === 0 ? ':' : ' '}${now.getUTCMinutes().toString().padStart(2, '0')}${tick % 2 === 0 ? ':' : ' '}${now.getUTCSeconds().toString().padStart(2, '0')}`;
    return (
        <span style={{ fontSize: '11px', color: '#000000' }}>
            {str}
        </span>
    );
};

// ─── Classic Menu Bar ───────────────────────────────────────────────
const HeaderBar = React.memo(({ isConnected, pktCount, isPublicView, commanderName, username, onLogout, onMenuSelect, menuOpen, onMenuToggle, onMenuClose }) => (
    <div className="classic-outset" style={{
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 10,
        marginBottom: '4px'
    }}>
        {/* Top App Title Bar */}
        <div className="panel-title-bar" style={{ padding: '2px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#ff0000', borderRadius: '50%' }}></span>
                <span>Admin Telemetry Interface - u-center theme</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                <button style={{ padding: '0 4px', minWidth: '16px', height: '16px', lineHeight: '12px' }}>_</button>
                <button style={{ padding: '0 4px', minWidth: '16px', height: '16px', lineHeight: '12px' }}>□</button>
                <button style={{ padding: '0 4px', minWidth: '16px', height: '16px', lineHeight: '12px', fontWeight: 'bold' }}>×</button>
            </div>
        </div>

        {/* Ribbon Toolbar Area */}
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            background: 'var(--bg-color)',
            borderBottom: '1px solid var(--border-dark)',
            borderTop: '1px solid var(--border-light)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MenuBar
                    isOpen={menuOpen}
                    onToggle={onMenuToggle}
                    onClose={onMenuClose}
                    onMenuSelect={onMenuSelect}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="classic-inset" style={{
                        width: '12px', height: '12px',
                        background: isConnected ? '#00ff00' : '#ffff00',
                    }} />
                    <span>{isConnected ? 'COM1 115200' : 'No Connection'}</span>
                </div>
                <div className="classic-inset" style={{ padding: '0 4px', minWidth: '60px', textAlign: 'center' }}>
                    <UtcClock />
                </div>
                <div className="classic-inset" style={{ padding: '0 4px', minWidth: '60px', textAlign: 'center' }}>
                    <span style={{ color: '#00ff00' }}>PKT: {pktCount}</span>
                </div>
            </div>
        </div>
    </div>
));

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const Dashboard = ({ pilot, username, onLogout, isPublicView = false, commanderName }) => {

    const { packet, history, isConnected } = useTelemetry();
    const [currentView, setCurrentView] = useState('dashboard');
    const [watchdogStatus, setWatchdogStatus] = useState({ active: false, timeSinceLastData: 0 });
    const [menuOpen, setMenuOpen] = useState(false);

    const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const handleMenuSelect = useCallback((viewId) => { setCurrentView(viewId); setMenuOpen(false); }, []);

    // Fetch watchdog status
    useEffect(() => {
        const fetchWatchdog = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/ignition/status');
                if (response.ok) {
                    const data = await response.json();
                    if (data.watchdog) setWatchdogStatus(data.watchdog);
                }
            } catch (_) { }
        };
        fetchWatchdog();
        const interval = setInterval(fetchWatchdog, 1000);
        return () => clearInterval(interval);
    }, []);

    // Live data helpers
    const gpsAlt = packet?.gps?.altitude_m ?? 0;
    const baroAlt = packet?.bmp280?.altitude_m ?? 0;
    const gpsLat = packet?.gps?.latitude?.toFixed(5) ?? '---';
    const gpsLon = packet?.gps?.longitude?.toFixed(5) ?? '---';
    const gpsFix = packet?.gps?.fix ?? false;
    const gpsSats = packet?.gps?.satellites ?? 0;
    const temp = packet?.bmp280?.temperature_c?.toFixed(1) ?? '---';
    const pressure = packet?.bmp280?.pressure_pa ? (packet.bmp280.pressure_pa / 100).toFixed(1) : '---';
    const pitch = packet?.imu?.pitch?.toFixed(1) ?? '0.0';
    const roll = packet?.imu?.roll?.toFixed(1) ?? '0.0';
    const yaw = packet?.imu?.yaw?.toFixed(1) ?? '0.0';
    const rssi = packet?.radio?.rssi_dbm ?? '---';
    const snr = packet?.radio?.snr_db ?? '---';
    const pktCount = packet?.packet?.count ?? 0;


    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'var(--bg-color)',
            fontFamily: 'var(--font-main)',
            position: 'relative',
            overflow: 'hidden',
            padding: '4px'
        }}>

            {/* Watchdog Banner */}
            {watchdogStatus.active && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderBottom: '1px solid #f87171',
                    padding: '0.4rem 1rem',
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    zIndex: 1000,
                    flexShrink: 0
                }}>
                    ⚠ Warning — No Telemetry Data Received for {Math.floor(watchdogStatus.timeSinceLastData / 1000)} seconds ⚠
                </div>
            )}

            <HeaderBar
                isConnected={isConnected}
                pktCount={pktCount}
                isPublicView={isPublicView}
                commanderName={commanderName}
                username={username}
                onLogout={onLogout}
                onMenuSelect={handleMenuSelect}
                menuOpen={menuOpen}
                onMenuToggle={toggleMenu}
                onMenuClose={closeMenu}
            />

            {/* ══ MAIN DASHBOARD VIEW ══ */}
            {currentView === 'dashboard' && (
                <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 300px',
                    gridTemplateRows: '1fr 250px',
                    gap: '8px',
                    padding: '8px',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 1
                }}>

                    <div className="classic-outset" style={{
                        gridColumn: '1', gridRow: '1',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <SectionLabel title="Orientation View" sub="3D" />
                        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: 'var(--bg-color)' }}>
                            <TeleBadge label="PITCH" value={pitch} unit="°" />
                            <TeleBadge label="ROLL" value={roll} unit="°" />
                            <TeleBadge label="YAW" value={yaw} unit="°" />
                        </div>
                        <div className="classic-inset" style={{ flex: 1, position: 'relative' }}>
                            <RocketVisualizer data={packet} />
                        </div>
                    </div>

                    {/* ── COL 2: GPS Map ───────────────────────────────────── */}
                    <div className="classic-outset" style={{
                        gridColumn: '2', gridRow: '1',
                        display: 'flex', flexDirection: 'column',
                    }}>
                        <SectionLabel title="Trajectory Map" sub={gpsFix ? '3D' : 'None'} />
                        <div style={{ display: 'flex', gap: '2px', padding: '2px', background: 'var(--bg-color)' }}>
                            <TeleBadge label="LAT" value={gpsLat} />
                            <TeleBadge label="LON" value={gpsLon} />
                            <TeleBadge label="SATS" value={gpsSats} warn={gpsSats < 4} />
                        </div>
                        <div className="classic-inset" style={{ flex: 1, overflow: 'hidden' }}>
                            <GPSMap data={packet} />
                        </div>
                    </div>

                    {/* ── COL 3: Right sidebar ─────────────────────────────── */}
                    <div style={{
                        gridColumn: '3', gridRow: '1 / 3',
                        display: 'flex', flexDirection: 'column',
                        gap: '4px',
                        overflowY: 'auto'
                    }}>
                        {/* Mission Clock Panel */}
                        <div className="classic-outset" style={{ flexShrink: 0 }}>
                            <MissionClock timestamp={packet.timestamp_ms} />
                        </div>

                        {/* Altitude STATS card */}
                        <div className="classic-outset" style={{ flexShrink: 0, padding: 0, overflow: 'hidden' }}>
                            <SectionLabel title="Altitude Metrics" sub="m AGL" />
                            <div className="classic-inset" style={{ padding: '4px', margin: '2px' }}>
                                {/* GPS Altitude */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '10px' }}>GPS</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{gpsAlt.toFixed(1)} m</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#000000', border: '1px solid #c0c0c0', marginTop: '2px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((gpsAlt / 3000) * 100, 100)}%`,
                                            background: '#00ff00',
                                        }} />
                                    </div>
                                </div>
                                {/* BARO Altitude */}
                                <div style={{ marginTop: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '10px' }}>BAROMETRIC</span>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{baroAlt.toFixed(1)} m</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#000000', border: '1px solid #c0c0c0', marginTop: '2px' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((baroAlt / 3000) * 100, 100)}%`,
                                            background: '#ff9900',
                                        }} />
                                    </div>
                                </div>
                                {/* Pressure */}
                                <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px dashed #404040', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '10px' }}>LOCAL PRESSURE</span>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{pressure} hPa</span>
                                </div>
                            </div>
                        </div>

                        {/* Signal Strength */}
                        <div className="classic-outset" style={{ flexShrink: 0, padding: 0, overflow: 'hidden' }}>
                            <SectionLabel title="RF Link Status" sub="LoRa" />
                            <div style={{ padding: '2px', display: 'flex', gap: '2px', background: 'var(--bg-color)' }}>
                                <TeleBadge label="RSSI" value={rssi} unit="dBm" warn={rssi !== '---' && rssi < -110} />
                                <TeleBadge label="SNR" value={snr} unit="dB" warn={snr !== '---' && snr < 0} />
                            </div>
                            {/* Signal bars visualizer */}
                            <div className="classic-inset" style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '4px', height: '40px', margin: '2px' }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => {
                                    const strength = rssi === '---' ? 0 : Math.min(8, Math.max(0, Math.round((rssi + 130) / 5)));
                                    const active = i <= strength;
                                    return (
                                        <div key={i} style={{
                                            flex: 1,
                                            height: `${Math.max(15, i * 12)}%`,
                                            background: active
                                                ? strength >= 6 ? '#00ff00' : strength >= 3 ? '#ffcc00' : '#ff0000'
                                                : '#004400',
                                            borderTop: '1px solid #c0c0c0',
                                            borderRight: '1px solid #c0c0c0'
                                        }} />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Peak Altitude */}
                        <div className="classic-outset" style={{ flexShrink: 0 }}>
                            <MaxAltitude gpsAlt={gpsAlt} bmpAlt={baroAlt} />
                        </div>

                        {/* System Status Table */}
                        <div className="classic-outset" style={{ flex: 1, minHeight: '120px', display: 'flex', flexDirection: 'column' }}>
                            <SectionLabel title="System Status" />
                            <div className="classic-inset" style={{ flex: 1 }}>
                                <SystemStatus data={packet} />
                            </div>
                        </div>
                    </div>

                    {/* ── BOTTOM ROW: Altitude Graph + Raw Log ─────────────── */}
                    {/* Altitude vs Time Graph */}
                    <div className="classic-outset" style={{
                        gridColumn: '1', gridRow: '2',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <SectionLabel title="Chart" sub="Alt" />
                        <div className="classic-inset" style={{ flex: 1 }}>
                            <AltitudeGraph history={history} />
                        </div>
                    </div>

                    {/* Serial / Raw Log */}
                    <div className="classic-outset" style={{
                        gridColumn: '2', gridRow: '2',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <SectionLabel title="Serial Console" />
                        <div className="classic-inset" style={{ flex: 1 }}>
                            <RawLog data={packet} />
                        </div>
                    </div>

                </div>
            )}

            {/* Graph Views */}
            {currentView.includes('-') && !currentView.includes('module') && (
                <div style={{ flex: 1, overflow: 'hidden', padding: '8px', position: 'relative', zIndex: 1, background: '#ffffff', margin: '8px', border: '1px solid #d1d5db' }}>
                    <GraphView graphId={currentView} history={history} />
                </div>
            )}

            {/* Module Data Views */}
            {currentView.includes('module') && (
                <div style={{ flex: 1, overflow: 'hidden', padding: '8px', position: 'relative', zIndex: 1, background: '#ffffff', margin: '8px', border: '1px solid #d1d5db' }}>
                    <ModuleDataView moduleId={currentView} history={history} currentData={packet} />
                </div>
            )}
        </div>
    );
};

export default Dashboard;

