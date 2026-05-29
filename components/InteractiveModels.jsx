"use client";

import { Float, Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

const orbitBodies = [
  { radius: 0.42, orbit: 0.82, speed: 0.34, color: "#cfd4d8", emissive: "#111318", tilt: 0.12, phase: 0.1 },
  { radius: 0.14, orbit: 1.24, speed: -0.52, color: "#ffcc00", emissive: "#332400", tilt: -0.28, phase: 1.4 },
  { radius: 0.22, orbit: 1.7, speed: 0.24, color: "#e9edf0", emissive: "#14161a", tilt: 0.38, phase: 2.5 },
  { radius: 0.18, orbit: 2.14, speed: -0.19, color: "#ff0033", emissive: "#3a0010", tilt: -0.1, phase: 3.4 },
  { radius: 0.28, orbit: 2.62, speed: 0.15, color: "#8f969d", emissive: "#101215", tilt: 0.22, phase: 4.1 },
  { radius: 0.1, orbit: 3.06, speed: -0.42, color: "#ffd86a", emissive: "#2c2100", tilt: -0.42, phase: 5.2 }
];

function OrbitRing({ radius, tilt = 0 }) {
  return (
    <mesh rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.004, 8, 192]} />
      <meshBasicMaterial color="#cbd5df" transparent opacity={0.28} />
    </mesh>
  );
}

function OrbitBody({ body, active = false }) {
  const pivot = useRef(null);
  const mesh = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pivot.current) pivot.current.rotation.y = body.phase + t * body.speed;
    if (mesh.current) mesh.current.rotation.y = t * (body.speed > 0 ? 0.9 : -0.9);
  });

  return (
    <group ref={pivot} rotation={[body.tilt, 0, 0]}>
      <mesh ref={mesh} position={[body.orbit, 0, 0]}>
        <sphereGeometry args={[body.radius * (active ? 1.16 : 1), 36, 36]} />
        <meshPhysicalMaterial
          color={body.color}
          emissive={active ? "#4a0012" : body.emissive}
          metalness={active ? 0.78 : 0.62}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
    </group>
  );
}

function SolarSystemAssembly({ compact = false }) {
  const group = useRef(null);
  const core = useRef(null);
  const scale = compact ? 0.78 : 0.9;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.09;
    if (core.current) {
      core.current.rotation.y = t * 0.42;
      core.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.018);
    }
  });

  return (
    <group ref={group} rotation={[0.34, -0.42, 0]} scale={scale}>
      <Float speed={1.05} rotationIntensity={0.08} floatIntensity={0.12}>
        <mesh ref={core}>
          <icosahedronGeometry args={[0.36, 2]} />
          <meshPhysicalMaterial
            color="#ffcc00"
            emissive="#7a1800"
            metalness={0.5}
            roughness={0.12}
            clearcoat={1}
          />
        </mesh>
        <pointLight intensity={2.4} distance={7} color="#ff3b30" />
        {orbitBodies.map((body, index) => (
          <OrbitRing key={`ring-${index}`} radius={body.orbit} tilt={body.tilt} />
        ))}
        {orbitBodies.map((body, index) => (
          <OrbitBody key={index} body={body} active={index === 3} />
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.42, 0.014, 12, 220]} />
          <meshStandardMaterial color="#ff0033" emissive="#2c0008" metalness={0.7} roughness={0.2} />
        </mesh>
      </Float>
    </group>
  );
}

function RingAssembly({ active = 0, compact = false }) {
  const group = useRef(null);
  const gem = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y = t * 0.16;
    if (gem.current) gem.current.rotation.y = t * 0.7;
  });

  return (
    <group ref={group} rotation={[0.35, -0.35, 0]} scale={compact ? 0.76 : 1}>
      <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.18}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
          <torusGeometry args={[1.35, 0.085, 48, 164]} />
          <meshStandardMaterial
            color={active === 1 ? "#ffcc00" : "#d7d7d7"}
            metalness={0.86}
            roughness={0.23}
          />
        </mesh>
        <mesh position={[0, 1.28, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.92, 0.16, 0.18]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.8} roughness={0.22} />
        </mesh>
        <mesh ref={gem} position={[0, 1.52, 0]}>
          <octahedronGeometry args={[0.32, 1]} />
          <meshPhysicalMaterial
            color={active === 2 ? "#ff0033" : "#fff3a8"}
            emissive={active === 2 ? "#420010" : "#221900"}
            roughness={0.08}
            metalness={0.1}
            transmission={0.15}
            clearcoat={1}
          />
        </mesh>
      </Float>
    </group>
  );
}

function PipelineGraph({ active = 1 }) {
  const group = useRef(null);
  const points = useMemo(
    () => [
      new THREE.Vector3(-1.28, -0.38, 0),
      new THREE.Vector3(-0.45, 0.3, 0.18),
      new THREE.Vector3(0.45, -0.02, -0.08),
      new THREE.Vector3(1.28, 0.48, 0.12)
    ],
    []
  );

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.14;
  });

  return (
    <group ref={group} position={[0, 0.32, 0]} scale={0.68}>
      <Line points={points} color="#ffcc00" lineWidth={2} transparent opacity={0.72} />
      {points.map((point, index) => (
        <mesh key={index} position={point}>
          <sphereGeometry args={[index === active ? 0.18 : 0.12, 32, 32]} />
          <meshStandardMaterial
            color={index === active ? "#ff0033" : "#ffcc00"}
            emissive={index === active ? "#3a0010" : "#2c2100"}
            metalness={0.45}
            roughness={0.18}
          />
          <Html center distanceFactor={8}>
            <span className="pipeline-node-label">{String(index + 1).padStart(2, "0")}</span>
          </Html>
        </mesh>
      ))}
    </group>
  );
}

function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} color="#fff7d0" />
      <pointLight position={[-3, 1, 2]} intensity={1.2} color="#ff0033" />
    </>
  );
}

export function JewelryShowcase({ active = 0, compact = false }) {
  return (
    <div className={compact ? "showcase-canvas compact" : "showcase-canvas"}>
      <Canvas camera={{ position: [0, compact ? 0.65 : 0.5, compact ? 5.8 : 4.6], fov: compact ? 38 : 42 }} dpr={[1, 1.65]}>
        <Suspense fallback={null}>
          <SceneLights />
          <Stars radius={10} depth={12} count={500} factor={2.2} saturation={0} fade speed={0.2} />
          <RingAssembly active={active} compact={compact} />
          <OrbitControls enablePan={false} enableZoom={!compact} autoRotate autoRotateSpeed={0.45} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function CadOrbitShowcase({ compact = false }) {
  return (
    <div className={compact ? "showcase-canvas compact solar-system-canvas" : "showcase-canvas solar-system-canvas"}>
      <Canvas camera={{ position: [0, compact ? 0.42 : 0.54, compact ? 6.7 : 6.1], fov: compact ? 36 : 40 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <SceneLights />
          <Stars radius={14} depth={14} count={700} factor={2} saturation={0} fade speed={0.14} />
          <SolarSystemAssembly compact={compact} />
          <OrbitControls enablePan={false} enableZoom={!compact} autoRotate autoRotateSpeed={0.28} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export function PipelineShowcase({ active = 1 }) {
  return (
    <div className="pipeline-canvas">
      <Canvas camera={{ position: [0, 0.16, 6.2], fov: 38 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <SceneLights />
          <PipelineGraph active={active} />
          <OrbitControls enablePan={false} enableZoom={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}
