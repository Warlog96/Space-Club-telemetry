import React, { useState } from 'react';
import './MenuBar.css';

const MenuBar = ({ onMenuSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(null);

    const menuStructure = {
        graphs: {
            title: 'GRAPHS',
            icon: '📊',
            items: [
                { id: 'gps-alt-time', label: 'GPS Altitude vs Time' },
                { id: 'pressure-time', label: 'Pressure vs Time' },
                { id: 'bmp-alt-time', label: 'BMP Altitude vs Time' },
                { id: 'temp-time', label: 'Temperature vs Time' },
                { id: 'pressure-bmp-alt', label: 'Pressure vs BMP Altitude' },
                { id: 'pressure-gps-alt', label: 'Pressure vs GPS Altitude' },
                { id: 'temp-pressure', label: 'Temperature vs Pressure' },
                { id: 'temp-gps-alt', label: 'Temperature vs GPS Altitude' },
                { id: 'velocity-time', label: 'Calculated Velocity vs Time' },
                { id: 'velocity-rel-alt', label: 'Calculated Velocity vs Relative BMP Altitude' },
                { id: 'packet-time', label: 'Received Packet No. vs Time' },
                { id: 'packet-rel-alt', label: 'Received Packet No. vs Relative Altitude' }
            ]
        },
        modules: {
            title: 'MODULES',
            icon: '🔧',
            items: [
                { id: 'gps-module', label: 'GPS Module Data' },
                { id: 'mpu-module', label: 'MPU Module Data' },
                { id: 'bmp-module', label: 'BMP Module Data' }
            ]
        }
    };

    const handleSectionClick = (section) => {
        if (activeSection === section) {
            setActiveSection(null);
        } else {
            setActiveSection(section);
        }
    };

    const handleItemClick = (itemId) => {
        onMenuSelect(itemId);
        setIsOpen(false);
        setActiveSection(null);
    };

    return (
        <>
            {/* Menu Toggle Button */}
            <button
                className={`menu-toggle-btn ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="menu-icon">☰</span>
                <span className="menu-label">MENU</span>
            </button>

            {/* Menu Overlay */}
            {isOpen && (
                <div className="menu-overlay" onClick={() => setIsOpen(false)} />
            )}

            {/* Menu Panel */}
            <div className={`menu-panel ${isOpen ? 'open' : ''}`}>
                <div className="menu-header">
                    <h3 className="glow-text">NAVIGATION</h3>
                    <button className="menu-close-btn" onClick={() => setIsOpen(false)}>✕</button>
                </div>

                <div className="menu-content">
                    {/* Dashboard Home */}
                    <div className="menu-section">
                        <button
                            className="menu-section-btn home-btn"
                            onClick={() => handleItemClick('dashboard')}
                        >
                            <span className="section-icon">🏠</span>
                            <span className="section-title">DASHBOARD</span>
                        </button>
                    </div>

                    {/* Graphs Section */}
                    <div className="menu-section">
                        <button
                            className={`menu-section-btn ${activeSection === 'graphs' ? 'active' : ''}`}
                            onClick={() => handleSectionClick('graphs')}
                        >
                            <span className="section-icon">{menuStructure.graphs.icon}</span>
                            <span className="section-title">{menuStructure.graphs.title}</span>
                            <span className="section-arrow">{activeSection === 'graphs' ? '▼' : '▶'}</span>
                        </button>

                        {activeSection === 'graphs' && (
                            <div className="menu-items">
                                {menuStructure.graphs.items.map(item => (
                                    <button
                                        key={item.id}
                                        className="menu-item"
                                        onClick={() => handleItemClick(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Modules Section */}
                    <div className="menu-section">
                        <button
                            className={`menu-section-btn ${activeSection === 'modules' ? 'active' : ''}`}
                            onClick={() => handleSectionClick('modules')}
                        >
                            <span className="section-icon">{menuStructure.modules.icon}</span>
                            <span className="section-title">{menuStructure.modules.title}</span>
                            <span className="section-arrow">{activeSection === 'modules' ? '▼' : '▶'}</span>
                        </button>

                        {activeSection === 'modules' && (
                            <div className="menu-items">
                                {menuStructure.modules.items.map(item => (
                                    <button
                                        key={item.id}
                                        className="menu-item"
                                        onClick={() => handleItemClick(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default MenuBar;
