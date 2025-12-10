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
    color: '#1f2937', // Darker Asphalt
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
    name: 'Estate',
    description: '+5 Pop/day',
    color: '#ea580c', // Orange-600 (Terracotta roofs)
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
    name: 'Flats & Shops',
    description: '+Pop & +$$',
    color: '#7c3aed', // Violet-600
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
    name: 'Plaza',
    description: '+$15/day',
    color: '#2563eb', // Blue-600
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
    name: 'Plant',
    description: '+$40/day, Pollutes',
    color: '#ca8a04', // Yellow-600 (Darker industrial gold)
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
    name: 'Uhuru Park',
    description: 'Happiness',
    color: '#16a34a', // Green-600
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
    name: 'Geothermal',
    description: '+50 Power',
    color: '#b91c1c', // Red-700
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
    name: 'Borehole',
    description: '+50 Water',
    color: '#0891b2', // Cyan-600
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
    name: 'Academy',
    description: 'Education Service',
    color: '#d97706', // Amber-600
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
    color: '#f43f5e', // Rose-500
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
    name: 'Police Post',
    description: 'Safety & Security',
    color: '#1e3a8a', // Blue-900
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
  [BuildingType.Stadium]: {
    type: BuildingType.Stadium,
    cost: 3000,
    maintenanceCost: 100,
    name: 'Stadium',
    description: 'Major Entertainment',
    color: '#059669', // Emerald-600
    popGen: 0,
    incomeGen: 60,
    powerUsage: 15,
    waterUsage: 10,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 0,
    goodsUsage: 5, // Consumes goods (concessions)
    safetyGen: 0,
  },
  [BuildingType.Airport]: {
    type: BuildingType.Airport,
    cost: 8000,
    maintenanceCost: 250,
    name: 'Airport',
    description: 'Global Trade Hub',
    color: '#64748b', // Slate-500
    popGen: 0,
    incomeGen: 300,
    powerUsage: 30,
    waterUsage: 10,
    powerGen: 0,
    waterGen: 0,
    educationGen: 0,
    healthcareGen: 0,
    goodsGen: 50, // Imports goods
    goodsUsage: 0,
    safetyGen: 0,
  },
};