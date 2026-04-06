import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Cylinder, MeshDistortMaterial } from '@react-three/drei';

function Rocket({ orientation }) {
    const mesh = useRef();

    useFrame(() => {
        if (mesh.current) {
            // Convert degrees to radians
            const { roll, pitch, yaw } = orientation;
            mesh.current.rotation.x = pitch * (Math.PI / 180);
            mesh.current.rotation.y = yaw * (Math.PI / 180); // Yaw around Y? Depends on coord, Usually Y is up in Threejs default?
            // Actually usually Y is up. Rocket pointing Up is along Y.
            // Roll is around Y axis then?
            // Let's assume standard aerospace:
            // X = North/Forward? 
            // Let's map: Rocket long axis is Y.
            // Pitch = Rotation around X.
            // Yaw = Rotation around Z?
            // Roll = Rotation around Y.

            mesh.current.rotation.z = -roll * (Math.PI / 180);
        }
    });

    return (
        <mesh ref={mesh} position={[0, 0, 0]}>
            {/* Body */}
            <cylinderGeometry args={[0.5, 0.8, 3, 32]} />
            <meshStandardMaterial color="#c5c6c7" metalness={0.8} roughness={0.2} />

            {/* Nose cone - using another cylinder or cone */}
            <mesh position={[0, 2, 0]}>
                <coneGeometry args={[0.5, 1, 32]} />
                <meshStandardMaterial color="#66fcf1" emissive="#66fcf1" emissiveIntensity={0.2} />
            </mesh>

            {/* Fins */}
            <mesh position={[0, -1.5, 0]}>
                <boxGeometry args={[2, 0.1, 0.5]} />
                <meshStandardMaterial color="#45a29e" />
            </mesh>
            <mesh position={[0, -1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[2, 0.1, 0.5]} />
                <meshStandardMaterial color="#45a29e" />
            </mesh>
        </mesh>
    );
}

const Rocket3D = ({ data }) => {
    // Extract orientation from IMU data (roll, pitch, yaw are now calculated in backend)
    const orientation = {
        roll: data?.imu?.roll || 0,
        pitch: data?.imu?.pitch || 0,
        yaw: data?.imu?.yaw || 0
    };


    return (
        <div style={{ width: '100%', height: '100%', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />

                <Rocket orientation={orientation} />

                <gridHelper args={[10, 10, 0x444444, 0x222222]} rotation={[Math.PI / 2, 0, 0]} />
            </Canvas>
        </div>
    );
};

export default Rocket3D;
