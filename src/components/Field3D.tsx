import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { SDBPlayer } from "@/lib/sportsdb.functions";
import type { AFLineupPlayer } from "@/lib/apifootball.functions";

// ── unified player type ───────────────────────────────────────
export type FieldPlayer = {
  id: string;
  name: string;
  number: string | null;
  pos: string | null;
  photo: string | null;
  // grid: "row:col" e.g. "1:1" (API-Football format)
  grid: string | null;
};

export function sdbToField(p: SDBPlayer): FieldPlayer {
  return {
    id: p.idPlayer,
    name: p.strPlayer,
    number: p.strNumber ?? null,
    pos: p.strPosition ?? null,
    photo: p.strCutout || p.strThumb || null,
    grid: null,
  };
}

export function afToField(p: AFLineupPlayer): FieldPlayer {
  return {
    id: String(p.id),
    name: p.name,
    number: p.number !== null ? String(p.number) : null,
    pos: p.pos ?? null,
    photo: p.photo ?? null,
    grid: p.grid ?? null,
  };
}

// ── formation positions from API-Football grid ────────────────
// grid = "row:col", rows go 1..N from GK outward, cols go 1..M left to right
function gridToPosition(grid: string | null, index: number, total: number, side: 1 | -1): [number, number, number] {
  const PITCH_W = 7;
  const PITCH_L = 11;

  if (grid) {
    const [rowStr, colStr] = grid.split(":");
    const row = parseInt(rowStr) || 1;
    const col = parseInt(colStr) || 1;
    // Estimate max cols in this row (we don't know, assume 5 max)
    // row 1 = GK zone, higher rows = further up field
    const maxRows = 5;
    const yNorm = (row - 1) / Math.max(maxRows - 1, 1); // 0..1
    const xNorm = (col - 1) / 4 - 0.5; // -0.5..0.5 (assuming max 5 cols)

    const px = xNorm * (PITCH_W - 1.2);
    const pz = side === -1
      ? -PITCH_L / 2 + 0.7 + yNorm * (PITCH_L / 2 - 0.9)
      : PITCH_L / 2 - 0.7 - yNorm * (PITCH_L / 2 - 0.9);
    return [px, 0, pz];
  }

  // Fallback: 4-3-3 formation
  const FORMATION_433: Array<[number, number]> = [
    [0, 0.08],
    [-0.7, 0.28], [-0.25, 0.28], [0.25, 0.28], [0.7, 0.28],
    [-0.55, 0.55], [0, 0.55], [0.55, 0.55],
    [-0.6, 0.85], [0, 0.92], [0.6, 0.85],
  ];
  const [x, y] = FORMATION_433[Math.min(index, FORMATION_433.length - 1)];
  const px = x * (PITCH_W / 2 - 0.6);
  const pz = side === -1
    ? -PITCH_L / 2 + 0.7 + y * (PITCH_L / 2 - 0.7)
    : PITCH_L / 2 - 0.7 - y * (PITCH_L / 2 - 0.7);
  return [px, 0, pz];
}

function posLabel(pos: string | null): string {
  if (!pos) return "";
  const p = pos.toUpperCase();
  if (p === "G" || p === "GK") return "GK";
  if (p === "D" || p === "CB" || p === "LB" || p === "RB" || p.includes("DEF")) return "DEF";
  if (p === "M" || p.includes("MID") || p === "CM" || p === "DM" || p === "AM") return "MID";
  if (p === "F" || p === "ST" || p === "LW" || p === "RW" || p.includes("ATT") || p.includes("FOR")) return "ATK";
  return pos.slice(0, 3).toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 11);
  const last = parts[parts.length - 1];
  return last.length <= 10 ? last : last.slice(0, 10);
}

// ── Pitch ─────────────────────────────────────────────────────
const PITCH_W = 7;
const PITCH_L = 11;

