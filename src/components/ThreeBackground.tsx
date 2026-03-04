import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../hooks/useTheme';
import './ThreeBackground.css';

// ─── Constants & Utils ────────────────────────────────────────────────────────
const GRID_SIZE = 40;     // Number of points along X and Z axes
const SPACING = 1.5;      // Distance between points
const PARTICLE_COUNT = GRID_SIZE * GRID_SIZE;

// ─── Soft Ambient Backlight ──────────────────────────────────────────────────
const AmbientGlows = () => {
    const { isDarkMode } = useTheme();
    const groupRef = useRef<THREE.Group>(null!);

    const glows = useMemo(() => [
        { color: isDarkMode ? '#1e1b4b' : '#e0f2fe', pos: [-20, 0, -30], scale: 40, speed: 0.05 },
        { color: isDarkMode ? '#0f172a' : '#f8fafc', pos: [20, -10, -40], scale: 50, speed: -0.03 },
        { color: isDarkMode ? '#41c8df' : '#bae6fd', pos: [0, 15, -45], scale: 35, speed: 0.02 }
    ], [isDarkMode]);

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.children.forEach((child, i) => {
            const glow = glows[i];
            child.position.y = glow.pos[1] + Math.sin(t * glow.speed) * 4;
            child.position.x = glow.pos[0] + Math.cos(t * glow.speed) * 4;
        });
    });

    return (
        <group ref={groupRef}>
            {glows.map((glow, i) => (
                <mesh key={i} position={new THREE.Vector3(...glow.pos)}>
                    <sphereGeometry args={[glow.scale, 32, 32]} />
                    <meshBasicMaterial
                        color={glow.color}
                        transparent
                        opacity={isDarkMode ? 0.3 : 0.4}
                        blending={THREE.NormalBlending}
                        depthWrite={false}
                    />
                </mesh>
            ))}
        </group>
    );
};

// ─── Central Glass Core (The "AI Brain") ─────────────────────────────────────
const CentralCore = () => {
    const { isDarkMode } = useTheme();
    const coreRef = useRef<THREE.Mesh>(null!);
    const wireRef = useRef<THREE.LineSegments>(null!);

    useFrame((state) => {
        if (!coreRef.current || !wireRef.current) return;
        const t = state.clock.getElapsedTime();

        // Elegant, slow rotation
        coreRef.current.rotation.y = t * 0.1;
        coreRef.current.rotation.x = Math.sin(t * 0.05) * 0.2;

        // Gentle hover
        coreRef.current.position.y = 8 + Math.sin(t * 0.5) * 0.5;

        // Sync wireframe
        wireRef.current.rotation.copy(coreRef.current.rotation);
        wireRef.current.position.copy(coreRef.current.position);
    });

    const glassMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: isDarkMode ? '#ffffff' : '#41c8df',
        metalness: 0.1,
        roughness: 0.1,
        transmission: 0.95, // Highly transparent glass
        ior: 1.5,
        transparent: true,
        opacity: 1,
        thickness: 2.0,
    }), [isDarkMode]);

    const geometry = useMemo(() => new THREE.IcosahedronGeometry(4, 0), []);
    const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

    return (
        <group>
            <mesh ref={coreRef} geometry={geometry} material={glassMaterial} position={[0, 8, -5]} />
            <lineSegments ref={wireRef} geometry={edges} position={[0, 8, -5]}>
                <lineBasicMaterial
                    color={isDarkMode ? '#41c8df' : '#0369a1'}
                    transparent
                    opacity={0.3}
                />
            </lineSegments>
        </group>
    );
};

