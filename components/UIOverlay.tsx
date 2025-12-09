/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { BuildingType, CityStats, AIGoal, NewsItem } from '../types';
import { BUILDINGS } from '../constants';

interface UIOverlayProps {
  stats: CityStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  currentGoal: AIGoal | null;
  newsFeed: NewsItem[];
  onClaimReward: () => void;
  isGeneratingGoal: boolean;
  aiEnabled: boolean;
  onSave: () => void;
}

const tools = [
  BuildingType.None, // Bulldoze
  BuildingType.Road,
  BuildingType.Residential,
  BuildingType.Commercial,
  BuildingType.Industrial,
  BuildingType.Park,
];

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ type, isSelected, onClick, money, onMouseEnter, onMouseLeave }) => {
  const config = BUILDINGS[type];
  const canAfford = money >= config.cost;
  const isBulldoze = type === BuildingType.None;
  
  // Use 3D color for preview
  const bgColor = isBulldoze ? config.color : config.color;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!isBulldoze && !canAfford}
      className={`
        relative flex flex-col items-center justify-center rounded-lg border-2 transition-all shadow-lg backdrop-blur-sm flex-shrink-0
        w-14 h-14 md:w-16 md:h-16
        ${isSelected ? 'border-white bg-white/20 scale-110 z-10' : 'border-gray-600 bg-gray-900/80 hover:bg-gray-800'}
        ${!isBulldoze && !canAfford ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="w-6 h-6 md:w-8 md:h-8 rounded mb-0.5 md:mb-1 border border-black/30 shadow-inner flex items-center justify-center overflow-hidden" style={{ backgroundColor: isBulldoze ? 'transparent' : bgColor }}>
        {isBulldoze && <div className="w-full h-full bg-red-600 text-white flex justify-center items-center font-bold text-base md:text-lg">✕</div>}
        {type === BuildingType.Road && <div className="w-full h-2 bg-gray-800 transform -rotate-45"></div>}
      </div>
      <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider drop-shadow-md leading-none">{config.name}</span>
      {config.cost > 0 && (
        <span className={`text-[8px] md:text-[10px] font-mono leading-none ${canAfford ? 'text-green-300' : 'text-red-400'}`}>${config.cost}</span>
      )}
    </button>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  selectedTool,
  onSelectTool,
  currentGoal,
  newsFeed,
  onClaimReward,
  isGeneratingGoal,
  aiEnabled,
  onSave
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [hoveredTool, setHoveredTool] = useState<BuildingType | null>(null);

  // Auto-scroll news
  useEffect(() => {
    if (newsRef.current) {
      newsRef.current.scrollTop = newsRef.current.scrollHeight;
    }
  }, [newsFeed]);

  const handleSaveClick = () => {
    setSaveStatus('saving');
    onSave();
    // Simulate short delay for feedback
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  // Determine happiness color
  const happinessColor = stats.happiness > 75 ? 'text-green-400' : stats.happiness > 40 ? 'text-yellow-400' : 'text-red-500';
  const happinessIcon = stats.happiness > 75 ? '😊' : stats.happiness > 40 ? '😐' : '😡';

  // Determine pollution color and text
  const pollutionColor = stats.pollution < 30 ? 'text-green-400' : stats.pollution < 70 ? 'text-yellow-400' : 'text-purple-400';
  const pollutionIcon = '🌫️'; // Fog/Pollution icon

  // Weather Icons
  const weatherIcons = {
    sunny: '☀️',
    rainy: '🌧️',
    snowy: '❄️'
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-4 font-sans z-10">
      
      {/* Top Bar: Stats & Goal */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start pointer-events-auto gap-2 w-full max-w-full">
        
        {/* Stats */}
        <div className="bg-gray-900/90 text-white p-2 md:p-3 rounded-xl border border-gray-700 shadow-2xl backdrop-blur-md flex gap-3 md:gap-6 items-center justify-between md:justify-start w-full md:w-auto relative flex-wrap">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">Treasury</span>
            <span className="text-lg md:text-2xl font-black text-green-400 font-mono drop-shadow-md">${stats.money.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 md:h-8 bg-gray-700 hidden md:block"></div>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">Citizens</span>
            <span className="text-base md:text-xl font-bold text-blue-300 font-mono drop-shadow-md">{stats.population.toLocaleString()}</span>
          </div>
          <div className="w-px h-6 md:h-8 bg-gray-700 hidden md:block"></div>
           <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">Happiness</span>
            <span className={`text-base md:text-xl font-bold font-mono drop-shadow-md flex items-center gap-1 ${happinessColor}`}>
              <span className="text-lg">{happinessIcon}</span> {stats.happiness}%
            </span>
          </div>
          <div className="w-px h-6 md:h-8 bg-gray-700 hidden md:block"></div>
           <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">Pollution</span>
            <span className={`text-base md:text-xl font-bold font-mono drop-shadow-md flex items-center gap-1 ${pollutionColor}`}>
              <span className="text-lg">{pollutionIcon}</span> {stats.pollution}
            </span>
          </div>
          <div className="w-px h-6 md:h-8 bg-gray-700 hidden md:block"></div>
          <div className="flex flex-col items-end ml-auto md:ml-0">
             <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">Day</span>
             <span className="text-base md:text-lg font-bold text-white font-mono flex items-center gap-2">
                {stats.day}
                <span title={stats.weather} className="text-xl">{weatherIcons[stats.weather]}</span>
             </span>
          </div>
          
          <div className="w-px h-6 md:h-8 bg-gray-700 ml-2 hidden md:block"></div>
          
          <button 
            onClick={handleSaveClick}
            className={`
              flex items-center justify-center p-2 rounded-lg transition-all duration-300 ml-auto md:ml-0
              ${saveStatus === 'saved' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'hover:bg-gray-800 text-gray-400 hover:text-white border border-transparent'}
            `}
            title="Save Game"
          >
            {saveStatus === 'saved' ? (
              <span className="text-xs font-bold uppercase tracking-wider animate-pulse">Saved</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
          </button>
        </div>

        {/* AI Goal Panel */}
        <div className={`w-full md:w-80 bg-indigo-900/90 text-white rounded-xl border-2 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.4)] backdrop-blur-md overflow-hidden transition-all ${!aiEnabled ? 'opacity-80 grayscale-[0.5]' : ''} mt-2 md:mt-0`}>
          <div className="bg-indigo-800/80 px-3 md:px-4 py-1.5 md:py-2 flex justify-between items-center border-b border-indigo-600">
            <span className="font-bold uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 shadow-sm">
              {aiEnabled ? (
                <>
                  <span className={`w-2 h-2 rounded-full ${isGeneratingGoal ? 'bg-yellow-400 animate-ping' : 'bg-cyan-400 animate-pulse'}`}></span>
                  AI Advisor
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  Sandbox
                </>
              )}
            </span>
            {isGeneratingGoal && aiEnabled && <span className="text-[10px] animate-pulse text-yellow-300 font-mono">Thinking...</span>}
          </div>
          
          <div className="p-3 md:p-4">
            {aiEnabled ? (
              currentGoal ? (
                <>
                  <p className="text-xs md:text-sm font-medium text-indigo-100 mb-2 md:mb-3 leading-tight drop-shadow">"{currentGoal.description}"</p>
                  
                  <div className="flex justify-between items-center mt-1 md:mt-2 bg-indigo-950/60 p-1.5 md:p-2 rounded-lg border border-indigo-700/50">
                    <div className="text-[10px] md:text-xs text-gray-300">
                      Goal: <span className="font-mono font-bold text-white">
                        {currentGoal.targetType === 'building_count' ? BUILDINGS[currentGoal.buildingType!].name : 
                         currentGoal.targetType === 'money' ? '$' : 'Pop.'} {currentGoal.targetValue}
                      </span>
                    </div>
                    <div className="text-[10px] md:text-xs text-yellow-300 font-bold font-mono bg-yellow-900/50 px-2 py-0.5 rounded border border-yellow-600/50">
                      +${currentGoal.reward}
                    </div>
                  </div>
  
                  {currentGoal.completed && (
                    <button
                      onClick={onClaimReward}
                      className="mt-2 md:mt-3 w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-1.5 md:py-2 px-4 rounded shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all animate-bounce text-xs md:text-sm uppercase tracking-wide border border-green-400/50"
                    >
                      Collect Reward
                    </button>
                  )}
                </>
              ) : (
                <div className="text-xs md:text-sm text-gray-400 py-2 italic flex items-center gap-2">
                  <svg className="animate-spin h-3 w-3 md:h-4 md:w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing city data...
                </div>
              )
            ) : (
              <div className="text-xs md:text-sm text-indigo-200/70 py-1">
                 <p className="mb-1">Free play active.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar: Tools & News */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-end pointer-events-auto mt-auto gap-2 w-full max-w-full">
        
        {/* Toolbar with Tooltip */}
        <div className="relative w-full md:w-auto flex flex-col items-center md:items-start group">
          
          {hoveredTool && (() => {
            const config = BUILDINGS[hoveredTool];
            return (
              <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-950/95 p-3 rounded-lg border border-gray-600 shadow-2xl backdrop-blur-md text-xs z-50 animate-fade-in pointer-events-none">
                 <div className="font-bold text-white text-sm mb-1">{config.name}</div>
                 <div className="text-gray-400 mb-3 italic leading-tight">{config.description}</div>
                 
                 <div className="space-y-1.5">
                    {config.cost > 0 && (
                        <div className="flex justify-between items-center border-b border-gray-800 pb-1">
                            <span className="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Cost</span>
                            <span className="text-red-400 font-mono font-bold text-sm">${config.cost}</span>
                        </div>
                    )}
                    {config.incomeGen > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Income</span>
                            <span className="text-green-400 font-mono font-bold text-sm">+${config.incomeGen}/day</span>
                        </div>
                    )}
                    {config.popGen > 0 && (
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 uppercase text-[10px] font-bold tracking-wider">Pop Growth</span>
                            <span className="text-blue-400 font-mono font-bold text-sm">+{config.popGen}/day</span>
                        </div>
                    )}
                    {config.type === BuildingType.None && (
                        <div className="text-red-400 font-bold flex items-center gap-2">
                           <span>⚠️</span> Clears selected tile
                        </div>
                    )}
                 </div>
                 
                 {/* Arrow pointer */}
                 <div className="absolute top-full left-6 -ml-1 border-8 border-transparent border-t-gray-950/95"></div>
              </div>
            );
          })()}

          <div className="flex gap-1 md:gap-2 bg-gray-900/80 p-1 md:p-2 rounded-2xl border border-gray-600/50 backdrop-blur-xl shadow-2xl w-full md:w-auto overflow-x-auto no-scrollbar justify-start md:justify-start">
            <div className="flex gap-1 md:gap-2 min-w-max px-1">
              {tools.map((type) => (
                <ToolButton
                  key={type}
                  type={type}
                  isSelected={selectedTool === type}
                  onClick={() => onSelectTool(type)}
                  money={stats.money}
                  onMouseEnter={() => setHoveredTool(type)}
                  onMouseLeave={() => setHoveredTool(null)}
                />
              ))}
            </div>
            <div className="text-[8px] text-gray-500 uppercase writing-mode-vertical flex items-center justify-center font-bold tracking-widest border-l border-gray-700 pl-1 ml-1 select-none">Build</div>
          </div>
        </div>

        {/* News Feed */}
        <div className="w-full md:w-80 h-32 md:h-48 bg-black/80 text-white rounded-xl border border-gray-700/80 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden relative">
          <div className="bg-gray-800/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300 border-b border-gray-600 flex justify-between items-center">
            <span>City Feed</span>
            <span className={`w-1.5 h-1.5 rounded-full ${aiEnabled ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
          </div>
          
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30 z-20"></div>
          
          <div ref={newsRef} className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 text-[10px] md:text-xs font-mono scroll-smooth mask-image-b z-10">
            {newsFeed.length === 0 && <div className="text-gray-500 italic text-center mt-10">No active news stream.</div>}
            {newsFeed.map((news) => (
              <div key={news.id} className={`
                border-l-2 pl-2 py-1 transition-all animate-fade-in leading-tight relative
                ${news.type === 'positive' ? 'border-green-500 text-green-200 bg-green-900/20' : ''}
                ${news.type === 'negative' ? 'border-red-500 text-red-200 bg-red-900/20' : ''}
                ${news.type === 'neutral' ? 'border-blue-400 text-blue-100 bg-blue-900/20' : ''}
              `}>
                <span className="opacity-70 text-[8px] absolute top-0.5 right-1">{new Date(Number(news.id.split('.')[0])).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {news.text}
              </div>
            ))}
          </div>
        </div>

      </div>
      
      {/* Credits */}
      <div className="absolute bottom-1 right-2 md:right-4 text-[8px] md:text-[9px] text-white/30 font-mono text-right pointer-events-auto hover:text-white/60 transition-colors">
        <a href="https://x.com/ammaar" target="_blank" rel="noreferrer">Created by @ammaar</a>
      </div>
    </div>
  );
};

export default UIOverlay;