import React, { useMemo, useCallback } from 'react';
import {
    AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, ScatterChart, Scatter
} from 'recharts';
import './GraphView.css';

// ─── Per-graph colour palette ─────────────────────────────────────────────────
const PALETTE = {
    'gps-alt-time': { stroke: '#005fb8', glow: '#005fb81a', accent: '#004d96' },
    'pressure-time': { stroke: '#d97706', glow: '#d977061a', accent: '#b45309' },
    'bmp-alt-time': { stroke: '#4f46e5', glow: '#4f46e51a', accent: '#4338ca' },
    'temp-time': { stroke: '#dc2626', glow: '#dc26261a', accent: '#b91c1c' },
    'pressure-bmp-alt': { stroke: '#059669', glow: '#0596691a', accent: '#047857' },
    'pressure-gps-alt': { stroke: '#ca8a04', glow: '#ca8a041a', accent: '#a16207' },
    'temp-pressure': { stroke: '#ea580c', glow: '#ea580c1a', accent: '#c2410c' },
    'temp-gps-alt': { stroke: '#2563eb', glow: '#2563eb1a', accent: '#1d4ed8' },
    'velocity-time': { stroke: '#0d9488', glow: '#0d94881a', accent: '#0f766e' },
    'velocity-rel-alt': { stroke: '#7c3aed', glow: '#7c3aed1a', accent: '#6d28d9' },
    'packet-time': { stroke: '#10b981', glow: '#10b9811a', accent: '#059669' },
    'packet-rel-alt': { stroke: '#db2777', glow: '#db27771a', accent: '#be185d' },
};

// ─── Graph config map ─────────────────────────────────────────────────────────
const GRAPH_CONFIGS = {
    'gps-alt-time': { title: 'GPS ALTITUDE', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: 'Alt (m)', dataKey: 'gps.altitude_m', type: 'time' },
    'pressure-time': { title: 'PRESSURE', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: 'Pa', dataKey: 'bmp280.pressure_pa', type: 'time' },
    'bmp-alt-time': { title: 'BMP ALTITUDE', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: 'Alt (m)', dataKey: 'bmp280.altitude_m', type: 'time' },
    'temp-time': { title: 'TEMPERATURE', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: '°C', dataKey: 'bmp280.temperature_c', type: 'time' },
    'pressure-bmp-alt': { title: 'PRESSURE', sub: 'vs BMP ALTITUDE', xLabel: 'BMP Alt (m)', yLabel: 'Pa', xKey: 'bmp280.altitude_m', yKey: 'bmp280.pressure_pa', type: 'xy' },
    'pressure-gps-alt': { title: 'PRESSURE', sub: 'vs GPS ALTITUDE', xLabel: 'GPS Alt (m)', yLabel: 'Pa', xKey: 'gps.altitude_m', yKey: 'bmp280.pressure_pa', type: 'xy' },
    'temp-pressure': { title: 'TEMPERATURE', sub: 'vs PRESSURE', xLabel: 'Pressure (Pa)', yLabel: '°C', xKey: 'bmp280.pressure_pa', yKey: 'bmp280.temperature_c', type: 'xy' },
    'temp-gps-alt': { title: 'TEMPERATURE', sub: 'vs GPS ALTITUDE', xLabel: 'GPS Alt (m)', yLabel: '°C', xKey: 'gps.altitude_m', yKey: 'bmp280.temperature_c', type: 'xy' },
    'velocity-time': { title: 'VELOCITY', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: 'm/s', dataKey: '_velocity', type: 'time', calc: 'velocity' },
    'velocity-rel-alt': { title: 'VELOCITY', sub: 'vs RELATIVE BMP ALT', xLabel: 'Rel Alt (m)', yLabel: 'm/s', xKey: '_relAlt', yKey: '_velocity', type: 'xy', calc: 'velocity' },
    'packet-time': { title: 'PACKET COUNT', sub: 'vs TIME', xLabel: 'Time (s)', yLabel: 'Packets', dataKey: 'packet.count', type: 'time' },
    'packet-rel-alt': { title: 'PACKET COUNT', sub: 'vs RELATIVE ALTITUDE', xLabel: 'Rel Alt (m)', yLabel: 'Packets', xKey: '_relAlt', yKey: 'packet.count', type: 'xy', calc: 'relalt' },
};

// ─── Utilities ────────────────────────────────────────────────────────────────
const getNested = (obj, path) =>
    path.split('.').reduce((acc, k) => acc?.[k], obj);