// ─── The Knowledge Grid (Dynamic Undulating Data Floor) ────────────────────
const KnowledgeGrid = () => {
    const { isDarkMode } = useTheme();
    const groupRef = useRef<THREE.Group>(null!);
    const { pointer, size } = useThree();

    // 1. Initialize Grid Positions
    const { positions, initialPositions } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const initPos = new Float32Array(PARTICLE_COUNT * 3);

        let i = 0;
        const offset = (GRID_SIZE * SPACING) / 2;

        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                const px = (x * SPACING) - offset;
                const pz = (z * SPACING) - offset;
                const py = 0; // Starts flat

                pos[i * 3] = px;
                pos[i * 3 + 1] = py;
                pos[i * 3 + 2] = pz;

                initPos[i * 3] = px;
                initPos[i * 3 + 1] = py;
                initPos[i * 3 + 2] = pz;
                i++;
            }
        }
        return { positions: pos, initialPositions: initPos };
    }, []);

    const pointsRef = useRef<THREE.Points>(null!);
    const linesRef = useRef<THREE.LineSegments>(null!);
    const [lineGeometry, setLineGeometry] = useState<THREE.BufferGeometry | null>(null);

    // 2. Setup Line Connections (Grid Structure)
    useEffect(() => {
        const geo = new THREE.BufferGeometry();
        // Each point connects to Max 4 neighbors (Grid structure)
        const maxLines = PARTICLE_COUNT * 4 * 2;
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxLines * 3), 3));

        // Pre-compute grid connections once
        const indices: number[] = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let z = 0; z < GRID_SIZE; z++) {
                const i = x * GRID_SIZE + z;
                // Connect Right
                if (x < GRID_SIZE - 1) indices.push(i, i + GRID_SIZE);
                // Connect Down
                if (z < GRID_SIZE - 1) indices.push(i, i + 1);
            }
        }
        geo.setIndex(indices);
        setLineGeometry(geo);
    }, []);

    // 3. Animation Loop
    useFrame((state) => {
        if (!pointsRef.current || !lineGeometry) return;

        const t = state.clock.getElapsedTime();
        const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;

        // Convert mouse to world space (roughly mapped to grid area)
        const mouseX = (pointer.x * size.width) / 20;
        const mouseZ = -(pointer.y * size.height) / 20;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            const iy = i * 3 + 1;
            const iz = i * 3 + 2;

            const px = initialPositions[ix];
            const pz = initialPositions[iz];

            // Primary Wave Motion
            let y = Math.sin(px * 0.1 + t * 0.5) * Math.cos(pz * 0.1 + t * 0.3) * 2.0;

            // Secondary Wave (Complexity)
            y += Math.sin(px * 0.05 - t * 0.2) * 1.5;

            // Interactive "Ripple" from Mouse
            const distToMouse = Math.sqrt(Math.pow(px - mouseX, 2) + Math.pow(pz - mouseZ, 2));
            if (distToMouse < 15) {
                // Creates a gentle hill lifting towards the mouse
                const influence = Math.cos((distToMouse / 15) * (Math.PI / 2));
                y += influence * 3.0;
            }

            pos[iy] = y - 5; // Lower the whole grid
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true;

        // Sync lines to new points
        if (linesRef.current) {
            const linePos = lineGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
                linePos[i] = pos[i];
            }
            lineGeometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <group ref={groupRef} position={[0, -2, 0]} rotation={[0.2, 0, 0]}>
            <Points ref={pointsRef} positions={positions} stride={3}>
                <PointMaterial
                    transparent
                    color={isDarkMode ? '#41c8df' : '#0369a1'}
                    size={0.1}
                    sizeAttenuation
                    depthWrite={false}
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                />
            </Points>
            {lineGeometry && (
                <lineSegments ref={linesRef} geometry={lineGeometry}>
                    <lineBasicMaterial
                        color={isDarkMode ? '#0ea5e9' : '#38bdf8'}
                        transparent
                        opacity={isDarkMode ? 0.08 : 0.15}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </lineSegments>
            )}
        </group>
    );
};


// ─── Smooth Camera Controller ───────────────────────────────────────────────
const CameraController = () => {
    const { camera, mouse, size } = useThree();
    const vec = new THREE.Vector3();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const scrollY = window.scrollY;

        // Prevent division by zero if body not fully loaded
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const scrollProgress = scrollY / maxScroll;

        // Base Camera Position (Professional angle looking slightly down)
        const baseY = 8;
        const baseZ = 28;

        // Scroll adjusts perspective
        const targetZ = baseZ - scrollProgress * 10;
        const targetY = baseY - scrollProgress * 4;

        // Very subtle Mouse Parallax for premium feel
        const mouseX = (mouse.x * size.width) / 200;
        const mouseY = (mouse.y * size.height) / 200;

        vec.set(
            mouseX,
            targetY + mouseY + Math.sin(t * 0.2) * 0.5, // Slow breathing effect
            targetZ
        );
        camera.position.lerp(vec, 0.03); // Very smooth interpolation

        // Look at the core/center
        camera.lookAt(0, 4, -5);
    });

    return null;
};

// ─── Main Background Component ────────────────────────────────────────────────
const ThreeBackground = () => {
    const { isDarkMode } = useTheme();

    return (
        <div className={`fixed inset-0 z-[-1] pointer-events-none transition-colors duration-1000 three-background ${isDarkMode ? 'dark' : ''}`}>
            {/* Base gradients fallback behind Canvas */}
            <div className={`absolute inset-0 transition-colors duration-1000 ${isDarkMode ? 'bg-[#030712]' : 'bg-[#f8fafc]'}`} />

            <Canvas
                camera={{ position: [0, 8, 28], fov: 50 }}
                gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
                dpr={Math.min(window.devicePixelRatio, 1.5)} // Cap DPR for performance
            >
                <CameraController />
                <fog attach="fog" args={[isDarkMode ? '#030712' : '#f8fafc', 10, 50]} />

                {/* Lighting tailored for the Glass Core */}
                <ambientLight intensity={isDarkMode ? 0.3 : 0.8} />
                <directionalLight position={[10, 20, 10]} intensity={isDarkMode ? 1 : 1.5} color="#ffffff" />
                <pointLight position={[-10, 5, -5]} intensity={0.5} color="#41c8df" />

                {/* Mouse-tracking highlight light */}
                <MouseLight />

                {/* Scene Elements */}
                <AmbientGlows />
                <KnowledgeGrid />
                <CentralCore />
            </Canvas>
        </div>
    );
};

// Extracted component for interactive lighting
const MouseLight = () => {
    const lightRef = useRef<THREE.PointLight>(null!);
    const { pointer, size } = useThree();

    useFrame(() => {
        if (!lightRef.current) return;
        const mouseX = (pointer.x * size.width) / 15;
        const mouseY = (pointer.y * size.height) / 15;

        lightRef.current.position.set(mouseX, mouseY + 5, -10);
    });

    return <pointLight ref={lightRef} intensity={0.8} color="#41c8df" distance={25} decay={2} />;
}

export default ThreeBackground;

