import React from 'react';
import './GraphView.css';

const GraphView = ({ graphId, history }) => {
    const getGraphConfig = (id) => {
        const configs = {
            'gps-alt-time': {
                title: 'GPS Altitude vs Time',
                xLabel: 'Time (s)',
                yLabel: 'GPS Altitude (m)',
                dataKey: 'gps.altitude_m'
            },
            'pressure-time': {
                title: 'Pressure vs Time',
                xLabel: 'Time (s)',
                yLabel: 'Pressure (Pa)',
                dataKey: 'bmp280.pressure_pa'
            },
            'bmp-alt-time': {
                title: 'BMP Altitude vs Time',
                xLabel: 'Time (s)',
                yLabel: 'BMP Altitude (m)',
                dataKey: 'bmp280.altitude_m'
            },
            'temp-time': {
                title: 'Temperature vs Time',
                xLabel: 'Time (s)',
                yLabel: 'Temperature (°C)',
                dataKey: 'bmp280.temperature_c'
            },
            'pressure-bmp-alt': {
                title: 'Pressure vs BMP Altitude',
                xLabel: 'BMP Altitude (m)',
                yLabel: 'Pressure (Pa)',
                xDataKey: 'bmp280.altitude_m',
                yDataKey: 'bmp280.pressure_pa'
            },
            'pressure-gps-alt': {
                title: 'Pressure vs GPS Altitude',
                xLabel: 'GPS Altitude (m)',
                yLabel: 'Pressure (Pa)',
                xDataKey: 'gps.altitude_m',
                yDataKey: 'bmp280.pressure_pa'
            },
            'temp-pressure': {
                title: 'Temperature vs Pressure',
                xLabel: 'Pressure (Pa)',
                yLabel: 'Temperature (°C)',
                xDataKey: 'bmp280.pressure_pa',
                yDataKey: 'bmp280.temperature_c'
            },
            'temp-gps-alt': {
                title: 'Temperature vs GPS Altitude',
                xLabel: 'GPS Altitude (m)',
                yLabel: 'Temperature (°C)',
                xDataKey: 'gps.altitude_m',
                yDataKey: 'bmp280.temperature_c'
            },
            'velocity-time': {
                title: 'Calculated Velocity vs Time',
                xLabel: 'Time (s)',
                yLabel: 'Velocity (m/s)',
                dataKey: 'calculated.velocity',
                calculated: true
            },
            'velocity-rel-alt': {
                title: 'Calculated Velocity vs Relative BMP Altitude',
                xLabel: 'Relative BMP Altitude (m)',
                yLabel: 'Velocity (m/s)',
                xDataKey: 'calculated.relativeAltitude',
                yDataKey: 'calculated.velocity',
                calculated: true
            },
            'packet-time': {
                title: 'Received Packet No. vs Time',
                xLabel: 'Time (s)',
                yLabel: 'Packet Number',
                dataKey: 'packet.count'
            },
            'packet-rel-alt': {
                title: 'Received Packet No. vs Relative Altitude',
                xLabel: 'Relative Altitude (m)',
                yLabel: 'Packet Number',
                xDataKey: 'calculated.relativeAltitude',
                yDataKey: 'packet.count',
                calculated: true
            }
        };
        return configs[id] || configs['gps-alt-time'];
    };

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const calculateVelocity = (history) => {
        if (history.length < 2) return [];

        const velocities = [];
        for (let i = 1; i < history.length; i++) {
            const dt = (history[i].timestamp_ms - history[i - 1].timestamp_ms) / 1000; // seconds
            const dh = (history[i].bmp280?.altitude_m || 0) - (history[i - 1].bmp280?.altitude_m || 0);
            const velocity = dt > 0 ? dh / dt : 0;
            velocities.push(velocity);
        }
        return velocities;
    };

    const getRelativeAltitude = (history) => {
        if (history.length === 0) return [];
        const baseAltitude = history[0].bmp280?.altitude_m || 0;
        return history.map(point => (point.bmp280?.altitude_m || 0) - baseAltitude);
    };

    const prepareGraphData = () => {
        const config = getGraphConfig(graphId);
        const data = [];

        if (config.calculated) {
            const velocities = calculateVelocity(history);
            const relativeAltitudes = getRelativeAltitude(history);

            history.forEach((point, index) => {
                const dataPoint = {
                    timestamp: point.timestamp_ms,
                    time: index,
                    calculated: {
                        velocity: velocities[index - 1] || 0,
                        relativeAltitude: relativeAltitudes[index] || 0
                    },
                    packet: point.packet,
                    gps: point.gps,
                    bmp280: point.bmp280
                };
                data.push(dataPoint);
            });
        } else {
            history.forEach((point, index) => {
                data.push({
                    ...point,
                    time: index
                });
            });
        }

        return data;
    };

    const downloadCSV = () => {
        const config = getGraphConfig(graphId);
        const data = prepareGraphData();

        if (data.length === 0) {
            alert('No data available to download');
            return;
        }

        let headers, rows;

        if (config.xDataKey && config.yDataKey) {
            // X vs Y graph
            headers = [config.xLabel, config.yLabel, 'Timestamp'];
            rows = data.map(point => [
                getNestedValue(point, config.xDataKey) || 0,
                getNestedValue(point, config.yDataKey) || 0,
                new Date(point.timestamp_ms).toISOString()
            ]);
        } else {
            // Time-based graph
            headers = ['Time (s)', config.yLabel, 'Timestamp'];
            rows = data.map(point => [
                point.time,
                getNestedValue(point, config.dataKey) || 0,
                new Date(point.timestamp_ms).toISOString()
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${graphId}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const renderGraph = () => {
        const config = getGraphConfig(graphId);
        const data = prepareGraphData();

        if (data.length === 0) {
            return (
                <div className="no-data-message">
                    <div className="no-data-icon">📊</div>
                    <div>No telemetry data available</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                        Waiting for data stream...
                    </div>
                </div>
            );
        }

        // Find min/max for scaling
        let xValues, yValues;

        if (config.xDataKey && config.yDataKey) {
            xValues = data.map(point => getNestedValue(point, config.xDataKey) || 0);
            yValues = data.map(point => getNestedValue(point, config.yDataKey) || 0);
        } else {
            xValues = data.map(point => point.time);
            yValues = data.map(point => getNestedValue(point, config.dataKey) || 0);
        }

        const xMin = Math.min(...xValues);
        const xMax = Math.max(...xValues);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);

        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;

        // Generate SVG path
        const width = 100;
        const height = 100;
        const points = data.map((point, index) => {
            const x = ((xValues[index] - xMin) / xRange) * width;
            const y = height - ((yValues[index] - yMin) / yRange) * height;
            return `${x},${y}`;
        });

        const pathData = `M ${points.join(' L ')}`;

        return (
            <div className="graph-container">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="graph-svg">
                    <defs>
                        <linearGradient id={`gradient-${graphId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="var(--highlight)" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="var(--highlight)" stopOpacity="0.05" />
                        </linearGradient>
                    </defs>

                    {/* Fill area under curve */}
                    <path
                        d={`${pathData} L ${width},${height} L 0,${height} Z`}
                        fill={`url(#gradient-${graphId})`}
                    />

                    {/* Line */}
                    <path
                        d={pathData}
                        fill="none"
                        stroke="var(--highlight)"
                        strokeWidth="0.5"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Data points */}
                    {points.map((point, index) => {
                        const [x, y] = point.split(',');
                        return (
                            <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="0.5"
                                fill="var(--highlight)"
                                vectorEffect="non-scaling-stroke"
                            />
                        );
                    })}
                </svg>

                <div className="graph-stats">
                    <div className="stat-item">
                        <span className="stat-label">Min:</span>
                        <span className="stat-value">{yMin.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Max:</span>
                        <span className="stat-value">{yMax.toFixed(2)}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Points:</span>
                        <span className="stat-value">{data.length}</span>
                    </div>
                </div>
            </div>
        );
    };

    const config = getGraphConfig(graphId);

    return (
        <div className="graph-view glass-panel">
            <div className="graph-header">
                <div>
                    <h2 className="glow-text">{config.title}</h2>
                    <div className="graph-labels">
                        <span className="axis-label">X: {config.xLabel}</span>
                        <span className="axis-separator">|</span>
                        <span className="axis-label">Y: {config.yLabel}</span>
                    </div>
                </div>
            </div>

            {renderGraph()}
        </div>
    );
};

export default GraphView;
