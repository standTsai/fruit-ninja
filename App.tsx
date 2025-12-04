
import React, { useState, useCallback, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, ScoreData, SenseiWisdom } from './types';
import { INITIAL_LIVES } from './constants';
import { getSenseiWisdom } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING_AI);
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [combo, setCombo] = useState(0);
  const [wisdom, setWisdom] = useState<SenseiWisdom | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Setup Webcam
  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (e) {
        console.warn("Webcam access denied or unavailable:", e);
      }
    };
    startWebcam();
  }, []);

  const handleStart = () => {
    setScore(0);
    setTimeElapsed(0);
    setLives(INITIAL_LIVES);
    setWisdom(null);
    setGameState(GameState.PLAYING);
  };

  const handleScoreUpdate = useCallback((newScore: number, newCombo: number) => {
    setScore(newScore);
    setCombo(newCombo);
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setTimeElapsed(time);
  }, []);

  const handleLivesUpdate = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const handleGameOver = useCallback(async (data: ScoreData) => {
    setGameState(GameState.ANALYZING);
    try {
      const senseiData = await getSenseiWisdom(data);
      setWisdom(senseiData);
    } catch (e) {
      console.error(e);
      setWisdom({
         rank: "Unknown Ninja",
         quote: "The connection to the dojo is weak.",
         analysis: "Check your internet and try again."
      });
    }
    setGameState(GameState.GAME_OVER);
  }, []);

  return (
    <div className="relative w-full h-screen bg-neutral-900 overflow-hidden font-sans select-none">
      
      {/* Background Video (AR Feel) */}
      <video 
        ref={videoRef}
        muted 
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-40 transform -scale-x-100" // Mirror video
      />
      
      {/* 3D Game Layer */}
      <div className="absolute inset-0 z-10">
        <GameCanvas 
           gameState={gameState} 
           setGameState={setGameState}
           onScoreUpdate={handleScoreUpdate}
           onTimeUpdate={handleTimeUpdate}
           onLivesUpdate={handleLivesUpdate}
           onGameOver={handleGameOver}
           videoElement={videoRef.current}
        />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <UIOverlay 
           gameState={gameState}
           score={score}
           timeElapsed={timeElapsed}
           lives={lives}
           combo={combo}
           wisdom={wisdom}
           onStart={handleStart}
           onRestart={handleStart}
        />
      </div>

    </div>
  );
};

export default App;
