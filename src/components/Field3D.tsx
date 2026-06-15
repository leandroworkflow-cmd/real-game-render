import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SDBPlayer } from "@/lib/sportsdb.functions";

// 4-3-3 formation positions, normalized (-1..1 across, 0..1 along team half).
const FORMATION_433: Array<[number, number]> = [
  [0, 0.08], // GK
  [-0.7, 0.28], [-0.25, 0.28], [0.25, 0.28], [0.7, 0.28], // back 4
  [-0.55, 0.55], [0, 0.55], [0.55, 0.55], // mid 3
  [-0.6, 0.85], [0, 0.92], [0.6, 0.85], // front 3
];

const PITCH_W = 7;
const PITCH_L = 11;

function Pitch() {
  // Lines as thin emissive boxes
  const lineMat = new THREE.MeshBasicMaterial({ color: "#9ef6c2", transparent: true, opacity: 0.55 });
  return (
    <group>
      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W, PITCH_L]} />
        <meshStandardMaterial color="#0c2418" emissive="#0a3d22" emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      {/* Stripes */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, 0.001, -PITCH_L / 2 + 0.55 + i * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PITCH_W, 0.55]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#0e2a1c" : "#0a2317"} />
        </mesh>
      ))}
      {/* Outline */}
      <Line
        points={[
          [-PITCH_W / 2, 0.015, -PITCH_L / 2],
          [PITCH_W / 2, 0.015, -PITCH_L / 2],
          [PITCH_W / 2, 0.015, PITCH_L / 2],
          [-PITCH_W / 2, 0.015, PITCH_L / 2],
          [-PITCH_W / 2, 0.015, -PITCH_L / 2],
        ]}
        color="#9ef6c2"
        lineWidth={2}
        transparent
        opacity={0.7}
      />
      {/* Halfway line */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PITCH_W, 0.04]} />
        <primitive object={lineMat} attach="material" />
      </mesh>
      {/* Center circle */}
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 0.95, 64]} />
        <meshBasicMaterial color="#9ef6c2" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#9ef6c2" />
      </mesh>
      {/* Penalty boxes */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.012, side * (PITCH_L / 2 - 0.9)]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0, 0.001, 4]} />
            <meshBasicMaterial color="#000" />
          </mesh>
          {/* Box outline using 4 thin planes */}
          {[
            { p: [0, 0.012, side * (PITCH_L / 2 - 1.8)] as [number, number, number], s: [3.6, 0.04] as [number, number] },
            { p: [1.8, 0.012, side * (PITCH_L / 2 - 0.9)] as [number, number, number], s: [0.04, 1.8] as [number, number] },
            { p: [-1.8, 0.012, side * (PITCH_L / 2 - 0.9)] as [number, number, number], s: [0.04, 1.8] as [number, number] },
          ].map((cfg, i) => (
            <mesh key={i} position={cfg.p} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={cfg.s} />
              <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function PlayerToken({
  player,
  position,
  color,
  ringColor,
}: {
  player: SDBPlayer;
  position: [number, number, number];
  color: string;
  ringColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const photoUrl = player.strCutout || player.strThumb;

  useFrame(({ camera }) => {
    if (groupRef.current) {
      groupRef.current.lookAt(camera.position.x, groupRef.current.position.y, camera.position.z);
    }
  });

  return (
    <group position={position}>
      {/* Floor ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.32, 0.38, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} />
      </mesh>
      {/* Glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      {/* Billboard */}
      <group ref={groupRef} position={[0, 0.55, 0]}>
        {photoUrl ? (
          <Suspense fallback={<NumberBadge number={player.strNumber} color={color} />}>
            <PlayerPhoto url={photoUrl} color={color} />
          </Suspense>
        ) : (
          <NumberBadge number={player.strNumber} color={color} />
        )}
        <Text
          position={[0, -0.55, 0.01]}
          fontSize={0.13}
          color="#eafff1"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#0a1a12"
        >
          {shortName(player.strPlayer)}
        </Text>
      </group>
    </group>
  );
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function NumberBadge({ number, color }: { number?: string | null; color: string }) {
  return (
    <group>
      <mesh>
        <circleGeometry args={[0.35, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Text fontSize={0.32} color="#0a1a12" anchorX="center" anchorY="middle" position={[0, 0, 0.01]}>
        {number ?? "?"}
      </Text>
    </group>
  );
}

function PlayerPhoto({ url, color }: { url: string; color: string }) {
  const texture = useLoader(THREE.TextureLoader, url);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (
    <group>
      {/* Backdrop circle */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#0a1a12" />
      </mesh>
      <mesh>
        <planeGeometry args={[0.7, 0.7]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

function Scene({ home, away }: { home: SDBPlayer[]; away: SDBPlayer[] }) {
  const homePositions = useMemo(
    () =>
      FORMATION_433.slice(0, home.length).map(([x, y]) => {
        const px = x * (PITCH_W / 2 - 0.6);
        const pz = -PITCH_L / 2 + 0.7 + y * (PITCH_L / 2 - 0.7);
        return [px, 0, pz] as [number, number, number];
      }),
    [home.length],
  );
  const awayPositions = useMemo(
    () =>
      FORMATION_433.slice(0, away.length).map(([x, y]) => {
        const px = x * (PITCH_W / 2 - 0.6);
        const pz = PITCH_L / 2 - 0.7 - y * (PITCH_L / 2 - 0.7);
        return [px, 0, pz] as [number, number, number];
      }),
    [away.length],
  );

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1} />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#9ef6c2" />
      <Pitch />
      {home.map((p, i) => (
        <PlayerToken
          key={`h-${p.idPlayer}`}
          player={p}
          position={homePositions[i]}
          color="#7ef0a8"
          ringColor="#9ef6c2"
        />
      ))}
      {away.map((p, i) => (
        <PlayerToken
          key={`a-${p.idPlayer}`}
          player={p}
          position={awayPositions[i]}
          color="#d77bff"
          ringColor="#e9a8ff"
        />
      ))}
    </>
  );
}

export function Field3D({ home, away }: { home: SDBPlayer[]; away: SDBPlayer[] }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 9, 11], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene home={home} away={away} />
      <OrbitControls
        enablePan={false}
        minDistance={8}
        maxDistance={20}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}
