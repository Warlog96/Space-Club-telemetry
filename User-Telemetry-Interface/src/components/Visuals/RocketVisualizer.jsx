import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Realistic Rocket Model with true ogive nose cone and trapezoidal fins
function RealisticRocket({ orientation }) {
    const rocketRef = useRef();

    // Create true ogive nose cone geometry
    const ogiveGeometry = useMemo(() => {
        const length = 3.8;  // Nose cone length
        const baseRadius = 0.5;  // Base radius (matches body)
        const segments = 64;  // Smoothness

        // Tangent ogive formula
        // rho = (R^2 + L^2) / (2*R) where R is base radius, L is length
        const rho = (baseRadius * baseRadius + length * length) / (2 * baseRadius);

        // Create points for the ogive curve
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = t * length;  // Height along nose cone

            // Ogive radius at this height using circular arc formula
            // x = sqrt(rho^2 - (L - y)^2) + R - rho
            const x = Math.sqrt(rho * rho - (length - y) * (length - y)) - rho + baseRadius;

            points.push(new THREE.Vector2(x, y));
        }

        // Create lathe geometry by rotating the curve
        return new THREE.LatheGeometry(points, 64);
    }, []);

    useFrame(() => {
        if (rocketRef.current) {
            rocketRef.current.rotation.x = orientation.pitch;
            rocketRef.current.rotation.y = orientation.yaw;
            rocketRef.current.rotation.z = orientation.roll;
        }
    });

    return (
        <group ref={rocketRef}>
            {/* True Ogive Nose Cone - Mathematically accurate aerodynamic shape */}
            <mesh position={[0, 5.7, 0]} rotation={[Math.PI, 0, 0]} castShadow>
                <primitive object={ogiveGeometry} />
                <meshStandardMaterial
                    color="#e5ebf0"
                    metalness={0.72}
                    roughness={0.18}
                />
            </mesh>

            {/* Nose-body transition ring */}
            <mesh position={[0, 3.85, 0]}>
                <cylinderGeometry args={[0.51, 0.51, 0.1, 64]} />
                <meshStandardMaterial
                    color="#95a5a6"
                    metalness={0.85}
                    roughness={0.1}
                />
            </mesh>

            {/* Upper Body Section - Light gray/white */}
            <mesh position={[0, 2.0, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.5, 3.7, 64]} />
                <meshStandardMaterial
                    color="#ecf0f1"
                    metalness={0.5}
                    roughness={0.3}
                />
            </mesh>

            {/* Accent stripe (red band) */}
            <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.52, 0.52, 0.25, 64]} />
                <meshStandardMaterial
                    color="#e74c3c"
                    metalness={0.6}
                    roughness={0.25}
                />
            </mesh>

            {/* Mid-body transition ring */}
            <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.52, 0.52, 0.15, 64]} />
                <meshStandardMaterial
                    color="#bdc3c7"
                    metalness={0.88}
                    roughness={0.08}
                />
            </mesh>

            {/* Lower Body Section - Light silver */}
            <mesh position={[0, -1.8, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.5, 3.9, 64]} />
                <meshStandardMaterial
                    color="#d5dbdb"
                    metalness={0.55}
                    roughness={0.28}
                />
            </mesh>

            {/* Fin base section */}
            <mesh position={[0, -3.7, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.45, 0.4, 64]} />
                <meshStandardMaterial
                    color="#bdc3c7"
                    metalness={0.6}
                    roughness={0.25}
                />
            </mesh>

            {/* Trapezoidal Fins - Classic rocket design */}
            {[0, 90, 180, 270].map((angle, i) => {
                // Create proper trapezoidal fin shape
                const finShape = new THREE.Shape();
                finShape.moveTo(0, -1.1);      // Bottom leading edge (attached to body)
                finShape.lineTo(0, 0.3);        // Top leading edge
                finShape.lineTo(1.4, -0.2);     // Top trailing edge (swept back)
                finShape.lineTo(1.6, -1.3);     // Bottom trailing edge (max span)
                finShape.lineTo(0, -1.1);       // Close shape

                const extrudeSettings = {
                    depth: 0.04,
                    bevelEnabled: true,
                    bevelThickness: 0.015,
                    bevelSize: 0.015,
                    bevelSegments: 5
                };

                return (
                    <mesh
                        key={i}
                        position={[
                            Math.cos((angle * Math.PI) / 180) * 0.5,
                            -3.5,
                            Math.sin((angle * Math.PI) / 180) * 0.5
                        ]}
                        rotation={[0, (angle * Math.PI) / 180, 0]}
                        castShadow
                    >
                        <extrudeGeometry args={[finShape, extrudeSettings]} />
                        <meshStandardMaterial
                            color="#95a5a6"
                            metalness={0.75}
                            roughness={0.2}
                        />
                    </mesh>
                );
            })}

            {/* Engine Section - Tapered nozzle */}
            <mesh position={[0, -4.15, 0]} castShadow>
                <cylinderGeometry args={[0.28, 0.38, 0.6, 64]} />
                <meshStandardMaterial
                    color="#34495e"
                    metalness={0.88}
                    roughness={0.12}
                />
            </mesh>

            {/* Engine bell flare */}
            <mesh position={[0, -4.4, 0]} castShadow>
                <cylinderGeometry args={[0.38, 0.44, 0.25, 64]} />
                <meshStandardMaterial
                    color="#2c3e50"
                    metalness={0.85}
                    roughness={0.15}
                />
            </mesh>

            {/* Inner nozzle - Dark interior */}
            <mesh position={[0, -4.48, 0]}>
                <cylinderGeometry args={[0.2, 0.26, 0.25, 32]} />
                <meshStandardMaterial
                    color="#0a0a0a"
                    metalness={0.92}
                    roughness={0.08}
                    emissive="#1a0000"
                    emissiveIntensity={0.3}
                />
            </mesh>

            {/* Nozzle throat (innermost) */}
            <mesh position={[0, -4.56, 0]}>
                <cylinderGeometry args={[0.14, 0.17, 0.12, 24]} />
                <meshStandardMaterial
                    color="#050505"
                    metalness={0.95}
                    roughness={0.05}
                    emissive="#ff3300"
                    emissiveIntensity={0.5}
                />
            </mesh>
        </group>
    );
}

