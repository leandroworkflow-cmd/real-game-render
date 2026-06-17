import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SDBPlayer } from "@/lib/sportsdb.functions";

const FORMATION_433: Array<[number, number]> = [
  [0, 0.08],
  [-0.7, 0.28], [-0.25, 0.28], [0.25, 0.28], [0.7, 0.28],
  [-0.55, 0.55], [0, 0.55], [0.55, 0.55],
  [-0.6, 0.85], [0, 0.92], [0.6, 0.85],
];

const PITCH_W = 7;
const PITCH_L = 11;

// Position abbreviation
function posAbbr(pos?: string | null): string {
  if (!pos) return "";
  const p = pos.toUpperCase();
  if (p.includes("GOAL") || p === "GK" || p === "G") return "GK";
  if (p.includes("DEFEND") || p === "CB" || p === "LB" || p === "RB" || p === "D") return "DEF";
  if (p.includes("MID") || p === "CM" || p === "DM" || p === "AM" || p === "M") return "MID";
  if (p.includes("FORWARD") || p.includes("ATTACK") || p === "ST" || p === "LW" || p === "RW" || p === "F") return "ATK";
  return pos.slice(0, 3).toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 10);
  // Use last name, or last two words if short
  const last = parts[parts.length - 1];
  if (last.length <= 8) return last;
  return last.slice(0, 9);
}

