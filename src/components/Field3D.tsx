import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const lineMat = new THREE.MeshBasicMaterial({ color: "#9ef6c2", transparent: true, opacity: 0.55 });
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
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PITCH_W, 0.04]} />
        <primitive object={lineMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 0.95, 64]} />
        <meshBasicMaterial color="#9ef6c2" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#9ef6c2" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
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
  basePosition,
  color,
  ringColor,
  live,
  seed,
}: {
  player: SDBPlayer;
  basePosition: [number, number, number];
  color: string;
  ringColor: string;
  live: boolean;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const billboardRef = useRef<THREE.Group>(null);
  const photoUrl = player.strCutout || player.strThumb;

  // Per-player wandering parameters derived from seed
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
      const dx = Math.sin(t + wander.phx) * wander.ax * amp;
      const dz = Math.cos(t * 0.85 + wander.phz) * wander.az * amp;
      groupRef.current.position.set(
        basePosition[0] + dx,
        basePosition[1],
        basePosition[2] + dz,
      );
    }
    if (billboardRef.current) {
      billboardRef.current.lookAt(camera.position.x, billboardRef.current.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
    }
  });

  return (
    <group ref={groupRef} position={basePosition}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.32, 0.38, 32]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[0.34, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} />
      </mesh>
      {live && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.019, 0]}>
          <ringGeometry args={[0.42, 0.48, 32]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.35} />
        </mesh>
      )}
      <group ref={billboardRef} position={[0, 0.55, 0]}>
        <PlayerVisual url={photoUrl} number={player.strNumber} color={color} />
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

function PlayerVisual({ url, number, color }: { url?: string | null; number?: string | null; color: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        setTexture(tex);
      },
      undefined,
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url || failed || !texture) {
    return <NumberBadge number={number} color={color} />;
  }

  return (
    <group>
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

function Scene({ home, away, live }: { home: SDBPlayer[]; away: SDBPlayer[]; live: boolean }) {
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
          basePosition={homePositions[i]}
          color="#7ef0a8"
          ringColor="#9ef6c2"
          live={live}
          seed={Number(p.idPlayer) || i + 1}
        />
      ))}
      {away.map((p, i) => (
        <PlayerToken
          key={`a-${p.idPlayer}`}
          player={p}
          basePosition={awayPositions[i]}
          color="#d77bff"
          ringColor="#e9a8ff"
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