const fmt = (v, decimals = 2) =>
    v == null ? '—' : Number(v).toFixed(decimals);

// ─── Data preparation ─────────────────────────────────────────────────────────
function prepareData(graphId, history) {
    const cfg = GRAPH_CONFIGS[graphId];
    if (!cfg || !history || history.length < 2) return [];

    const startMs = history[0]?.timestamp_ms ?? 0;
    const baseAlt = history[0]?.bmp280?.altitude_m ?? 0;

    // Pre-calculate velocities
    const velocities = history.map((p, i) => {
        if (i === 0) return 0;
        const dt = (history[i].timestamp_ms - history[i - 1].timestamp_ms) / 1000;
        const dh = (history[i].bmp280?.altitude_m ?? 0) - (history[i - 1].bmp280?.altitude_m ?? 0);
        return dt > 0 ? dh / dt : 0;
    });

    return history.map((p, i) => ({
        ...p,
        _t: ((p.timestamp_ms ?? 0) - startMs) / 1000,
        _velocity: velocities[i],
        _relAlt: (p.bmp280?.altitude_m ?? 0) - baseAlt,
    }));
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const GraphTooltip = ({ active, payload, label, cfg, colors }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="graph-tooltip" style={{ background: '#ffffe1', border: '1px solid #000000', padding: '2px 4px', fontSize: '11px', color: '#000000', fontFamily: 'var(--font-main)' }}>
            <div className="graph-tooltip-label" style={{ fontWeight: 'bold', borderBottom: '1px solid #808080', marginBottom: '2px', paddingBottom: '2px' }}>
                {cfg.xLabel}: {fmt(label, 1)}
            </div>
            {payload.map((p, i) => (
                <div key={i} className="graph-tooltip-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="classic-outset graph-tooltip-dot" style={{ background: p.color, width: '8px', height: '8px' }} />
                    <span className="graph-tooltip-name" style={{ minWidth: '50px' }}>{p.name}</span>
                    <span className="graph-tooltip-val" style={{ fontWeight: 'bold' }}>{fmt(p.value, 2)} {cfg.yLabel}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Shared axis / grid props ─────────────────────────────────────────────────
const axisStyle = { fill: '#6b7280', fontSize: 10, fontFamily: 'var(--font-main)' };
const gridProps = { stroke: '#e5e7eb', strokeDasharray: '3 3', vertical: false };

// ─── Time-based Area Chart ────────────────────────────────────────────────────
function TimeChart({ graphId, data, cfg, colors }) {
    const yKey = cfg.dataKey;
    const gradId = `grad-${graphId}`;
    const glowId = `glow-${graphId}`;

    const vals = data.map(d => getNested(d, yKey)).filter(v => v != null);
    const yMin = vals.length ? Math.min(...vals) : 0;
    const yMax = vals.length ? Math.max(...vals) : 1;
    const yPad = (yMax - yMin) * 0.12 || 1;
    const tMax = data.length ? data[data.length - 1]._t : 0;
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;

    return (
        <>
            {/* Stats row */}
            <div className="graph-stats-row" style={{ padding: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap', background: 'var(--bg-color)' }}>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">MIN</span>
                    <span className="graph-stat-value" style={{ color: '#0000ff' }}>{fmt(yMin, 1)}</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">MAX</span>
                    <span className="graph-stat-value" style={{ color: '#ff0000' }}>{fmt(yMax, 1)}</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">AVG</span>
                    <span className="graph-stat-value" style={{ color: '#008000' }}>{fmt(avg, 1)}</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">DURATION</span>
                    <span className="graph-stat-value">{fmt(tMax, 0)}s</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">PTS</span>
                    <span className="graph-stat-value">{data.length}</span>
                </div>
            </div>

            <div className="classic-inset graph-chart-area" style={{ background: '#000000', margin: '2px', padding: '4px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.35} />
                                <stop offset="60%" stopColor={colors.stroke} stopOpacity={0.08} />
                                <stop offset="100%" stopColor={colors.stroke} stopOpacity={0} />
                            </linearGradient>
                            <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                                <feGaussianBlur stdDeviation="3" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <CartesianGrid {...gridProps} />

                        <XAxis
                            dataKey="_t"
                            type="number"
                            domain={[0, 'dataMax']}
                            tickFormatter={v => `${v.toFixed(0)}s`}
                            stroke="#808080"
                            tick={{ fill: '#c0c0c0', fontSize: 10, fontFamily: 'var(--font-main)' }}
                            tickLine={false}
                            axisLine={{ stroke: '#808080' }}
                            label={{ value: cfg.xLabel, position: 'insideBottomRight', offset: -8, fill: '#c0c0c0', fontSize: 9, fontFamily: 'var(--font-main)' }}
                        />
                        <YAxis
                            domain={[yMin - yPad, yMax + yPad]}
                            tickFormatter={v => fmt(v, 0)}
                            stroke="#808080"
                            tick={{ fill: '#c0c0c0', fontSize: 10, fontFamily: 'var(--font-main)' }}
                            tickLine={false}
                            axisLine={{ stroke: '#808080' }}
                            width={52}
                            label={{ value: cfg.yLabel, angle: -90, position: 'insideLeft', fill: '#c0c0c0', fontSize: 9, fontFamily: 'var(--font-main)', dy: 20 }}
                        />

                        <Tooltip
                            content={<GraphTooltip cfg={cfg} colors={colors} />}
                            cursor={{ stroke: colors.stroke, strokeWidth: 1, strokeDasharray: '4 2', strokeOpacity: 0.5 }}
                        />

                        <ReferenceLine
                            y={yMax}
                            stroke={colors.stroke}
                            strokeOpacity={0.4}
                            strokeDasharray="4 4"
                            label={{ value: 'PEAK', position: 'insideTopRight', fill: colors.stroke, fontSize: 8, fontFamily: 'var(--font-main)', fontWeight: 600 }}
                        />

                        <Area
                            type="monotone"
                            dataKey={d => getNested(d, yKey)}
                            name={cfg.yLabel}
                            stroke={colors.stroke}
                            strokeWidth={2}
                            fill={`url(#${gradId})`}
                            dot={false}
                            activeDot={{ r: 4, fill: '#ffffff', stroke: colors.stroke, strokeWidth: 2 }}
                            connectNulls={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

// ─── XY Scatter / Line Chart ──────────────────────────────────────────────────
function XYChart({ graphId, data, cfg, colors }) {
    const gradId = `grad-${graphId}`;
    const glowId = `glow-${graphId}`;

    const xyData = data
        .map(d => ({
            x: getNested(d, cfg.xKey) ?? null,
            y: getNested(d, cfg.yKey) ?? null,
        }))
        .filter(d => d.x != null && d.y != null);

    const xVals = xyData.map(d => d.x);
    const yVals = xyData.map(d => d.y);
    const xMin = xVals.length ? Math.min(...xVals) : 0;
    const xMax = xVals.length ? Math.max(...xVals) : 1;
    const yMin = yVals.length ? Math.min(...yVals) : 0;
    const yMax = yVals.length ? Math.max(...yVals) : 1;
    const yPad = (yMax - yMin) * 0.12 || 1;
    const xPad = (xMax - xMin) * 0.05 || 1;

    return (
        <>
            <div className="graph-stats-row" style={{ padding: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap', background: 'var(--bg-color)' }}>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">X RANGE</span>
                    <span className="graph-stat-value" style={{ color: '#0000ff' }}>{fmt(xMin, 0)}–{fmt(xMax, 0)}</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">Y RANGE</span>
                    <span className="graph-stat-value" style={{ color: '#ff0000' }}>{fmt(yMin, 0)}–{fmt(yMax, 0)}</span>
                </div>
                <div className="classic-inset graph-stat-chip">
                    <span className="graph-stat-label">PTS</span>
                    <span className="graph-stat-value">{xyData.length}</span>
                </div>
            </div>

            <div className="classic-inset graph-chart-area" style={{ background: '#000000', margin: '2px', padding: '4px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 16, left: 4, bottom: 4 }}>
                        <defs>
                            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
                                <feGaussianBlur stdDeviation="2.5" result="blur" />
                                <feMerge>
                                    <feMergeNode in="blur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        <CartesianGrid {...gridProps} />

                        <XAxis
                            dataKey="x"
                            type="number"
                            domain={[xMin - xPad, xMax + xPad]}
                            tickFormatter={v => fmt(v, 0)}
                            stroke="#d1d5db"
                            tick={axisStyle}
                            tickLine={false}
                            axisLine={{ stroke: '#d1d5db' }}
                            name={cfg.xLabel}
                            label={{ value: cfg.xLabel, position: 'insideBottomRight', offset: -8, fill: '#4b5563', fontSize: 9, fontFamily: 'var(--font-main)' }}
                        />
                        <YAxis
                            dataKey="y"
                            type="number"
                            domain={[yMin - yPad, yMax + yPad]}
                            tickFormatter={v => fmt(v, 0)}
                            stroke="#d1d5db"
                            tick={axisStyle}
                            tickLine={false}
                            axisLine={{ stroke: '#d1d5db' }}
                            width={52}
                            name={cfg.yLabel}
                            label={{ value: cfg.yLabel, angle: -90, position: 'insideLeft', fill: '#4b5563', fontSize: 9, fontFamily: 'var(--font-main)', dy: 20 }}
                        />

                        <Tooltip
                            cursor={{ stroke: colors.stroke, strokeWidth: 1, strokeOpacity: 0.4 }}
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const d = payload[0]?.payload;
                                return (
                                    <div className="graph-tooltip">
                                        <div className="graph-tooltip-label">{cfg.title}</div>
                                        <div className="graph-tooltip-row">
                                            <div className="graph-tooltip-dot" style={{ background: colors.stroke }} />
                                            <span className="graph-tooltip-name">{cfg.xLabel}</span>
                                            <span className="graph-tooltip-val">{fmt(d?.x, 2)}</span>
                                        </div>
                                        <div className="graph-tooltip-row">
                                            <div className="graph-tooltip-dot" style={{ background: colors.accent }} />
                                            <span className="graph-tooltip-name">{cfg.yLabel}</span>
                                            <span className="graph-tooltip-val">{fmt(d?.y, 2)}</span>
                                        </div>
                                    </div>
                                );
                            }}
                        />

                        <Scatter
                            data={xyData}
                            fill={colors.stroke}
                            opacity={0.85}
                            shape={({ cx, cy }) => (
                                <circle
                                    cx={cx} cy={cy} r={3}
                                    fill={colors.stroke}
                                    stroke="#ffffff"
                                    strokeWidth={1}
                                />
                            )}
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}

// ─── No data state ────────────────────────────────────────────────────────────
const NoData = () => (
    <div className="classic-inset no-data-message" style={{ margin: '2px', background: '#000000', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="no-data-text" style={{ color: '#00ff00', fontWeight: 'bold' }}>AWAITING TELEMETRY...</div>
    </div>
);

// ─── CSV export ───────────────────────────────────────────────────────────────
function downloadCSV(graphId, data) {
    const cfg = GRAPH_CONFIGS[graphId];
    if (!data.length) return alert('No data available to download.');

    let headers, rows;
    if (cfg.type === 'xy') {
        headers = [cfg.xLabel, cfg.yLabel, 'Timestamp_ms'];
        rows = data.map(d => [
            getNested(d, cfg.xKey) ?? '',
            getNested(d, cfg.yKey) ?? '',
            d.timestamp_ms ?? ''
        ]);
    } else {
        headers = ['Time_s', cfg.yLabel, 'Timestamp_ms'];
        rows = data.map(d => [
            d._t?.toFixed(3) ?? '',
            getNested(d, cfg.dataKey) ?? '',
            d.timestamp_ms ?? ''
        ]);
    }

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graphId}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Main GraphView ───────────────────────────────────────────────────────────
const GraphView = ({ graphId, history }) => {
    const cfg = GRAPH_CONFIGS[graphId] ?? GRAPH_CONFIGS['gps-alt-time'];
    const colors = PALETTE[graphId] ?? PALETTE['gps-alt-time'];

    const data = useMemo(() => prepareData(graphId, history), [graphId, history?.length]);

    const onDownload = useCallback(() => downloadCSV(graphId, data), [graphId, data]);

    const hasData = data.length >= 2;

    return (
        <div className="classic-outset graph-view">
            {/* ── Header ── */}
            <div className="panel-title-bar">
                <span>{cfg.title} {cfg.sub}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    <button className="download-csv-btn" onClick={onDownload} title="Download CSV">CSV</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                </div>
            </div>

            {/* ── Chart or waiting state ── */}
            {!hasData ? (
                <NoData />
            ) : cfg.type === 'time' ? (
                <TimeChart graphId={graphId} data={data} cfg={cfg} colors={colors} />
            ) : (
                <XYChart graphId={graphId} data={data} cfg={cfg} colors={colors} />
            )}
        </div>
    );
};

export default GraphView;
