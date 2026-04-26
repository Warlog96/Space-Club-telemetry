import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { telemetryService } from '../services/TelemetryService';

const TelemetryContext = createContext();

const HISTORY_SIZE = 500; // larger buffer, zero cost since it's a Ref

const getMockTelemetryData = () => ({
    mission: "EKLAVYA-DEMO",
    timestamp_ms: 0,
    packet: { count: 0 },
    gps: {
        latitude: 28.6139,
        longitude: 77.2090,
        altitude_m: 0,
        satellites: 0,
        fix: false
    },
    bmp280: {
        temperature_c: 25.0,
        pressure_pa: 101325,
        altitude_m: 0
    },
    mpu6050: {
        accel_x: 0, accel_y: 0, accel_z: 9.8,
        gyro_x: 0, gyro_y: 0, gyro_z: 0
    },
    orientation: { roll: 0, pitch: 0, yaw: 0 },
    velocity: { vertical: 0, horizontal: 0 },
    battery: { voltage: 0, percentage: 0 },
    status: "WAITING"
});

export const TelemetryProvider = ({ children }) => {
    // ── Single state object → one setState = one re-render per packet ─────────
    const [liveState, setLiveState] = useState({
        packet: getMockTelemetryData(),
        isConnected: false,
    });

    // ── History lives in a Ref — zero re-render cost on every push ────────────
    // Consumers that need history subscribe via historyVersion counter below.
    const historyRef = useRef([getMockTelemetryData()]);

    // ── Bump this counter every N packets so graphs re-render at ~2 Hz ────────
    const [historyVersion, setHistoryVersion] = useState(0);
    const packetCounterRef = useRef(0);

    // ── Stable accessor so consumers always get the live array ────────────────
    const getHistory = useCallback(() => historyRef.current, []);

    useEffect(() => {
        // ── Subscribe FIRST, then connect ─────────────────────────────────────
        // Firebase's onValue can fire from local cache almost synchronously.
        // If connect() runs before subscribe(), that first emit() hits an empty
        // subscriber list and the packet is silently lost.
        const unsubscribe = telemetryService.subscribe((data) => {
            // Drop the mock packet instantly upon receiving real payload
            if (historyRef.current.length === 1 && historyRef.current[0].mission === "EKLAVYA-DEMO") {
                historyRef.current = [];
            }
            // 1. Push to circular buffer
            historyRef.current.push(data);
            if (historyRef.current.length > HISTORY_SIZE) {
                historyRef.current.shift();
            }

            // 2. State update — triggers one re-render per packet
            setLiveState({ packet: data, isConnected: true });

            // 3. Throttle graph re-renders to every 5th packet (~1 Hz at 1 pkt/s)
            packetCounterRef.current += 1;
            if (packetCounterRef.current % 5 === 0) {
                setHistoryVersion(v => v + 1);
            }
        });

        // Connect AFTER subscriber is registered
        telemetryService.connect();

        return () => {
            unsubscribe();
            telemetryService.disconnect();
        };
    }, []);


    return (
        <TelemetryContext.Provider value={{
            packet: liveState.packet,
            isConnected: liveState.isConnected,
            // history is now a stable getter — value changes tracked via historyVersion
            history: historyRef.current,
            historyVersion,  // consumers can add this to useMemo deps to throttle
            getHistory,
        }}>
            {children}
        </TelemetryContext.Provider>
    );
};

export const useTelemetry = () => useContext(TelemetryContext);
