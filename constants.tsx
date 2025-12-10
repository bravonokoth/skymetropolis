/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType } from './types';

// Map Settings
export const GRID_SIZE = 15;

// Game Settings
export const TICK_RATE_MS = 2000; // Game loop updates every 2 seconds
export const INITIAL_MONEY = 25000; // Increased starting money for new infrastructure

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: 0,
    maintenanceCost: 0,
    name: 'Bulldoze',
    description: 'Clear a tile',
    color: '#ef4444', // Used for UI
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.Road]: {
    type: BuildingType.Road,
    cost: 10,
    maintenanceCost: 1, // Roads cost upkeep
    name: 'Road',
    description: 'Connects buildings.',
    color: '#374151', // gray-700
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.Residential]: {
    type: BuildingType.Residential,
    cost: 100,
    maintenanceCost: 0,
    name: 'House',
    description: '+5 Pop/day',
    color: '#f87171', // red-400
    popGen: 5,
    incomeGen: 0,
    powerUsage: 1,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.MixedUse]: {
    type: BuildingType.MixedUse,
    cost: 350,
    maintenanceCost: 0,
    name: 'Mixed Use',
    description: '+Pop & +$$',
    color: '#8b5cf6', // violet-500
    popGen: 8,
    incomeGen: 10,
    powerUsage: 2,
    waterUsage: 2,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 2, // Consumes goods
    safetyGen: 0,
  },
  [BuildingType.Commercial]: {
    type: BuildingType.Commercial,
    cost: 200,
    maintenanceCost: 0,
    name: 'Shop',
    description: '+$15/day',
    color: '#60a5fa', // blue-400
    popGen: 0,
    incomeGen: 15,
    powerUsage: 2,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 3, // Needs goods to sell
    safetyGen: 0,
  },
  [BuildingType.Industrial]: {
    type: BuildingType.Industrial,
    cost: 400,
    maintenanceCost: 0,
    name: 'Factory',
    description: '+$40/day, Pollutes',
    color: '#facc15', // yellow-400
    popGen: 0,
    incomeGen: 40,
    powerUsage: 5,
    waterUsage: 3,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 10, // Produces goods
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.Park]: {
    type: BuildingType.Park,
    cost: 50,
    maintenanceCost: 2, // Gardening upkeep
    name: 'Park',
    description: 'Happiness',
    color: '#4ade80', // green-400
    popGen: 1,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.PowerPlant]: {
    type: BuildingType.PowerPlant,
    cost: 500,
    maintenanceCost: 20,
    name: 'Power Plant',
    description: '+50 Power',
    color: '#ea580c', // orange-600
    popGen: 0,
    incomeGen: 0,
    powerUsage: 0,
    waterUsage: 0,
    powerGen: 50,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.WaterPump]: {
    type: BuildingType.WaterPump,
    cost: 400,
    maintenanceCost: 15,
    name: 'Water Pump',
    description: '+50 Water',
    color: '#0ea5e9', // sky-500
    popGen: 0,
    incomeGen: 0,
    powerUsage: 2, // Pumps need power!
    waterUsage: 0,
    powerGen: 0,
    waterGen: 50,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 0,
    safetyGen: 0,
  },
  [BuildingType.School]: {
    type: BuildingType.School,
    cost: 600,
    maintenanceCost: 25,
    name: 'School',
    description: 'Education Service',
    color: '#fcd34d', // amber-300
    popGen: 0,
    incomeGen: 0,
    powerUsage: 3,
    waterUsage: 2,
    powerGen: 0,
    waterGen: 0,
    educationGen: 100, // Serves 100 people
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 1, // Supplies
    safetyGen: 0,
  },
  [BuildingType.Hospital]: {
    type: BuildingType.Hospital,
    cost: 800,
    maintenanceCost: 40,
    name: 'Hospital',
    description: 'Healthcare Service',
    color: '#fecaca', // red-200 (white/red mix)
    popGen: 0,
    incomeGen: 0,
    powerUsage: 5,
    waterUsage: 3,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 150, // Serves 150 people
    goodsGen: 0,
    goodsUsage: 2, // Medical supplies
    safetyGen: 0,
  },
  [BuildingType.PoliceStation]: {
    type: BuildingType.PoliceStation,
    cost: 700,
    maintenanceCost: 30,
    name: 'Police Station',
    description: 'Safety & Security',
    color: '#3b82f6', // blue-500
    popGen: 0,
    incomeGen: 0,
    powerUsage: 3,
    waterUsage: 1,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 1,
    safetyGen: 200, // Protects 200 people
  },
};