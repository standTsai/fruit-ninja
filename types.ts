import { Vector3 } from 'three';

export enum GameState {
  MENU = 'MENU',
  LOADING_AI = 'LOADING_AI',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ANALYZING = 'ANALYZING'
}

export enum FruitType {
  WATERMELON = 'WATERMELON',
  ORANGE = 'ORANGE',
  LEMON = 'LEMON',
  BOMB = 'BOMB'
}

export interface Entity {
  id: string;
  type: FruitType;
  position: Vector3;
  velocity: Vector3;
  rotation: Vector3;
  rotationSpeed: Vector3;
  isSliced: boolean;
  sliceTime: number; // Time when it was sliced
  sliceDirection: Vector3; // Direction of the cut
  scale: number;
}

export interface Particle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  color: string;
  life: number; // 0 to 1
  size: number;
}

export interface ScoreData {
  score: number;
  fruitsSliced: Record<FruitType, number>;
  comboMax: number;
}

export interface SenseiWisdom {
  rank: string;
  quote: string;
  analysis: string;
}