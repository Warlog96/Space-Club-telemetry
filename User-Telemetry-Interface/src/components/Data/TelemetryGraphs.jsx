import React, { memo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const GraphCard = memo(({ title, data, dataKey, xKey = 'timestamp_ms', color = '#8884d8', domain }) => {
    return (
        <div className="light-card" style={{ width: '100%', height: '200px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#333' }}>{title}</h4>
            <div style={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={xKey} hide={true} />
                        <YAxis domain={domain || ['auto', 'auto']} tick={{ fontSize: 10 }} width={40} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', color: '#333', fontSize: '12px' }}
                            labelStyle={{ display: 'none' }}
                            itemStyle={{ padding: 0 }}
                        />
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
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
                color="#0088FE"
            />

            <GraphCard
                title="BMP Altitude vs Time"
                data={data}
                dataKey="bmp280.altitude_m"
                color="#00C49F"
            />

            <GraphCard
                title="Pressure (hPa)"
                data={data}
                // Recharts accesses nested keys safely usually
                dataKey="bmp280.pressure_hpa"
                color="#FFBB28"
            />

            <GraphCard
                title="Temperature (C)"
                data={data}
                dataKey="bmp280.temperature_c"
                color="#FF8042"
            />

            <GraphCard
                title="Accel X (m/s²)"
                data={data}
                dataKey="imu.acceleration.x_mps2"
                color="#8884d8"
            />

            <GraphCard
                title="Accel Y (m/s²)"
                data={data}
                dataKey="imu.acceleration.y_mps2"
                color="#82ca9d"
            />

            <GraphCard
                title="Accel Z (Vertical m/s²)"
                data={data}
                dataKey="imu.acceleration.z_mps2"
                color="#ff7300"
            />

            <GraphCard
                title="Strain (Microstrain)"
                data={data}
                dataKey="structure.strain_microstrain"
                color="#d0ed57"
            />

        </div>
    );
};

export default TelemetryGraphs;
