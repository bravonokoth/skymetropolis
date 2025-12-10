/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Grid, TileData, BuildingType, CityStats, AIGoal, NewsItem, WeatherType } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_MONEY } from './constants';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { generateCityGoal, generateNewsEvent } from './services/geminiService';

// Initialize empty grid with island shape generation for 3D visual interest
const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const center = GRID_SIZE / 2;
  // const radius = GRID_SIZE / 2 - 1;

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      // Simple circle crop for island look
      const dist = Math.sqrt((x-center)*(x-center) + (y-center)*(y-center));
      
      row.push({ x, y, buildingType: BuildingType.None });
    }
    grid.push(row);
  }
  return grid;
};

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);

  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>({ 
    money: INITIAL_MONEY, 
    population: 0, 
    day: 1, 
    happiness: 100,
    pollution: 0,
    weather: 'sunny',
    powerSupply: 0,
    powerDemand: 0,
    waterSupply: 0,
    waterDemand: 0,
    educationCoverage: 100,
    healthcareCoverage: 100,
    goodsSupply: 0,
    goodsDemand: 0,
    safetyCoverage: 100,
    trafficCongestion: 0,
    budget: {
      infrastructure: 100,
      power: 100,
      water: 100,
      education: 100,
      healthcare: 100,
      safety: 100,
      environment: 100
    }
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Road);
  
  // --- AI State ---
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  
  // Refs for accessing state inside intervals without dependencies
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const goalRef = useRef(currentGoal);
  const aiEnabledRef = useRef(aiEnabled);

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { goalRef.current = currentGoal; }, [currentGoal]);
  useEffect(() => { aiEnabledRef.current = aiEnabled; }, [aiEnabled]);

  // --- AI Logic Wrappers ---

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed(prev => [...prev.slice(-12), item]); // Keep last few
  }, []);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabledRef.current) return;
    setIsGeneratingGoal(true);
    
    // Short delay for visual effect
    await new Promise(r => setTimeout(r, 1000));
    
    const newGoal = await generateCityGoal(statsRef.current, gridRef.current);
    if (newGoal) {
      setCurrentGoal(newGoal);
    }
    // If failed, currentGoal remains null, and the monitoring effect will retry later
    
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal]); 

  const fetchNews = useCallback(async () => {
    // chance to fetch news per tick
    if (!aiEnabledRef.current || Math.random() > 0.15) return; 
    const news = await generateNewsEvent(statsRef.current, null);
    if (news) addNewsItem(news);
  }, [addNewsItem]);

  // --- Persistence Logic ---

  const handleSaveGame = useCallback(() => {
    const gameState = {
      grid: gridRef.current,
      stats: statsRef.current,
      currentGoal: goalRef.current,
      newsFeed,
      aiEnabled: aiEnabledRef.current,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem('skymetropolis_save', JSON.stringify(gameState));
    } catch (e) {
      console.error("Failed to save game:", e);
      addNewsItem({ id: Date.now().toString(), text: "Save failed! Local storage might be full.", type: 'negative' });
    }
  }, [newsFeed, addNewsItem]);

  const handleLoadGame = useCallback(() => {
    const saveStr = localStorage.getItem('skymetropolis_save');
    if (saveStr) {
      try {
        const gameState = JSON.parse(saveStr);
        // Restore state
        setGrid(gameState.grid);
        // Ensure properties exist for older saves
        setStats({ 
          ...gameState.stats, 
          happiness: gameState.stats.happiness ?? 100,
          pollution: gameState.stats.pollution ?? 0,
          weather: gameState.stats.weather ?? 'sunny',
          powerSupply: gameState.stats.powerSupply ?? 0,
          powerDemand: gameState.stats.powerDemand ?? 0,
          waterSupply: gameState.stats.waterSupply ?? 0,
          waterDemand: gameState.stats.waterDemand ?? 0,
          educationCoverage: gameState.stats.educationCoverage ?? 100,
          healthcareCoverage: gameState.stats.healthcareCoverage ?? 100,
          goodsSupply: gameState.stats.goodsSupply ?? 0,
          goodsDemand: gameState.stats.goodsDemand ?? 0,
          safetyCoverage: gameState.stats.safetyCoverage ?? 100,
          trafficCongestion: gameState.stats.trafficCongestion ?? 0,
          budget: gameState.stats.budget || {
            infrastructure: 100,
            power: 100,
            water: 100,
            education: 100,
            healthcare: 100,
            safety: 100,
            environment: 100
          }
        });
        setCurrentGoal(gameState.currentGoal);
        setNewsFeed(gameState.newsFeed);
        setAiEnabled(gameState.aiEnabled);
        
        // Start game
        setGameStarted(true);
        addNewsItem({ id: Date.now().toString(), text: `Game loaded. Welcome back, Mayor!`, type: 'positive' });
      } catch (e) {
        console.error("Failed to load save:", e);
      }
    }
  }, [addNewsItem]);

  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;

    if (newsFeed.length === 0) {
       addNewsItem({ id: Date.now().toString(), text: "Welcome to SkyMetropolis. Zoning approved.", type: 'positive' });
    }
    // Note: Goal fetching is now handled by the dedicated monitoring effect below
  }, [gameStarted, newsFeed.length, addNewsItem]);

  // --- AI Goal Monitoring ---
  // Periodically check if we need a new goal
  useEffect(() => {
    if (gameStarted && aiEnabled && !currentGoal && !isGeneratingGoal) {
      // Wait a moment before fetching to allow for transitions/animations
      const timer = setTimeout(() => {
        fetchNewGoal();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [gameStarted, aiEnabled, currentGoal, isGeneratingGoal, fetchNewGoal]);

  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;

    const intervalId = setInterval(() => {
      // 1. Calculate Util & Income/Pop & Maintenance
      let dailyIncome = 0;
      let dailyMaintenance = 0;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};
      
      const budget = statsRef.current.budget;

      // Budget Multipliers
      const getBudgetMultiplier = (type: BuildingType) => {
        switch(type) {
          case BuildingType.Road: return budget.infrastructure / 100;
          case BuildingType.PowerPlant: return budget.power / 100;
          case BuildingType.WaterPump: return budget.water / 100;
          case BuildingType.School: return budget.education / 100;
          case BuildingType.Hospital: return budget.healthcare / 100;
          case BuildingType.PoliceStation: return budget.safety / 100;
          case BuildingType.Park: return budget.environment / 100;
          default: return 1;
        }
      };
      
      let pSupply = 0;
      let wSupply = 0;
      let pDemand = 0;
      let wDemand = 0;
      
      let eduCapacity = 0;
      let healthCapacity = 0;
      let safetyCapacity = 0;
      
      let gSupply = 0;
      let gDemand = 0;

      let trafficLoad = 0;
      let roadCapacity = 0;

      // Pass 1: Aggregate Supply/Demand/Maintenance
      gridRef.current.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          const multiplier = getBudgetMultiplier(tile.buildingType);

          // Maintenance
          dailyMaintenance += config.maintenanceCost * multiplier;

          // Utility Output Scaling based on Budget
          pSupply += config.powerGen * multiplier;
          wSupply += config.waterGen * multiplier;
          
          eduCapacity += config.educationGen * multiplier;
          healthCapacity += config.healthcareGen * multiplier;
          safetyCapacity += config.safetyGen * multiplier;
          
          // Demand is fixed, doesn't scale with budget (buildings still need power)
          pDemand += config.powerUsage;
          wDemand += config.waterUsage;

          gSupply += config.goodsGen; 
          gDemand += config.goodsUsage;
          
          // Traffic Logic
          // Residential, Commercial, Industrial, MixedUse, School, Hospital generate traffic
          if (tile.buildingType === BuildingType.Residential || 
              tile.buildingType === BuildingType.Commercial || 
              tile.buildingType === BuildingType.Industrial ||
              tile.buildingType === BuildingType.MixedUse ||
              tile.buildingType === BuildingType.School || 
              tile.buildingType === BuildingType.Hospital) {
              trafficLoad += 1;
          }
          
          // Roads provide capacity
          if (tile.buildingType === BuildingType.Road) {
              // Elevated roads/Overpasses might provide better flow conceptually, 
              // but for now simple count.
              roadCapacity += 5; // Each road tile supports 5 units of traffic comfortably
          }

          buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;
        }
      });

      // Calculate Efficiency (0.0 - 1.0)
      const powerEfficiency = pDemand > 0 ? Math.min(1, pSupply / pDemand) : 1;
      const waterEfficiency = wDemand > 0 ? Math.min(1, wSupply / wDemand) : 1;
      const goodsEfficiency = gDemand > 0 ? Math.min(1, gSupply / gDemand) : 1;
      
      const basicUtilEfficiency = (powerEfficiency + waterEfficiency) / 2;

      // Calculate Traffic Congestion
      let currentTrafficCongestion = 0;
      if (roadCapacity > 0) {
          currentTrafficCongestion = Math.min(100, (trafficLoad / roadCapacity) * 100);
      } else if (trafficLoad > 0) {
          currentTrafficCongestion = 100; // Gridlock if no roads
      }

      // Pass 2: Calculate Output based on Efficiency
      gridRef.current.flat().forEach(tile => {
         if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          // Income requires Utils AND Goods (for commercial)
          let tileIncome = config.incomeGen * basicUtilEfficiency;
          
          // Commercial/MixedUse suffer if goods are low
          if (config.goodsUsage > 0) {
             tileIncome *= goodsEfficiency;
          }
          
          dailyIncome += tileIncome;
          dailyPopGrowth += config.popGen * basicUtilEfficiency;
         }
      });

      // Cap population
      const resCount = buildingCounts[BuildingType.Residential] || 0;
      const mixedCount = buildingCounts[BuildingType.MixedUse] || 0;
      const totalHousing = (resCount * 50) + (mixedCount * 100); 
      
      // 2. Update Stats
      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > totalHousing) newPop = totalHousing; 
        if (totalHousing === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5);
        newPop = Math.floor(newPop);

        // -- Pollution --
        const indCount = buildingCounts[BuildingType.Industrial] || 0;
        const powerCount = buildingCounts[BuildingType.PowerPlant] || 0;
        const parkCount = buildingCounts[BuildingType.Park] || 0;
        
        let currentPollution = (indCount * 10) + (powerCount * 5) - (parkCount * 5);
        currentPollution = Math.max(0, Math.min(100, currentPollution));

        // -- Services (Education & Healthcare & Safety) Coverage --
        // Base coverage is 100 if pop is 0
        let eduCov = 100;
        let healthCov = 100;
        let safetyCov = 100;

        if (newPop > 0) {
            eduCov = Math.min(100, (eduCapacity / newPop) * 100);
            healthCov = Math.min(100, (healthCapacity / newPop) * 100);
            safetyCov = Math.min(100, (safetyCapacity / newPop) * 100);
        }

        // -- Happiness --
        let newHappiness = 60; // Base
        
        // Modifiers
        newHappiness += Math.min(parkCount * 5, 30); // Parks up to +30
        newHappiness -= Math.floor(currentPollution * 0.8); // Pollution penalty
        
        if (totalHousing > 0 && newPop > totalHousing * 0.9) newHappiness -= 15; // Overcrowding
        if (totalHousing === 0 && newPop > 0) newHappiness = 10; // Homelessness

        // Utility Penalties
        if (powerEfficiency < 1) newHappiness -= 20 * (1 - powerEfficiency);
        if (waterEfficiency < 1) newHappiness -= 20 * (1 - waterEfficiency);
        
        // Service Satisfaction Penalties/Bonuses
        if (eduCov < 50) newHappiness -= 15 * (1 - eduCov/50);
        else if (eduCov > 80) newHappiness += 5;
        
        if (healthCov < 50) newHappiness -= 20 * (1 - healthCov/50); // Health is critical
        else if (healthCov > 80) newHappiness += 5;

        // Safety impact
        if (safetyCov < 50) newHappiness -= 15 * (1 - safetyCov/50); // Crime rampant
        else if (safetyCov > 90) newHappiness += 5;

        // Supply chain happiness
        if (goodsEfficiency < 0.5) newHappiness -= 5; // Shortages

        // Traffic Penalty
        if (currentTrafficCongestion > 60) {
            newHappiness -= Math.floor((currentTrafficCongestion - 60) * 0.5);
        }

        // Wealth bonus
        if (prev.money > 2000) newHappiness += 5;

        // Weather
        if (prev.weather === 'rainy') newHappiness -= 2;
        if (prev.weather === 'sunny') newHappiness += 2;
        if (prev.weather === 'snowy') newHappiness -= 1;

        newHappiness = Math.max(0, Math.min(100, Math.floor(newHappiness)));

        // -- Weather Update --
        let currentWeather = prev.weather;
        if (Math.random() < 0.05) {
            const rand = Math.random();
            if (rand < 0.6) currentWeather = 'sunny';
            else if (rand < 0.85) currentWeather = 'rainy';
            else currentWeather = 'snowy';
        }
        
        const netIncome = dailyIncome - dailyMaintenance;

        const newStats = {
          ...prev, 
          money: prev.money + netIncome,
          population: newPop,
          day: prev.day + 1,
          happiness: newHappiness,
          pollution: currentPollution,
          weather: currentWeather,
          powerSupply: pSupply,
          powerDemand: pDemand,
          waterSupply: wSupply,
          waterDemand: wDemand,
          educationCoverage: Math.floor(eduCov),
          healthcareCoverage: Math.floor(healthCov),
          goodsSupply: gSupply,
          goodsDemand: gDemand,
          safetyCoverage: Math.floor(safetyCov),
          trafficCongestion: Math.floor(currentTrafficCongestion),
        };
        
        // 3. Check Goal Completion
        const goal = goalRef.current;
        if (aiEnabledRef.current && goal && !goal.completed) {
          let isMet = false;
          if (goal.targetType === 'money' && newStats.money >= goal.targetValue) isMet = true;
          if (goal.targetType === 'population' && newStats.population >= goal.targetValue) isMet = true;
          if (goal.targetType === 'building_count' && goal.buildingType) {
            if ((buildingCounts[goal.buildingType] || 0) >= goal.targetValue) isMet = true;
          }

          if (isMet) {
            setCurrentGoal({ ...goal, completed: true });
          }
        }

        return newStats;
      });

      fetchNews();

    }, TICK_RATE_MS);

    return () => clearInterval(intervalId);
  }, [fetchNews, gameStarted]);


  // --- Interaction Logic ---

  const handleTileClick = useCallback((x: number, y: number) => {
    if (!gameStarted) return; 

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool; 
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    const currentTile = currentGrid[y][x];
    const buildingConfig = BUILDINGS[tool];

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None, variant: 0 };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
        } else {
            addNewsItem({id: Date.now().toString(), text: "Cannot afford demolition costs.", type: 'negative'});
        }
      }
      return;
    }

    // Special Road Logic: Upgrade to Bridge/Overpass
    if (tool === BuildingType.Road && currentTile.buildingType === BuildingType.Road) {
       // Cycle through variants: 0 (Ground) -> 1 (Bridge) -> 2 (Overpass NS) -> 3 (Overpass EW) -> 0
       const newVariant = ((currentTile.variant || 0) + 1) % 4;
       
       let variantName = "Elevated Road";
       if (newVariant === 0) variantName = "Ground Road";
       if (newVariant === 2 || newVariant === 3) variantName = "Intersection Bridge";

       const upgradeCost = 50; // Flat fee for infrastructure upgrade
       if (currentStats.money >= upgradeCost) {
          const newGrid = currentGrid.map(row => [...row]);
          newGrid[y][x] = { ...currentTile, variant: newVariant };
          setGrid(newGrid);
          setStats(prev => ({ ...prev, money: prev.money - upgradeCost }));
          addNewsItem({id: Date.now().toString(), text: `Upgraded to ${variantName}`, type: 'neutral'});
       } else {
          addNewsItem({id: Date.now().toString(), text: "Insufficient funds for road upgrade.", type: 'negative'});
       }
       return;
    }

    // Placement Logic
    if (currentTile.buildingType === BuildingType.None) {
      if (currentStats.money >= buildingConfig.cost) {
        // Deduct cost
        setStats(prev => ({ ...prev, money: prev.money - buildingConfig.cost }));
        
        // Place building
        const newGrid = currentGrid.map(row => [...row]);
        newGrid[y][x] = { ...currentTile, buildingType: tool, variant: 0 };
        setGrid(newGrid);
      } else {
        // Not enough money feedback
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Treasury insufficient for ${buildingConfig.name}.`, type: 'negative'});
      }
    }
  }, [selectedTool, addNewsItem, gameStarted]);

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({id: Date.now().toString(), text: `Goal achieved! ${currentGoal.reward} deposited to treasury.`, type: 'positive'});
      // Reset goal to null. The monitoring effect will pick this up and fetch a new goal automatically.
      setCurrentGoal(null);
    }
  };

  const handleStart = (enabled: boolean) => {
    setAiEnabled(enabled);
    setGameStarted(true);
  };
  
  const handleBudgetChange = (category: keyof typeof stats.budget, value: number) => {
    setStats(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        [category]: value
      }
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden selection:bg-transparent selection:text-transparent bg-sky-900">
      {/* 3D Rendering Layer */}
      <IsoMap 
        grid={grid} 
        onTileClick={handleTileClick} 
        hoveredTool={selectedTool}
        population={stats.population}
        weather={stats.weather}
        happiness={stats.happiness}
        congestion={stats.trafficCongestion}
      />
      
      {/* Start Screen Overlay */}
      {!gameStarted && (
        <StartScreen onStart={handleStart} onLoad={handleLoadGame} />
      )}

      {/* UI Layer */}
      {gameStarted && (
        <UIOverlay
          stats={stats}
          selectedTool={selectedTool}
          onSelectTool={setSelectedTool}
          currentGoal={currentGoal}
          newsFeed={newsFeed}
          onClaimReward={handleClaimReward}
          isGeneratingGoal={isGeneratingGoal}
          aiEnabled={aiEnabled}
          onSave={handleSaveGame}
          onBudgetChange={handleBudgetChange}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        
        .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }
        
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }
        
        /* Range Slider Styling */
        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          margin-top: -6px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-runnable-track {
          width: 100%;
          height: 4px;
          cursor: pointer;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

export default App;