function Pitch() {
  return (
    <group>
      {/* Main grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W, PITCH_L]} />
        <meshStandardMaterial color="#0c2418" emissive="#0a3d22" emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      {/* Stripe pattern */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, 0.001, -PITCH_L / 2 + 0.55 + i * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PITCH_W, 0.55]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#0e2a1c" : "#0a2317"} />
        </mesh>
      ))}
      {/* Boundary */}
      {[
        [[-PITCH_W/2,0.015,-PITCH_L/2],[PITCH_W/2,0.015,-PITCH_L/2],[PITCH_W/2,0.015,PITCH_L/2],[-PITCH_W/2,0.015,PITCH_L/2],[-PITCH_W/2,0.015,-PITCH_L/2]],
      ].map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(pts.flat() as number[]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#9ef6c2" transparent opacity={0.7} />
        </line>
      ))}
      {/* Center line */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PITCH_W, 0.04]} />
        <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
      </mesh>
      {/* Center circle */}
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 0.95, 64]} />
        <meshBasicMaterial color="#9ef6c2" transparent opacity={0.6} />
      </mesh>
      {/* Center dot */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#9ef6c2" />
      </mesh>
      {/* Penalty areas */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[0, 0.012, side * (PITCH_L / 2 - 1.8)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.6, 0.04]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
          <mesh position={[1.8, 0.012, side * (PITCH_L / 2 - 0.9)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 1.8]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
          <mesh position={[-1.8, 0.012, side * (PITCH_L / 2 - 0.9)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.04, 1.8]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function PlayerToken({
  player,
  basePosition,
  color,
  ringColor,
  glowColor,
  live,
  seed,
}: {
  player: SDBPlayer;
  basePosition: [number, number, number];
  color: string;
  ringColor: string;
  glowColor: string;
  live: boolean;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const photoUrl = player.strCutout || player.strThumb;

  const wander = useMemo(() => {
    const a = (seed * 9301 + 49297) % 233280;
    const b = (seed * 1597 + 51749) % 233280;
    const c = (seed * 2749 + 65537) % 233280;
    return {
      ax: 0.6 + (a / 233280) * 0.8,
      az: 0.6 + (b / 233280) * 0.8,
      phx: (a / 233280) * Math.PI * 2,
      phz: (b / 233280) * Math.PI * 2,
      sp: 0.25 + (c / 233280) * 0.35,
    };
  }, [seed]);

  useFrame(({ camera, clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime() * wander.sp;
      const amp = live ? 0.55 : 0;
      groupRef.current.position.set(
        basePosition[0] + Math.sin(t + wander.phx) * wander.ax * amp,
        basePosition[1],
        basePosition[2] + Math.cos(t * 0.85 + wander.phz) * wander.az * amp,
      );
    }
    if (billboardRef.current) {
      const wp = new THREE.Vector3();
      billboardRef.current.getWorldPosition(wp);
      billboardRef.current.lookAt(camera.position.x, wp.y, camera.position.z);
    }
  });

  const pos = posAbbr(player.strPosition);
  const name = shortName(player.strPlayer);
  const num = player.strNumber;

  return (
    <group ref={groupRef} position={basePosition}>
      {/* Shadow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.3} />
      </mesh>
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={live ? 0.9 : 0.6} />
      </mesh>
      {/* Inner fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.019, 0]}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      {/* Live pulse ring */}
      {live && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
          <ringGeometry args={[0.5, 0.56, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.25} />
        </mesh>
      )}

      {/* Billboard group (faces camera) */}
      <group ref={billboardRef} position={[0, 0.6, 0]}>
        {photoUrl ? (
          <PhotoVisual url={photoUrl} color={color} ringColor={ringColor} />
        ) : (
          <BadgeVisual
            number={num}
            name={name}
            pos={pos}
            color={color}
            ringColor={ringColor}
            glowColor={glowColor}
          />
        )}
      </group>
    </group>
  );
}

function PhotoVisual({ url, color, ringColor }: { url: string; color: string; ringColor: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setFailed(true); },
    );
    return () => { cancelled = true; };
  }, [url]);

  if (failed || !texture) return null;

  return (
    <group>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.44, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, 0, -0.005]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#0a1a12" />
      </mesh>
      <mesh>
        <planeGeometry args={[0.72, 0.72]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
    </group>
  );
}

function BadgeVisual({
  number, name, pos, color, ringColor, glowColor,
}: {
  number?: string | null;
  name: string;
  pos: string;
  color: string;
  ringColor: string;
  glowColor: string;
}) {
  return (
    <group>
      {/* Outer border circle */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.44, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
      </mesh>
      {/* Dark background */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#071510" />
      </mesh>
      {/* Inner color ring */}
      <mesh position={[0, 0, -0.005]}>
        <ringGeometry args={[0.28, 0.34, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* Jersey number — big and bold */}
      {number && (
        <Text
          position={[0, 0.04, 0.01]}
          fontSize={0.28}
          color={glowColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.015}
          outlineColor="#000000"
          fontWeight="bold"
        >
          {number}
        </Text>
      )}

      {/* Position badge (small, top) */}
      {pos && (
        <Text
          position={[0, 0.3, 0.01]}
          fontSize={0.11}
          color={ringColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.008}
          outlineColor="#000000"
        >
          {pos}
        </Text>
      )}

      {/* Player name below the circle */}
      <Text
        position={[0, -0.52, 0.01]}
        fontSize={0.14}
        color="#eafff1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
        maxWidth={1.2}
      >
        {name}
      </Text>
    </group>
  );
}

function Scene({ home, away, live }: { home: SDBPlayer[]; away: SDBPlayer[]; live: boolean }) {
  const homePositions = useMemo(
    () =>
      FORMATION_433.slice(0, home.length).map(([x, y]) => [
        x * (PITCH_W / 2 - 0.6),
        0,
        -PITCH_L / 2 + 0.7 + y * (PITCH_L / 2 - 0.7),
      ] as [number, number, number]),
    [home.length],
  );
  const awayPositions = useMemo(
    () =>
      FORMATION_433.slice(0, away.length).map(([x, y]) => [
        x * (PITCH_W / 2 - 0.6),
        0,
        PITCH_L / 2 - 0.7 - y * (PITCH_L / 2 - 0.7),
      ] as [number, number, number]),
    [away.length],
  );

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#9ef6c2" />
      <pointLight position={[0, 4, -4]} intensity={0.4} color="#7ef0a8" />
      <pointLight position={[0, 4, 4]} intensity={0.4} color="#d77bff" />
      <Pitch />
      {home.map((p, i) => (
        <PlayerToken
          key={`h-${p.idPlayer}-${i}`}
          player={p}
          basePosition={homePositions[i]}
          color="#7ef0a8"
          ringColor="#9ef6c2"
          glowColor="#ffffff"
          live={live}
          seed={Number(p.idPlayer) || i + 1}
        />
      ))}
      {away.map((p, i) => (
        <PlayerToken
          key={`a-${p.idPlayer}-${i}`}
          player={p}
          basePosition={awayPositions[i]}
          color="#d77bff"
          ringColor="#e9a8ff"
          glowColor="#ffffff"
          live={live}
          seed={Number(p.idPlayer) || i + 100}
        />
      ))}
    </>
  );
}

export function Field3D({ home, away, live = false }: { home: SDBPlayer[]; away: SDBPlayer[]; live?: boolean }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 9, 11], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <Scene home={home} away={away} live={live} />
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
