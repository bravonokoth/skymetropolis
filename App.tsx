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
import { SoundService } from './services/soundService';

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
      
      row.push({ x, y, buildingType: BuildingType.None, health: 100 });
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
      SoundService.playSave();
    } catch (e) {
      console.error("Failed to save game:", e);
      addNewsItem({ id: Date.now().toString(), text: "Save failed! Local storage might be full.", type: 'negative' });
      SoundService.playError();
    }
  }, [newsFeed, addNewsItem]);

  const handleLoadGame = useCallback(() => {
    const saveStr = localStorage.getItem('skymetropolis_save');
    if (saveStr) {
      try {
        const gameState = JSON.parse(saveStr);
        // Restore state - Ensure health property is present for legacy saves
        const loadedGrid = gameState.grid.map((row: TileData[]) => 
             row.map((tile: TileData) => ({ ...tile, health: tile.health ?? 100 }))
        );
        
        setGrid(loadedGrid);
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
        
        SoundService.init();
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
          case BuildingType.Stadium: return budget.environment / 100; // Stadiums affected by environment/rec budget
          case BuildingType.Airport: return budget.infrastructure / 100; // Airports affected by infra budget
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

      // Pass 1: Aggregate Supply/Demand/Maintenance using Grid State
      const currentGrid = gridRef.current;
      currentGrid.flat().forEach(tile => {
        if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          const multiplier = getBudgetMultiplier(tile.buildingType);
          const healthFactor = (tile.health ?? 100) / 100; // 0.0 to 1.0

          // Maintenance (Full cost even if damaged, technically repair needed)
          dailyMaintenance += config.maintenanceCost * multiplier;

          // Output Scaling based on Budget AND Health
          // Damaged buildings produce less
          pSupply += config.powerGen * multiplier * healthFactor;
          wSupply += config.waterGen * multiplier * healthFactor;
          
          eduCapacity += config.educationGen * multiplier * healthFactor;
          healthCapacity += config.healthcareGen * multiplier * healthFactor;
          safetyCapacity += config.safetyGen * multiplier * healthFactor;
          
          // Demand is fixed, doesn't scale with budget (buildings still need power)
          // Maybe damaged buildings need less power? Let's keep it simple.
          pDemand += config.powerUsage;
          wDemand += config.waterUsage;

          gSupply += config.goodsGen * healthFactor; 
          gDemand += config.goodsUsage;
          
          // Traffic Logic
          if (tile.buildingType === BuildingType.Residential || 
              tile.buildingType === BuildingType.Commercial || 
              tile.buildingType === BuildingType.Industrial ||
              tile.buildingType === BuildingType.MixedUse ||
              tile.buildingType === BuildingType.School || 
              tile.buildingType === BuildingType.Hospital ||
              tile.buildingType === BuildingType.Stadium ||
              tile.buildingType === BuildingType.Airport) {
              trafficLoad += 1;
              if (tile.buildingType === BuildingType.Stadium) trafficLoad += 4; // High traffic
              if (tile.buildingType === BuildingType.Airport) trafficLoad += 12; // Very High traffic (Airports are busy)
          }
          
          if (tile.buildingType === BuildingType.Road) {
              roadCapacity += 5 * healthFactor; // Damaged roads support less traffic
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
          currentTrafficCongestion = 100;
      }

      // Pass 2: Calculate Output based on Efficiency
      currentGrid.flat().forEach(tile => {
         if (tile.buildingType !== BuildingType.None) {
          const config = BUILDINGS[tile.buildingType];
          const healthFactor = (tile.health ?? 100) / 100;
          
          // Income requires Utils AND Goods (for commercial) AND Health
          let tileIncome = config.incomeGen * basicUtilEfficiency * healthFactor;
          
          if (config.goodsUsage > 0) {
             tileIncome *= goodsEfficiency;
          }
          
          dailyIncome += tileIncome;
          dailyPopGrowth += config.popGen * basicUtilEfficiency * healthFactor;
         }
      });

      // Cap population
      const resCount = buildingCounts[BuildingType.Residential] || 0;
      const mixedCount = buildingCounts[BuildingType.MixedUse] || 0;
      const totalHousing = (resCount * 50) + (mixedCount * 100); 
      
      // -- Disaster Simulation --
      // Chance of disaster based on conditions
      const pollution = statsRef.current.pollution;
      const weather = statsRef.current.weather;
      
      // Fire Hazard: Higher with pollution and sunny weather
      let fireChance = 0.001; // Base 0.1% per tick
      if (weather === 'sunny') fireChance += 0.002;
      if (pollution > 50) fireChance += 0.003;
      
      // Storm/Flood Hazard: Higher with rain
      let stormChance = 0.001;
      if (weather === 'rainy') stormChance += 0.005;

      // Roll
      const rand = Math.random();
      let disasterOccurred = false;
      let disasterType = '';
      
      if (rand < fireChance) {
          disasterType = 'Fire';
      } else if (rand < fireChance + stormChance) {
          disasterType = 'Storm';
      }

      if (disasterType) {
          // Find target buildings
          const builtTiles = currentGrid.flat().filter(t => t.buildingType !== BuildingType.None && t.buildingType !== BuildingType.Road && (t.health ?? 100) > 0);
          
          if (builtTiles.length > 0) {
              // Pick random center
              const center = builtTiles[Math.floor(Math.random() * builtTiles.length)];
              
              // Damage radius
              const radius = 2;
              const newGrid = currentGrid.map(row => row.map(tile => ({...tile})));
              let hitCount = 0;

              for(let y = Math.max(0, center.y - radius); y <= Math.min(GRID_SIZE-1, center.y + radius); y++) {
                 for(let x = Math.max(0, center.x - radius); x <= Math.min(GRID_SIZE-1, center.x + radius); x++) {
                     const t = newGrid[y][x];
                     if (t.buildingType !== BuildingType.None && (t.health ?? 100) > 0) {
                         // Damage amount
                         const damage = Math.floor(Math.random() * 40) + 20; // 20-60 damage
                         t.health = Math.max(0, (t.health ?? 100) - damage);
                         hitCount++;
                     }
                 }
              }
              
              if (hitCount > 0) {
                  setGrid(newGrid);
                  addNewsItem({
                      id: Date.now().toString(), 
                      text: `DISASTER! ${disasterType} struck at ${center.x},${center.y}. ${hitCount} buildings damaged!`, 
                      type: 'negative'
                  });
                  disasterOccurred = true;
                  SoundService.playDisaster();
              }
          }
      }

      // 2. Update Stats
      setStats(prev => {
        let newPop = prev.population + dailyPopGrowth;
        if (newPop > totalHousing) newPop = totalHousing; 
        if (totalHousing === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5);
        newPop = Math.floor(newPop);

        // -- Pollution --
        const indCount = buildingCounts[BuildingType.Industrial] || 0;
        const powerCount = buildingCounts[BuildingType.PowerPlant] || 0;
        const airportCount = buildingCounts[BuildingType.Airport] || 0;
        const parkCount = buildingCounts[BuildingType.Park] || 0;
        
        // Airports create significant pollution (noise, jet fuel)
        let currentPollution = (indCount * 10) + (powerCount * 5) + (airportCount * 20) - (parkCount * 5);
        currentPollution = Math.max(0, Math.min(100, currentPollution));

        // -- Services --
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
        const stadiumCount = buildingCounts[BuildingType.Stadium] || 0;
        
        // Split bonuses: Parks provide Environment happiness, Stadiums provide Entertainment happiness
        const parkBonus = Math.min(parkCount * 5, 20); // Cap park happiness
        const entertainmentBonus = Math.min(stadiumCount * 15, 30); // Cap entertainment happiness
        newHappiness += (parkBonus + entertainmentBonus);
        
        newHappiness -= Math.floor(currentPollution * 0.8);
        
        if (totalHousing > 0 && newPop > totalHousing * 0.9) newHappiness -= 15;
        if (totalHousing === 0 && newPop > 0) newHappiness = 10;

        if (powerEfficiency < 1) newHappiness -= 20 * (1 - powerEfficiency);
        if (waterEfficiency < 1) newHappiness -= 20 * (1 - waterEfficiency);
        
        if (eduCov < 50) newHappiness -= 15 * (1 - eduCov/50);
        else if (eduCov > 80) newHappiness += 5;
        
        if (healthCov < 50) newHappiness -= 20 * (1 - healthCov/50);
        else if (healthCov > 80) newHappiness += 5;

        if (safetyCov < 50) newHappiness -= 15 * (1 - safetyCov/50);
        else if (safetyCov > 90) newHappiness += 5;

        if (goodsEfficiency < 0.5) newHappiness -= 5;

        if (currentTrafficCongestion > 60) {
            newHappiness -= Math.floor((currentTrafficCongestion - 60) * 0.5);
        }

        if (prev.money > 2000) newHappiness += 5;

        if (prev.weather === 'rainy') newHappiness -= 2;
        if (prev.weather === 'sunny') newHappiness += 2;
        if (prev.weather === 'snowy') newHappiness -= 1;
        
        // Disaster unhappiness penalty
        if (disasterOccurred) newHappiness -= 10;

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

      if (!disasterOccurred) fetchNews();

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

    // Repair Logic: Click damaged building with non-bulldoze tool
    if (currentTile.buildingType !== BuildingType.None && tool !== BuildingType.None && (currentTile.health ?? 100) < 100) {
        // Only allow repair if same type OR just allow general repair? 
        // Prompt implies "intervention". General repair is friendlier.
        // Cost: 50% of original cost
        const repairCost = Math.floor(BUILDINGS[currentTile.buildingType].cost * 0.5);
        
        if (currentStats.money >= repairCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, health: 100 };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - repairCost }));
            addNewsItem({id: Date.now().toString(), text: "Building repaired.", type: 'neutral'});
            SoundService.playBuild();
        } else {
            addNewsItem({id: Date.now().toString(), text: "Insufficient funds for repairs.", type: 'negative'});
            SoundService.playError();
        }
        return;
    }

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 5;
        if (currentStats.money >= demolishCost) {
            const newGrid = currentGrid.map(row => [...row]);
            newGrid[y][x] = { ...currentTile, buildingType: BuildingType.None, variant: 0, health: 100 };
            setGrid(newGrid);
            setStats(prev => ({ ...prev, money: prev.money - demolishCost }));
            SoundService.playBulldoze();
        } else {
            addNewsItem({id: Date.now().toString(), text: "Cannot afford demolition costs.", type: 'negative'});
            SoundService.playError();
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

       const upgradeCost = 50; 
       if (currentStats.money >= upgradeCost) {
          const newGrid = currentGrid.map(row => [...row]);
          newGrid[y][x] = { ...currentTile, variant: newVariant };
          setGrid(newGrid);
          setStats(prev => ({ ...prev, money: prev.money - upgradeCost }));
          addNewsItem({id: Date.now().toString(), text: `Upgraded to ${variantName}`, type: 'neutral'});
          SoundService.playBuild();
       } else {
          addNewsItem({id: Date.now().toString(), text: "Insufficient funds for road upgrade.", type: 'negative'});
          SoundService.playError();
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
        newGrid[y][x] = { ...currentTile, buildingType: tool, variant: 0, health: 100 };
        setGrid(newGrid);
        SoundService.playBuild();
      } else {
        // Not enough money feedback
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Treasury insufficient for ${buildingConfig.name}.`, type: 'negative'});
        SoundService.playError();
      }
    }
  }, [selectedTool, addNewsItem, gameStarted]);

  const handleClaimReward = () => {
    if (currentGoal && currentGoal.completed) {
      setStats(prev => ({ ...prev, money: prev.money + currentGoal.reward }));
      addNewsItem({id: Date.now().toString(), text: `Goal achieved! ${currentGoal.reward} deposited to treasury.`, type: 'positive'});
      setCurrentGoal(null);
      SoundService.playMoney();
    }
  };

  const handleStart = (enabled: boolean) => {
    SoundService.init();
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