// Particle system for thrust effects
function ThrustParticles({ isActive }) {
    const particlesRef = useRef();
    const particleCount = 250;

    const particles = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        const lifetimes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.35;
            positions[i * 3 + 1] = -4.6;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;

            velocities[i * 3] = (Math.random() - 0.5) * 1.5;
            velocities[i * 3 + 1] = -3.0 - Math.random() * 3.0;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 1.5;

            lifetimes[i] = Math.random();
        }

        return { positions, velocities, lifetimes };
    }, []);

    useFrame((state, delta) => {
        if (!particlesRef.current || !isActive) return;

        const positions = particlesRef.current.geometry.attributes.position.array;
        const velocities = particles.velocities;
        const lifetimes = particles.lifetimes;

        for (let i = 0; i < particleCount; i++) {
            lifetimes[i] -= delta * 1.8;

            if (lifetimes[i] <= 0) {
                positions[i * 3] = (Math.random() - 0.5) * 0.35;
                positions[i * 3 + 1] = -4.6;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
                lifetimes[i] = 1;
            } else {
                positions[i * 3] += velocities[i * 3] * delta;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
            }
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
    });

    if (!isActive) return null;

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
                    array={particles.positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.28}
                color="#ff6600"
                transparent
                opacity={0.92}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    );
}

// Dynamic background - Darker space theme
function DynamicBackground({ altitude }) {
    const { scene } = useThree();

    useEffect(() => {
        const t = Math.min(altitude / 3000, 1);
        const skyColor = new THREE.Color();

        if (t < 0.33) {
            // Start dark, go darker
            skyColor.lerpColors(
                new THREE.Color(0x0f1419),  // Very dark blue-gray
                new THREE.Color(0x0a0e14),  // Darker blue-black
                t * 3
            );
        } else if (t < 0.67) {
            // Transition to deep space
            skyColor.lerpColors(
                new THREE.Color(0x0a0e14),
                new THREE.Color(0x050508),  // Near black
                (t - 0.33) * 3
            );
        } else {
            // Deep space black
            skyColor.lerpColors(
                new THREE.Color(0x050508),
                new THREE.Color(0x000000),  // Pure black
                (t - 0.67) * 3
            );
        }

        scene.background = skyColor;
    }, [altitude, scene]);

    return null;
}

