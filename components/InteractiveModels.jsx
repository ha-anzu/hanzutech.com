"use client";

import { Float, Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

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
    <group ref={group}>
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

export function PipelineShowcase({ active = 1 }) {
  return (
    <div className="pipeline-canvas">
      <Canvas camera={{ position: [0, 0.16, 5.2], fov: 40 }} dpr={[1, 1.5]}>
        <Suspense fallback={null}>
          <SceneLights />
          <PipelineGraph active={active} />
          <OrbitControls enablePan={false} enableZoom={false} />
        </Suspense>
      </Canvas>
    </div>
  );
}
