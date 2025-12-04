
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3, BufferGeometry, PerspectiveCamera } from 'three';
import { v4 as uuidv4 } from 'uuid';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GameState, Entity, FruitType, Particle, ScoreData } from '../types';
import { GRAVITY, FRUIT_CONFIG, SPAWN_RATE, BLADE_COLOR, BLADE_COLOR_2, INITIAL_LIVES } from '../constants';
import FruitObject from './FruitObject';
import Blade from './Blade';
import Splatter from './Splatter';

// Standard MediaPipe Hand Connections for Skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [5, 9], [9, 10], [10, 11], [11, 12], // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [0, 5], [0, 17], [5, 9], [9, 13], [13, 17] // Palm
];

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number, combo: number) => void;
  onTimeUpdate: (time: number) => void;
  onLivesUpdate: (lives: number) => void;
  onGameOver: (data: ScoreData) => void;
  videoElement: HTMLVideoElement | null;
}

// Helper: Distance from a point (p) to a line segment defined by (v, w)
function distanceToSegmentSquared(p: Vector3, v: Vector3, w: Vector3): number {
    const l2 = v.distanceToSquared(w);
    if (l2 === 0) return p.distanceToSquared(v);
    
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    
    const projectionX = v.x + t * (w.x - v.x);
    const projectionY = v.y + t * (w.y - v.y);
    
    const dx = p.x - projectionX;
    const dy = p.y - projectionY;
    
    return dx * dx + dy * dy;
}

// Component to visualize the hand skeleton (IK Lines)
const HandSkeleton: React.FC<{ landmarks: Vector3[], color: string }> = ({ landmarks, color }) => {
    const points: Vector3[] = [];
    HAND_CONNECTIONS.forEach(([start, end]) => {
        if (landmarks[start] && landmarks[end]) {
            points.push(landmarks[start]);
            points.push(landmarks[end]);
        }
    });

    const geometry = useMemo(() => {
        return new BufferGeometry().setFromPoints(points);
    }, [points]);

    return (
        <group>
            <lineSegments geometry={geometry}>
                <lineBasicMaterial color={color} linewidth={1} transparent opacity={0.3} />
            </lineSegments>
            {landmarks.map((pos, i) => (
                <mesh key={i} position={pos}>
                    <sphereGeometry args={[0.08, 4, 4]} />
                    <meshBasicMaterial color={color} transparent opacity={0.4} />
                </mesh>
            ))}
        </group>
    );
};

