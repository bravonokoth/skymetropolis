/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
export enum BuildingType {
  None = 'None',
  Road = 'Road',
  Residential = 'Residential',
  Commercial = 'Commercial',
  Industrial = 'Industrial',
  Park = 'Park',
  PowerPlant = 'PowerPlant',
  WaterPump = 'WaterPump',
  MixedUse = 'MixedUse',
  School = 'School',
  Hospital = 'Hospital',
  PoliceStation = 'PoliceStation',
}

export interface BuildingConfig {
  type: BuildingType;
  cost: number;
  maintenanceCost: number; // Cost per tick to run
  name: string;
  description: string;
  color: string; // Main color for 3D material
  popGen: number; // Population generation per tick
  incomeGen: number; // Money generation per tick
  powerUsage: number;
  waterUsage: number;
  powerGen: number;
  waterGen: number;
  educationGen: number; // Student capacity
  healthcareGen: number; // Patient capacity
  goodsGen: number; // Goods Produced
  goodsUsage: number; // Goods Consumed
  safetyGen: number; // Safety/Crime Prevention provided
}

export interface TileData {
  x: number;
  y: number;
  buildingType: BuildingType;
  // Suggested by AI for visual variety later
  variant?: number;
}

export type Grid = TileData[][];

export type WeatherType = 'sunny' | 'rainy' | 'snowy';

export interface BudgetAllocation {
  infrastructure: number; // Roads
  power: number;
  water: number;
  education: number;
  healthcare: number;
  safety: number;
  environment: number; // Parks
}

export interface CityStats {
  money: number;
  population: number;
  day: number;
  happiness: number;
  pollution: number;
  weather: WeatherType;
  powerSupply: number;
  powerDemand: number;
  waterSupply: number;
  waterDemand: number;
  educationCoverage: number; // 0-100%
  healthcareCoverage: number; // 0-100%
  goodsSupply: number;
  goodsDemand: number;
  safetyCoverage: number; // 0-100%
  budget: BudgetAllocation;
}

export interface AIGoal {
  description: string;
  targetType: 'population' | 'money' | 'building_count';
  targetValue: number;
  buildingType?: BuildingType; // If target is building_count
  reward: number;
  completed: boolean;
}

export interface NewsItem {
  id: string;
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}