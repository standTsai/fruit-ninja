
import React from 'react';
import { GameState, SenseiWisdom } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  timeElapsed: number;
  lives: number;
  combo: number;
  wisdom: SenseiWisdom | null;
  onStart: () => void;
  onRestart: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, score, timeElapsed, lives, combo, wisdom, onStart, onRestart 
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* HUD - Top Bar */}
      <div className="flex justify-between items-start text-white drop-shadow-md">
        <div className="flex flex-col">
          <h1 className="text-4xl font-bold text-yellow-400 tracking-wider font-sans">ZEN FRUIT</h1>
          <div className="text-3xl mt-1 font-bold">Score: {score}</div>
        </div>
        
        <div className="flex flex-col items-end">
           {/* LIVES (HEARTS) */}
           <div className="flex space-x-2 mb-2">
              {[1, 2, 3].map((i) => (
                  <span key={i} className={`text-5xl transition-all duration-300 transform ${i <= lives ? 'text-red-600 scale-100' : 'text-gray-800 scale-75 grayscale'}`}>
                     ❤️
                  </span>
              ))}
           </div>
           
           {/* TIME SURVIVED */}
           <div className="flex items-center space-x-2 mt-2">
               <span className="text-sm text-gray-300 uppercase tracking-widest">Time</span>
               <span className="text-3xl font-mono font-bold text-white">
                  {Math.floor(timeElapsed)}s
               </span>
           </div>

           {combo > 1 && (
             <div className="text-yellow-300 font-bold text-5xl animate-bounce mt-6 drop-shadow-lg">
               {combo} COMBO!
             </div>
           )}
        </div>
      </div>

      {/* Center Menus */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
        
        {/* LOADING AI */}
        {gameState === GameState.LOADING_AI && (
             <div className="bg-black/80 p-8 rounded-xl flex flex-col items-center border border-white/20">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                 <div className="text-white text-xl">Initializing Hand Tracking...</div>
                 <div className="text-gray-400 text-sm mt-2">Please allow camera access</div>
             </div>
        )}

        {/* START SCREEN */}
        {gameState === GameState.MENU && (
          <div className="bg-black/80 backdrop-blur-md p-12 rounded-3xl text-center border-4 border-yellow-500 shadow-2xl max-w-xl">
             <h2 className="text-7xl mb-4 text-white font-bold tracking-tighter">DOJO</h2>
             <div className="text-gray-300 mb-8 text-xl space-y-2">
                <p>👋 Wave hands to slice.</p>
                <p>💣 Bombs take 1 Life.</p>
                <p>❤️ Survive as long as you can.</p>
             </div>
             <button 
                onClick={onStart}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-5 px-12 rounded-full text-3xl transition-transform hover:scale-110 active:scale-95 shadow-[0_0_20px_rgba(220,38,38,0.6)] border-2 border-red-400"
             >
                START
             </button>
          </div>
        )}

        {/* LOADING ANALYSIS */}
        {gameState === GameState.ANALYZING && (
           <div className="text-white text-3xl font-light animate-pulse bg-black/60 p-8 rounded-2xl backdrop-blur">
              Sensei is judging you...
           </div>
        )}

        {/* GAME OVER / WISDOM */}
        {gameState === GameState.GAME_OVER && (
          <div className="bg-stone-900/95 text-stone-100 p-8 rounded-2xl max-w-lg border-4 border-orange-600 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-red-500 via-yellow-500 to-red-500 animate-pulse"></div>
             
             <h2 className="text-6xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-700">GAME OVER</h2>
             <div className="flex justify-around mb-6 text-xl text-gray-300">
                <div>Score: <span className="text-white font-bold">{score}</span></div>
                <div>Time: <span className="text-white font-bold">{Math.floor(timeElapsed)}s</span></div>
             </div>
             
             {wisdom ? (
                <div className="bg-stone-800 p-6 rounded-xl mb-8 border border-stone-600 relative">
                    <div className="absolute -top-3 -left-2 text-4xl">📜</div>
                    <h3 className="text-yellow-500 text-2xl font-bold mb-2 uppercase tracking-widest text-center">{wisdom.rank}</h3>
                    <p className="italic font-serif text-xl text-gray-300 mb-4 text-center">"{wisdom.quote}"</p>
                    <div className="text-sm text-gray-500 border-t border-gray-700 pt-3 text-center">{wisdom.analysis}</div>
                </div>
             ) : (
                <div className="p-4 text-center text-gray-500">Sensei is meditating...</div>
             )}

             <div className="flex justify-center">
                <button 
                  onClick={onRestart}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg text-2xl transition hover:scale-105"
                >
                  TRY AGAIN
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UIOverlay;
