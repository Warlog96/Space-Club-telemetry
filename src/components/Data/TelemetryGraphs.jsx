import React, { memo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const GraphCard = memo(({ title, data, dataKey, xKey = 'timestamp_ms', color = '#005fb8', domain, xLabel, yLabel, pointStyle = 'circle' }) => {
    // Custom point shape renderer for Recharts
    const renderCustomDot = (props) => {
        const { cx, cy, fill } = props;
        const size = 6;

        switch (pointStyle) {
            case 'triangle':
                const h = size * 0.8;
                return (
                    <path
                        d={`M ${cx},${cy - h} L ${cx + h},${cy + h / 2} L ${cx - h},${cy + h / 2} Z`}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                );
            case 'square':
                return (
                    <rect
                        x={cx - size / 2}
                        y={cy - size / 2}
                        width={size}
                        height={size}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                );
            case 'diamond':
                return (
                    <path
                        d={`M ${cx},${cy - size / 2} L ${cx + size / 2},${cy} L ${cx},${cy + size / 2} L ${cx - size / 2},${cy} Z`}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                );
            case 'star':
                const points = 5;
                const outerRadius = size * 0.5;
                const innerRadius = size * 0.2;
                let starPath = '';

                for (let i = 0; i < points * 2; i++) {
                    const radius = i % 2 === 0 ? outerRadius : innerRadius;
                    const angle = (Math.PI * i) / points - Math.PI / 2;
                    const px = cx + radius * Math.cos(angle);
                    const py = cy + radius * Math.sin(angle);
                    starPath += `${i === 0 ? 'M' : 'L'} ${px},${py} `;
                }
                starPath += 'Z';

                return (
                    <path
                        d={starPath}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                );
            default: // circle
                return (
                    <circle
                        cx={cx}
                        cy={cy}
                        r={size / 2}
                        fill={fill}
                        stroke="#fff"
                        strokeWidth={1}
                    />
                );
        }
    };

    return (
        <div className="light-card" style={{
            width: '100%',
            height: '350px',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            border: '1px solid #d1d5db',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            borderRadius: '4px',
            padding: '1rem'
        }}>
            <h4 style={{
                marginBottom: '1rem',
                fontSize: '0.85rem',
                color: '#111827',
                fontWeight: '600',
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: '0.5rem',
                fontFamily: 'var(--font-main)'
            }}>{title}</h4>
            <div style={{ flex: 1, width: '100%', minHeight: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e5e7eb"
                            strokeWidth={1}
                            vertical={false}
                        />
                        <XAxis
                            dataKey={xKey}
                            tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'var(--font-main)' }}
                            stroke="#d1d5db"
                            label={{
                                value: xLabel || 'Time (s)',
                                position: 'insideBottom',
                                offset: -20,
                                style: { fill: '#4b5563', fontWeight: 500, fontSize: 11, fontFamily: 'var(--font-main)' }
                            }}
                        />
                        <YAxis
                            domain={domain || [0, 'auto']}
                            tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'var(--font-main)' }}
                            width={50}
                            stroke="#d1d5db"
                            label={{
                                value: yLabel || 'Value',
                                angle: -90,
                                position: 'insideLeft',
                                style: { fill: '#4b5563', fontWeight: 500, fontSize: 11, fontFamily: 'var(--font-main)' }
                            }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#ffffff',
                                color: '#111827',
                                fontSize: '11px',
                                border: '1px solid #d1d5db',
                                borderRadius: '2px',
                                padding: '6px 10px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                fontFamily: 'var(--font-main)'
                            }}
                            labelStyle={{ color: '#005fb8', fontWeight: 600, marginBottom: '2px' }}
                            itemStyle={{ color: '#4b5563' }}
                            labelFormatter={(value) => `${xLabel || 'X'}: ${value}`}
                            formatter={(value) => [`${value.toFixed(2)}`, yLabel || 'Y']}
                        />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={renderCustomDot}
                            activeDot={{ r: 6 }}
                            isAnimationActive={false}
                            connectNulls={true}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
});

const TelemetryGraphs = ({ history }) => {
    const data = history;

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
            overflowY: 'auto',
            height: '100%',
            paddingRight: '0.5rem'
        }}>

            <GraphCard
                title="GPS Altitude vs Time"
                data={data}
                dataKey="gps.altitude_m"
                xKey="timestamp_ms"
                xLabel="Time (s)"
                yLabel="GPS Altitude (m)"
                color="#005fb8"
                pointStyle="circle"
            />

            <GraphCard
                title="BMP Altitude vs Time"
                data={data}
                dataKey="bmp280.altitude_m"
                xKey="timestamp_ms"
                xLabel="Time (s)"
                yLabel="BMP Altitude (m)"
                color="#d97706"
                pointStyle="square"
            />

            <GraphCard
                title="Pressure (hPa)"
                data={data}
                dataKey="bmp280.pressure_hpa"
                xKey="timestamp_ms"
                xLabel="Time (s)"
                yLabel="Pressure (hPa)"
                color="#059669"
                pointStyle="triangle"
            />

            <GraphCard
                title="Temperature (C)"
                data={data}
                dataKey="bmp280.temperature_c"
                xKey="timestamp_ms"
                xLabel="Time (s)"
                yLabel="Temperature (°C)"
                color="#dc2626"
                pointStyle="diamond"
            />

            <GraphCard
                title="Accel X (m/s²)"
                data={data}
                dataKey="imu.acceleration.x_mps2"
                color="#7c3aed"
            />

            <GraphCard
                title="Accel Y (m/s²)"
                data={data}
                dataKey="imu.acceleration.y_mps2"
                color="#4f46e5"
            />

            <GraphCard
                title="Accel Z (Vertical m/s²)"
                data={data}
                dataKey="imu.acceleration.z_mps2"
                color="#be185d"
            />

            <GraphCard
                title="Strain (Microstrain)"
                data={data}
                dataKey="structure.strain_microstrain"
                color="#0891b2"
            />

        </div>
    );
};

export default TelemetryGraphs;
