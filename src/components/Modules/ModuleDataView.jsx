import React from 'react';
import './ModuleDataView.css';

const ModuleDataView = ({ moduleId, history, currentData }) => {
    const getModuleConfig = (id) => {
        const configs = {
            'gps-module': {
                title: 'GPS MODULE DATA',
                icon: '🛰️',
                fields: [
                    { label: 'Latitude', key: 'gps.latitude', unit: '°', decimals: 6 },
                    { label: 'Longitude', key: 'gps.longitude', unit: '°', decimals: 6 },
                    { label: 'Altitude', key: 'gps.altitude_m', unit: 'm', decimals: 2 },
                    { label: 'Satellites', key: 'gps.satellites', unit: '', decimals: 0 },
                    { label: 'Fix Quality', key: 'gps.fix_quality', unit: '', decimals: 0 },
                    { label: 'HDOP', key: 'gps.hdop', unit: '', decimals: 2 }
                ]
            },
            'mpu-module': {
                title: 'MPU6050 MODULE DATA',
                icon: '⚙️',
                fields: [
                    { label: 'Gyro X', key: 'imu.gyroscope.x_rps', unit: 'rad/s', decimals: 2 },
                    { label: 'Gyro Y', key: 'imu.gyroscope.y_rps', unit: 'rad/s', decimals: 2 },
                    { label: 'Gyro Z', key: 'imu.gyroscope.z_rps', unit: 'rad/s', decimals: 2 },
                    { label: 'Accel X', key: 'imu.acceleration.x_mps2', unit: 'm/s²', decimals: 2 },
                    { label: 'Accel Y', key: 'imu.acceleration.y_mps2', unit: 'm/s²', decimals: 2 },
                    { label: 'Accel Z', key: 'imu.acceleration.z_mps2', unit: 'm/s²', decimals: 2 }
                ]
            },
            'bmp-module': {
                title: 'BMP280 MODULE DATA',
                icon: '🌡️',
                fields: [
                    { label: 'Pressure', key: 'bmp280.pressure_pa', unit: 'Pa', decimals: 2 },
                    { label: 'Altitude', key: 'bmp280.altitude_m', unit: 'm', decimals: 2 },
                    { label: 'Temperature', key: 'bmp280.temperature_c', unit: '°C', decimals: 2 }
                ]
            },
            'payload-module': {
                title: 'PAYLOAD MODULE DATA',
                icon: '📦',
                fields: [
                    { label: 'Strain Node 1', key: 'structure.strain_microstrain1', unit: 'μɛ', decimals: 4 },
                    { label: 'Strain Node 2', key: 'structure.strain_microstrain2', unit: 'μɛ', decimals: 4 },
                    { label: 'Thermocouple Temp', key: 'structure.thermocouple_c', unit: '°C', decimals: 2 }
                ]
            }
        };
        return configs[id] || configs['gps-module'];
    };

    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    };

    const downloadCSV = () => {
        const config = getModuleConfig(moduleId);

        if (history.length === 0) {
            alert('No data available to download');
            return;
        }

        // Create headers
        const headers = ['Timestamp', 'Time (s)', ...config.fields.map(f => `${f.label} (${f.unit})`)];

        // Create rows
        const rows = history.map((point, index) => {
            const row = [
                new Date(point.timestamp_ms).toISOString(),
                index,
                ...config.fields.map(field => {
                    const value = getNestedValue(point, field.key);
                    return value !== undefined && value !== null ? value : 'N/A';
                })
            ];
            return row;
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${moduleId}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const config = getModuleConfig(moduleId);

    const renderCurrentValues = () => {
        return (
            <div className="current-values-grid">
                {config.fields.map((field, index) => {
                    const value = getNestedValue(currentData, field.key);
                    const displayValue = value !== undefined && value !== null
                        ? typeof value === 'number'
                            ? value.toFixed(field.decimals)
                            : value
                        : 'N/A';

                    return (
                        <div key={index} className="classic-inset value-card">
                            <div className="value-label">{field.label}</div>
                            <div className="value-display">
                                <span className="value-number">{displayValue}</span>
                                {field.unit && <span className="value-unit">{field.unit}</span>}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDataTable = () => {
        if (history.length === 0) {
            return (
                <div className="no-data-message">
                    <div className="no-data-icon">📊</div>
                    <div>No historical data available</div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.5rem' }}>
                        Waiting for data stream...
                    </div>
                </div>
            );
        }

        // Show last 50 entries
        const recentData = history.slice(-50).reverse();

        return (
            <div className="classic-inset data-table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            {config.fields.map((field, index) => (
                                <th key={index}>{field.label} ({field.unit})</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {recentData.map((point, rowIndex) => (
                            <tr key={rowIndex}>
                                <td>{new Date(point.timestamp_ms).toLocaleTimeString()}</td>
                                {config.fields.map((field, colIndex) => {
                                    const value = getNestedValue(point, field.key);
                                    const displayValue = value !== undefined && value !== null
                                        ? typeof value === 'number'
                                            ? value.toFixed(field.decimals)
                                            : value
                                        : 'N/A';
                                    return <td key={colIndex}>{displayValue}</td>;
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="classic-outset module-data-view">
            <div className="panel-title-bar">
                <span>{config.icon} {config.title}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
                    <button className="download-csv-btn" onClick={downloadCSV} title="Download CSV">CSV</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>_</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px' }}>□</button>
                    <button style={{ padding: '0 4px', minWidth: '16px', height: '14px', lineHeight: '10px', fontWeight: 'bold' }}>×</button>
                </div>
            </div>

            <div className="module-content">
                {/* Current Live Values */}
                <div className="section">
                    <h3 className="section-title">LIVE VALUES</h3>
                    {renderCurrentValues()}
                </div>

                {/* Historical Data Table */}
                <div className="section">
                    <h3 className="section-title">
                        HISTORICAL DATA
                        <span className="data-count">({history.length} total records, showing last 50)</span>
                    </h3>
                    {renderDataTable()}
                </div>
            </div>
        </div>
    );
};

export default ModuleDataView;