function Pitch() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[PITCH_W, PITCH_L]} />
        <meshStandardMaterial color="#0c2418" emissive="#0a3d22" emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, 0.001, -PITCH_L / 2 + 0.55 + i * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PITCH_W, 0.55]} />
          <meshStandardMaterial color={i % 2 === 0 ? "#0e2a1c" : "#0a2317"} />
        </mesh>
      ))}
      {/* Center line */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PITCH_W, 0.03]} />
        <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
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
      {/* Penalty areas */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[0, 0.012, side * (PITCH_L / 2 - 1.8)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.6, 0.03]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
          <mesh position={[1.8, 0.012, side * (PITCH_L / 2 - 0.9)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 1.8]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
          <mesh position={[-1.8, 0.012, side * (PITCH_L / 2 - 0.9)]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.03, 1.8]} />
            <meshBasicMaterial color="#9ef6c2" transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── PlayerToken ───────────────────────────────────────────────
function PlayerToken({
  player, basePosition, color, ringColor, live, seed,
}: {
  player: FieldPlayer;
  basePosition: [number, number, number];
  color: string;
  ringColor: string;
  live: boolean;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const billboardRef = useRef<THREE.Group>(null);

  const wander = useMemo(() => {
    const a = (seed * 9301 + 49297) % 233280;
    const b = (seed * 1597 + 51749) % 233280;
    const c = (seed * 2749 + 65537) % 233280;
    return {
      ax: 0.5 + (a / 233280) * 0.6,
      az: 0.5 + (b / 233280) * 0.6,
      phx: (a / 233280) * Math.PI * 2,
      phz: (b / 233280) * Math.PI * 2,
      sp: 0.2 + (c / 233280) * 0.3,
    };
  }, [seed]);

  useFrame(({ camera, clock }) => {
    if (groupRef.current) {
      const t = clock.getElapsedTime() * wander.sp;
      const amp = live ? 0.5 : 0;
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

  const label = posLabel(player.pos);
  const name = shortName(player.name);
  const num = player.number;

  return (
    <group ref={groupRef} position={basePosition}>
      {/* Shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
      {/* Outer glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.36, 0.44, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={live ? 0.9 : 0.65} />
      </mesh>
      {/* Inner fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.019, 0]}>
        <circleGeometry args={[0.36, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} />
      </mesh>
      {/* Live pulse */}
      {live && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
          <ringGeometry args={[0.5, 0.56, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.2} />
        </mesh>
      )}

      {/* Billboard */}
      <group ref={billboardRef} position={[0, 0.55, 0]}>
        {player.photo ? (
          <PhotoBadge photo={player.photo} color={color} ringColor={ringColor} name={name} num={num} label={label} />
        ) : (
          <NumberBadge color={color} ringColor={ringColor} name={name} num={num} label={label} />
        )}
      </group>
    </group>
  );
}

function PhotoBadge({ photo, color, ringColor, name, num, label }: {
  photo: string; color: string; ringColor: string; name: string; num: string | null; label: string;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      photo,
      (tex) => {
        if (cancelled) { tex.dispose(); return; }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => { if (!cancelled) setFailed(true); },
    );
    return () => { cancelled = true; };
  }, [photo]);

  if (failed || !texture) {
    return <NumberBadge color={color} ringColor={ringColor} name={name} num={num} label={label} />;
  }

  return (
    <group>
      {/* Outer ring */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.46, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
      </mesh>
      {/* Dark bg */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.40, 32]} />
        <meshBasicMaterial color="#071510" />
      </mesh>
      {/* Photo */}
      <mesh>
        <planeGeometry args={[0.75, 0.75]} />
        <meshBasicMaterial map={texture} transparent />
      </mesh>
      {/* Number badge top-right */}
      {num && (
        <group position={[0.28, 0.28, 0.01]}>
          <mesh>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color={color} transparent opacity={0.95} />
          </mesh>
          <Text fontSize={0.14} color="#000000" anchorX="center" anchorY="middle" position={[0, 0, 0.01]}>
            {num}
          </Text>
        </group>
      )}
      {/* Name below */}
      <Text
        position={[0, -0.55, 0.01]}
        fontSize={0.13}
        color="#eafff1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
        maxWidth={1.1}
      >
        {name}
      </Text>
    </group>
  );
}

function NumberBadge({ color, ringColor, name, num, label }: {
  color: string; ringColor: string; name: string; num: string | null; label: string;
}) {
  return (
    <group>
      {/* Outer border */}
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[0.44, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.9} />
      </mesh>
      {/* Dark bg */}
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[0.38, 32]} />
        <meshBasicMaterial color="#071510" />
      </mesh>
      {/* Inner color ring */}
      <mesh position={[0, 0, -0.005]}>
        <ringGeometry args={[0.27, 0.33, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.65} />
      </mesh>
      {/* Number */}
      <Text
        position={[0, num ? 0.02 : 0, 0.01]}
        fontSize={num ? 0.26 : 0.14}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.014}
        outlineColor="#000000"
      >
        {num ?? "?"}
      </Text>
      {/* Position label */}
      {label !== "" && (
        <Text
          position={[0, 0.3, 0.01]}
          fontSize={0.10}
          color={ringColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.007}
          outlineColor="#000000"
        >
          {label}
        </Text>
      )}
      {/* Name */}
      <Text
        position={[0, -0.53, 0.01]}
        fontSize={0.13}
        color="#eafff1"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
        maxWidth={1.1}
      >
        {name}
      </Text>
    </group>
  );
}

// ── Scene ─────────────────────────────────────────────────────
function Scene({ home, away, live }: { home: FieldPlayer[]; away: FieldPlayer[]; live: boolean }) {
  const homePositions = useMemo(
    () => home.map((p, i) => gridToPosition(p.grid, i, home.length, -1)),
    [home],
  );
  const awayPositions = useMemo(
    () => away.map((p, i) => gridToPosition(p.grid, i, away.length, 1)),
    [away],
  );

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <pointLight position={[0, 6, 0]} intensity={0.6} color="#9ef6c2" />
      <pointLight position={[0, 4, -5]} intensity={0.5} color="#7ef0a8" />
      <pointLight position={[0, 4, 5]} intensity={0.5} color="#d77bff" />
      <Pitch />
      {home.map((p, i) => (
        <PlayerToken
          key={`h-${p.id}-${i}`}
          player={p}
          basePosition={homePositions[i]}
          color="#7ef0a8"
          ringColor="#9ef6c2"
          live={live}
          seed={Number(p.id) || i + 1}
        />
      ))}
      {away.map((p, i) => (
        <PlayerToken
          key={`a-${p.id}-${i}`}
          player={p}
          basePosition={awayPositions[i]}
          color="#d77bff"
          ringColor="#e9a8ff"
          live={live}
          seed={Number(p.id) || i + 100}
        />
      ))}
    </>
  );
}

// ── Export ────────────────────────────────────────────────────
export function Field3D({
  home,
  away,
  live = false,
}: {
  home: FieldPlayer[];
  away: FieldPlayer[];
  live?: boolean;
}) {
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
