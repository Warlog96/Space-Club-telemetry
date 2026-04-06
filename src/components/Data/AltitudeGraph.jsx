import React, { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { useTelemetry } from '../../context/TelemetryContext';

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#ffffe1',
            border: '1px solid #000000',
            padding: '2px 4px',
            fontFamily: 'var(--font-main)',
            fontSize: '11px',
            color: '#000000',
            minWidth: '100px'
        }}>
            <div style={{ marginBottom: '2px', paddingBottom: '2px', borderBottom: '1px solid #808080', fontWeight: 'bold' }}>
                Time: {label}s
            </div>
            {payload.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <div className="classic-outset" style={{ width: 8, height: 8, background: p.color, flexShrink: 0 }} />
                    <span style={{ minWidth: 50 }}>{p.name}</span>
                    <span style={{ fontWeight: 'bold' }}>{p.value?.toFixed(1)} m</span>
                </div>
            ))}
        </div>
    );
};

// ─── Stat chip ────────────────────────────────────────────────────────────────
const Chip = ({ label, value, color = '#00ff00' }) => (
    <div className="classic-inset" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '2px 4px',
        margin: '0 2px',
        minWidth: '60px',
        color: color
    }}>
        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#c0c0c0' }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{value}</span>
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AltitudeGraph = ({ history }) => {
    const { historyVersion } = useTelemetry();

    const chartData = useMemo(() => {
        if (!history || history.length === 0) return [];
        const t0 = history[0]?.timestamp_ms ?? 0;
        return history.map((d, i) => ({
            t: t0 ? +((((d.timestamp_ms ?? 0) - t0) / 1000).toFixed(1)) : i,
            gps: d?.gps?.altitude_m ?? null,
            baro: d?.bmp280?.altitude_m ?? null,
        })).filter(d => d.gps !== null || d.baro !== null);
    }, [historyVersion]);

    const { maxAlt, minAlt, avgAlt } = useMemo(() => {
        const vals = chartData.flatMap(d => [d.gps, d.baro]).filter(v => v != null);
        if (!vals.length) return { maxAlt: 500, minAlt: 0, avgAlt: 0 };
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        return {
            maxAlt: max,
            minAlt: min,
            avgAlt: vals.reduce((a, b) => a + b, 0) / vals.length,
        };
    }, [chartData]);

    const yPad = (maxAlt - minAlt) * 0.1 || 10;
    const hasData = chartData.length >= 2;

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div className="panel-title-bar">
                <span>Altitude vs Time</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                </div>
            </div>

            {/* Controls Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px',
                background: 'var(--bg-color)',
                borderBottom: '1px solid var(--border-dark)',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip label="PEAK" value={`${maxAlt.toFixed(1)}m`} color="#00ff00" />
                    <Chip label="MIN" value={`${minAlt.toFixed(1)}m`} color="#ffff00" />
                    <Chip label="AVG" value={`${avgAlt.toFixed(1)}m`} color="#00ffff" />
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {[['#00ff00', 'GPS'], ['#ff9900', 'BARO']].map(([c, l]) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div className="classic-outset" style={{ width: 12, height: 12, background: c }} />
                            <span>{l}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="classic-inset" style={{ flex: 1, padding: '4px', margin: '2px', background: '#000000' }}>
                {!hasData ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#00ff00' }}>Awaiting Telemetry Data...</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                            <defs>
                                <linearGradient id="altGpsGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00ff00" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#00ff00" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="altBaroGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ff9900" stopOpacity={0.25} />
                                    <stop offset="100%" stopColor="#ff9900" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid stroke="#404040" strokeDasharray="3 3" vertical={false} />

                            <XAxis
                                dataKey="t"
                                type="number"
                                domain={[0, 'dataMax']}
                                tickFormatter={v => `${v}s`}
                                stroke="#808080"
                                tick={{ fill: '#c0c0c0', fontSize: 10, fontFamily: 'var(--font-main)' }}
                                tickLine={false}
                                axisLine={{ stroke: '#808080' }}
                                label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#c0c0c0', fontSize: 10 }}
                            />
                            <YAxis
                                domain={[minAlt - yPad, maxAlt + yPad]}
                                tickFormatter={v => `${v.toFixed(0)}`}
                                stroke="#808080"
                                tick={{ fill: '#c0c0c0', fontSize: 10, fontFamily: 'var(--font-main)' }}
                                tickLine={false}
                                axisLine={{ stroke: '#808080' }}
                                width={50}
                                label={{ value: 'Altitude (m)', angle: -90, position: 'insideLeft', fill: '#c0c0c0', fontSize: 10, dy: -10, dx: 5 }}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />

                            <ReferenceLine
                                y={maxAlt}
                                stroke="#ffffff"
                                strokeDasharray="4 4"
                                label={{ value: 'Peak', position: 'insideTopLeft', fill: '#ffffff', fontSize: 9 }}
                            />

                            <Area
                                type="monotone" dataKey="gps" name="GPS ALT"
                                stroke="#00ff00" strokeWidth={1.5}
                                fill="url(#altGpsGrad)"
                                dot={false}
                                activeDot={{ r: 3, fill: '#00ff00', stroke: '#ffffff', strokeWidth: 1 }}
                                connectNulls={false}
                            />
                            <Area
                                type="monotone" dataKey="baro" name="BARO ALT"
                                stroke="#ff9900" strokeWidth={1.5}
                                fill="url(#altBaroGrad)"
                                dot={false}
                                activeDot={{ r: 3, fill: '#ff9900', stroke: '#ffffff', strokeWidth: 1 }}
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default AltitudeGraph;
