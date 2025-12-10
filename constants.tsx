/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType } from './types';

// Map Settings
export const GRID_SIZE = 15;

// Game Settings
export const TICK_RATE_MS = 2000; // Game loop updates every 2 seconds
export const INITIAL_MONEY = 1500; // Increased starting money for new infrastructure

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: 0,
    name: 'Bulldoze',
    description: 'Clear a tile',
    color: '#ef4444', // Used for UI
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road,
    cost: 10,
    name: 'Road',
    description: 'Connects buildings.',
    color: '#374151', // gray-700
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential,
    cost: 100,
    name: 'House',
    description: '+5 Pop/day',
    color: '#f87171', // red-400
    popGen: 5,
    incomeGen: 0,
    powerUsage: 1,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.MixedUse]: {
    type: BuildingType.MixedUse,
    cost: 350,
    name: 'Mixed Use',
    description: '+Pop & +$$',
    color: '#8b5cf6', // violet-500
    popGen: 8,
    incomeGen: 10,
    powerUsage: 2,
    waterUsage: 2,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial,
    cost: 200,
    name: 'Shop',
    description: '+$15/day',
    color: '#60a5fa', // blue-400
    popGen: 0,
    incomeGen: 15,
    powerUsage: 2,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial,
    cost: 400,
    name: 'Factory',
    description: '+$40/day, Pollutes',
    color: '#facc15', // yellow-400
    popGen: 0,
    incomeGen: 40,
    powerUsage: 5,
    waterUsage: 3,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park,
    cost: 50,
    name: 'Park',
    description: 'Happiness',
    color: '#4ade80', // green-400
    popGen: 1,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
  },
  [BuildingType.PowerPlant]: {
    type: BuildingType.PowerPlant,
    cost: 500,
    name: 'Power Plant',
    description: '+50 Power',
    color: '#ea580c', // orange-600
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 50,
    waterGen: 0,
  },
  [BuildingType.WaterPump]: {
    type: BuildingType.WaterPump,
    cost: 400,
    name: 'Water Pump',
    description: '+50 Water',
    color: '#0ea5e9', // sky-500
    popGen: 0,
    incomeGen: 0,
    powerUsage: 2, // Pumps need power!
    waterUsage: 0,
    powerGen: 0,
    waterGen: 50,
  },
};