const GameLogic: React.FC<GameCanvasProps> = ({ 
  gameState, setGameState, onScoreUpdate, onTimeUpdate, onLivesUpdate, onGameOver, videoElement 
}) => {
  const { camera } = useThree();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  
  const [debugHands, setDebugHands] = useState<{left: Vector3[], right: Vector3[]}>({ left: [], right: [] });

  const entitiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const bladeTrailsRef = useRef<{ [key: string]: Vector3[] }>({ "Left": [], "Right": [] });
  
  // Game State Refs
  const scoreRef = useRef<number>(0);
  const livesRef = useRef<number>(INITIAL_LIVES);
  const timeElapsedRef = useRef<number>(0);
  const slicedCountsRef = useRef<Record<FruitType, number>>({
    [FruitType.WATERMELON]: 0,
    [FruitType.ORANGE]: 0,
    [FruitType.LEMON]: 0,
    [FruitType.BOMB]: 0,
  });
  const maxComboRef = useRef<number>(0);
  const lastSpawnTime = useRef<number>(0);
  const currentCombo = useRef<number>(0);
  const comboTimer = useRef<number>(0);

  useEffect(() => {
    const initHandTracking = async () => {
      try {
        setGameState(GameState.LOADING_AI);
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        handLandmarkerRef.current = handLandmarker;
        setGameState(GameState.MENU);
      } catch (err) {
        console.error("Failed to load hand tracking:", err);
      }
    };
    initHandTracking();
  }, [setGameState]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      scoreRef.current = 0;
      timeElapsedRef.current = 0;
      livesRef.current = INITIAL_LIVES;
      slicedCountsRef.current = {
        [FruitType.WATERMELON]: 0,
        [FruitType.ORANGE]: 0,
        [FruitType.LEMON]: 0,
        [FruitType.BOMB]: 0,
      };
      maxComboRef.current = 0;
      currentCombo.current = 0;
      
      entitiesRef.current = [];
      setEntities([]);
      particlesRef.current = [];
      setParticles([]);
      bladeTrailsRef.current = { "Left": [], "Right": [] };
      
      onLivesUpdate(INITIAL_LIVES);
      onScoreUpdate(0, 0);
      onTimeUpdate(0);
    }
  }, [gameState, onLivesUpdate, onScoreUpdate, onTimeUpdate]);

  const spawnFruit = () => {
    const types = [FruitType.WATERMELON, FruitType.ORANGE, FruitType.LEMON, FruitType.BOMB];
    const type = Math.random() < 0.25 ? FruitType.BOMB : types[Math.floor(Math.random() * 3)];
    
    const x = (Math.random() - 0.5) * 16; 
    const velocityX = (Math.random() - 0.5) * 4 - (x * 0.2); 
    const velocityY = 16 + Math.random() * 6;
    const rotationSpeed = new Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4);

    entitiesRef.current.push({
      id: uuidv4(),
      type,
      position: new Vector3(x, -12, 0),
      velocity: new Vector3(velocityX, velocityY, 0),
      rotation: new Vector3(0, 0, 0),
      rotationSpeed,
      isSliced: false,
      sliceTime: 0,
      sliceDirection: new Vector3(0,0,0),
      scale: FRUIT_CONFIG[type].size
    });
  };

  const createExplosion = (pos: Vector3, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: uuidv4(),
        position: pos.clone(),
        velocity: new Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 5),
        color,
        life: 1.0,
        size: 0.2 + Math.random() * 0.5
      });
    }
  };

  const mapLandmarkToWorld = (x: number, y: number) => {
    const dist = 10;
    const vFOV = 50 * Math.PI / 180;
    const height = 2 * Math.tan(vFOV / 2) * dist;
    const aspect = (camera as PerspectiveCamera).aspect;
    const width = height * aspect;

    const worldX = (0.5 - x) * width; 
    const worldY = (0.5 - y) * height;
    
    return new Vector3(worldX, worldY, 0);
  };

  useFrame((state, delta) => {
    if (gameState !== GameState.PLAYING) return;

    // --- Hand Tracking ---
    if (handLandmarkerRef.current && videoElement && videoElement.readyState >= 2) {
        if (videoElement.currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = videoElement.currentTime;
            const startTime = performance.now();
            const result = handLandmarkerRef.current.detectForVideo(videoElement, startTime);
            
            const newDebugHands = { left: [] as Vector3[], right: [] as Vector3[] };
            const presentHands = new Set<string>();

            result.landmarks.forEach((landmarks, index) => {
                let handSide = "Right";
                if (result.handedness && result.handedness[index] && result.handedness[index][0]) {
                     handSide = result.handedness[index][0].categoryName; 
                }
                presentHands.add(handSide);

                const skeleton = landmarks.map(l => mapLandmarkToWorld(l.x, l.y));
                if (handSide === "Left") newDebugHands.left = skeleton;
                else newDebugHands.right = skeleton;

                const tip = landmarks[8];
                const bladePos = mapLandmarkToWorld(tip.x, tip.y);
                
                const trail = bladeTrailsRef.current[handSide];
                if (trail.length === 0 || trail[trail.length - 1].distanceTo(bladePos) > 0.1) {
                    trail.push(bladePos);
                    if (trail.length > 14) trail.shift();
                }
            });

            ["Left", "Right"].forEach(side => {
                if (!presentHands.has(side)) {
                    if (bladeTrailsRef.current[side].length > 0) {
                        bladeTrailsRef.current[side].shift();
                    }
                }
            });
            setDebugHands(newDebugHands);
        }
    }

    // --- Game Loop Update ---
    timeElapsedRef.current += delta;
    onTimeUpdate(timeElapsedRef.current);

    if (state.clock.elapsedTime - lastSpawnTime.current > SPAWN_RATE) {
      spawnFruit();
      if (Math.random() > 0.6) spawnFruit(); // Ramp up difficulty slightly
      if (Math.random() > 0.8) spawnFruit();
      lastSpawnTime.current = state.clock.elapsedTime;
    }

    // --- Physics ---
    const survivors: Entity[] = [];
    entitiesRef.current.forEach(entity => {
      entity.velocity.y -= GRAVITY * delta;
      entity.position.addScaledVector(entity.velocity, delta);

      if (entity.position.y > -15) {
         survivors.push(entity);
      }
    });
    entitiesRef.current = survivors;

    const activeParticles: Particle[] = [];
    particlesRef.current.forEach(p => {
      p.life -= delta * 1.5;
      p.velocity.y -= GRAVITY * 0.5 * delta;
      p.position.addScaledVector(p.velocity, delta);
      if (p.life > 0) activeParticles.push(p);
    });
    particlesRef.current = activeParticles;

    // --- Collision ---
    ["Right", "Left"].forEach(hand => {
        const trail = bladeTrailsRef.current[hand];
        if (trail.length < 2) return;
        
        const tipPos = trail[trail.length - 1];
        const prevPos = trail[trail.length - 2];
        const moveDist = tipPos.distanceTo(prevPos);
        if (moveDist < 0.1) return;

        entitiesRef.current.forEach(entity => {
           if (!entity.isSliced) {
               const hitboxRadius = entity.scale * 1.2;
               const distSq = distanceToSegmentSquared(entity.position, prevPos, tipPos);
               
               if (distSq < hitboxRadius * hitboxRadius) {
                   entity.isSliced = true;
                   entity.sliceTime = state.clock.elapsedTime;
                   entity.sliceDirection = new Vector3().subVectors(tipPos, prevPos).normalize();
                   entity.velocity.add(entity.sliceDirection.multiplyScalar(5));

                   if (entity.type === FruitType.BOMB) {
                       // BOMB HIT: Remove Life
                       livesRef.current -= 1;
                       onLivesUpdate(livesRef.current);
                       
                       createExplosion(entity.position, '#ffffff', 40);
                       createExplosion(entity.position, '#ff0000', 40);
                       
                       // Remove bomb visual
                       entity.position.y = -999;

                       // Clear screen on bomb hit (Mercy rule)
                       entitiesRef.current.forEach(e => {
                           if (!e.isSliced && e.type !== FruitType.BOMB) {
                               e.isSliced = true;
                               e.sliceDirection = new Vector3(0,1,0);
                               e.sliceTime = state.clock.elapsedTime;
                               createExplosion(e.position, FRUIT_CONFIG[e.type].color, 10);
                           }
                       });

                       if (livesRef.current <= 0) {
                           setGameState(GameState.GAME_OVER);
                           onGameOver({
                               score: scoreRef.current,
                               fruitsSliced: slicedCountsRef.current,
                               comboMax: maxComboRef.current
                           });
                       }
                   } else {
                       // FRUIT HIT
                       slicedCountsRef.current[entity.type]++;
                       scoreRef.current += FRUIT_CONFIG[entity.type].score;
                       
                       currentCombo.current++;
                       comboTimer.current = 0.4;
                       if (currentCombo.current > maxComboRef.current) maxComboRef.current = currentCombo.current;

                       createExplosion(entity.position, FRUIT_CONFIG[entity.type].color, 20);
                       createExplosion(entity.position, FRUIT_CONFIG[entity.type].rind, 10);
                   }
               }
           }
        });
    });

    if (comboTimer.current > 0) {
        comboTimer.current -= delta;
        if (comboTimer.current <= 0) currentCombo.current = 0;
    }

    onScoreUpdate(scoreRef.current, currentCombo.current);
    setEntities([...entitiesRef.current]);
    setParticles([...particlesRef.current]);
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 10]} intensity={1.5} />
      <directionalLight position={[-10, 5, 5]} intensity={0.5} color="#aaddff" />
      <pointLight position={[-10, 0, 10]} intensity={0.5} color="#ff00ff" />
      
      {entities.map(e => (
        <FruitObject key={e.id} entity={e} />
      ))}

      {particles.map(p => (
        <Splatter key={p.id} particle={p} />
      ))}

      <Blade points={bladeTrailsRef.current["Right"]} color={BLADE_COLOR} />
      <Blade points={bladeTrailsRef.current["Left"]} color={BLADE_COLOR_2} />

      {debugHands.left.length > 0 && <HandSkeleton landmarks={debugHands.left} color={BLADE_COLOR_2} />}
      {debugHands.right.length > 0 && <HandSkeleton landmarks={debugHands.right} color={BLADE_COLOR} />}
    </>
  );
};

const GameCanvas: React.FC<GameCanvasProps> = (props) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 50 }}
      className="w-full h-full bg-transparent"
      dpr={[1, 2]} 
    >
      <GameLogic {...props} />
    </Canvas>
  );
};

export default GameCanvas;
