/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';

interface StartScreenProps {
  onStart: (aiEnabled: boolean) => void;
  onLoad: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, onLoad }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [hasSave, setHasSave] = useState(false);
  const [saveInfo, setSaveInfo] = useState<string>("");

  useEffect(() => {
    try {
      const saveStr = localStorage.getItem('skymetropolis_save');
      if (saveStr) {
        const data = JSON.parse(saveStr);
        setHasSave(true);
        const happy = data.stats.happiness ?? 100;
        const pollution = data.stats.pollution ?? 0;
        setSaveInfo(`Day ${data.stats.day} • $${data.stats.money.toLocaleString()} • Pop: ${data.stats.population} • Happy: ${happy}% • Pol: ${pollution}`);
      }
    } catch (e) {
      console.error("Error checking save:", e);
    }
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white font-sans p-6 bg-black/30 backdrop-blur-sm transition-all duration-1000">
      <div className="max-w-md w-full bg-slate-900/90 p-8 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10">
            <h1 className="text-5xl font-black mb-2 bg-gradient-to-br from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent tracking-tight">
            SkyMetropolis
            </h1>
            <p className="text-slate-400 mb-8 text-sm font-medium uppercase tracking-widest">
            Isometric City Builder
            </p>

            {hasSave && (
              <div className="mb-8">
                <button
                  onClick={onLoad}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] text-lg tracking-wide border border-green-400/30 flex flex-col items-center justify-center gap-1 group"
                >
                  <span className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Continue City
                  </span>
                  <span className="text-xs font-mono font-normal opacity-80 text-green-100 group-hover:text-white transition-colors">
                    {saveInfo}
                  </span>
                </button>
                
                <div className="relative flex py-4 items-center">
                    <div className="flex-grow border-t border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase font-bold tracking-widest">Or Start New</span>
                    <div className="flex-grow border-t border-slate-700"></div>
                </div>
              </div>
            )}

            <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 mb-8 hover:border-slate-600 transition-colors shadow-inner">
            <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex flex-col gap-1">
                <span className="font-bold text-base text-slate-200 group-hover:text-white transition-colors flex items-center gap-2">
                    AI City Advisor
                    {aiEnabled && <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>}
                </span>
                <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                    Enable dynamic quests & news events via Gemini API
                </span>
                </div>
                
                <div className="relative flex-shrink-0 ml-4">
                <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600 peer-checked:after:bg-white"></div>
                </div>
            </label>
            </div>

            <button 
            onClick={() => onStart(aiEnabled)}
            className={`w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] text-lg tracking-wide ${hasSave ? 'opacity-90 hover:opacity-100' : ''}`}
            >
              {hasSave ? 'Start New City' : 'Start Building'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;