// Stars
function Stars({ altitude }) {
    const starsRef = useRef();
    const starCount = 2500;

    const starPositions = useMemo(() => {
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 250;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 250;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
        }
        return positions;
    }, []);

    const starOpacity = Math.max(0, Math.min(1, (altitude - 1000) / 2000));

    if (starOpacity === 0) return null;

    return (
        <points ref={starsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={starCount}
                    array={starPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.6}
                color="#ffffff"
                transparent
                opacity={starOpacity}
                sizeAttenuation={true}
            />
        </points>
    );
}

// Main 3D scene
function Scene({ telemetryData }) {
    const [orientation, setOrientation] = useState({ roll: 0, pitch: 0, yaw: 0 });
    const lastUpdateTime = useRef(Date.now());

    useEffect(() => {
        if (!telemetryData?.imu?.gyroscope) return;

        const now = Date.now();
        const dt = (now - lastUpdateTime.current) / 1000;
        lastUpdateTime.current = now;

        const { x_rps, y_rps, z_rps } = telemetryData.imu.gyroscope;

        setOrientation(prev => ({
            roll: prev.roll + x_rps * dt,
            pitch: prev.pitch + y_rps * dt,
            yaw: prev.yaw + z_rps * dt
        }));
    }, [telemetryData?.imu?.gyroscope]);

    const altitude = telemetryData?.bmp280?.altitude_m || 0;
    const isThrusting = telemetryData?.ignition?.status !== 'SAFE';

    return (
        <>
            <DynamicBackground altitude={altitude} />
            <Stars altitude={altitude} />

            {/* Enhanced lighting for maximum realism */}
            <ambientLight intensity={0.45} />
            <directionalLight
                position={[25, 30, 20]}
                intensity={2.0}
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={120}
                shadow-camera-left={-25}
                shadow-camera-right={25}
                shadow-camera-top={25}
                shadow-camera-bottom={-25}
            />
            <pointLight position={[-18, 10, -12]} intensity={0.6} color="#66fcf1" />
            <hemisphereLight args={['#87ceeb', '#2c3e50', 0.65]} />
            <spotLight
                position={[0, 18, 12]}
                angle={0.35}
                penumbra={0.6}
                intensity={0.9}
                castShadow
            />
            {/* Rim light for depth */}
            <pointLight position={[0, 0, -15]} intensity={0.4} color="#4a90e2" />

            <RealisticRocket orientation={orientation} />
            <ThrustParticles isActive={isThrusting} />

            <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={10}
                maxDistance={40}
                target={[0, 0, 0]}
                autoRotate={false}
                autoRotateSpeed={0.5}
            />
            <PerspectiveCamera makeDefault position={[14, 10, 14]} fov={42} />
        </>
    );
}

// Altitude HUD
function AltitudeHUD({ altitude, gpsAlt }) {
    return (
        <div style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            color: 'var(--highlight)',
            fontFamily: 'monospace',
            fontSize: '0.9rem',
            background: 'rgba(31, 40, 51, 0.96)',
            padding: '0.8rem 1rem',
            borderRadius: '6px',
            border: '1px solid rgba(102, 252, 241, 0.35)',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        }}>
            <div style={{ marginBottom: '0.3rem', color: '#66fcf1', fontWeight: 'bold', letterSpacing: '1.2px', fontSize: '0.75rem' }}>
                ALTITUDE
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff' }}>
                GPS: {gpsAlt.toFixed(1)}m
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#fff', marginTop: '0.15rem' }}>
                BMP: {altitude.toFixed(1)}m
            </div>
        </div>
    );
}

// Main component
const RocketVisualizer = ({ data }) => {
    const altitude = data?.bmp280?.altitude_m || 0;
    const gpsAlt = data?.gps?.altitude_m || 0;

    return (
        <div className="glass-panel" style={{
            width: '100%',
            height: '100%',
            padding: 0,
            overflow: 'hidden',
            position: 'relative'
        }}>
            <Canvas
                shadows
                dpr={[1, 2]}
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: "high-performance",
                    failIfMajorPerformanceCaveat: false
                }}
            >
                <Scene telemetryData={data} />
            </Canvas>
            <AltitudeHUD altitude={altitude} gpsAlt={gpsAlt} />
        </div>
    );
};

export default RocketVisualizer;
