import { stationsConfig } from '@/config/stations';
import { CalculatePriceRequest, CalculatePriceResponse, Station, PublicCalculatePriceRequest } from '@/types';

export class PriceCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PriceCalculationError';
  }
}

export function validateCalculationRequest(request: CalculatePriceRequest): void {
  if (!request.pickupStationId || !request.destinationStationId) {
    throw new PriceCalculationError('Pickup and destination stations are required');
  }

  if (request.volume <= 0 || request.volume > stationsConfig.maxVolume) {
    throw new PriceCalculationError(`Volume must be between 0 and ${stationsConfig.maxVolume.toLocaleString()} m³`);
  }

  if (request.collateral < 0 || request.collateral > stationsConfig.maxCollateral) {
    throw new PriceCalculationError(`Collateral must be between 0 and ${stationsConfig.maxCollateral.toLocaleString()} ISK`);
  }

  const pickupStation = stationsConfig.stations.find(s => s.id === request.pickupStationId);
  const destinationStation = stationsConfig.stations.find(s => s.id === request.destinationStationId);

  if (!pickupStation) {
    throw new PriceCalculationError('Invalid pickup station');
  }

  if (!destinationStation) {
    throw new PriceCalculationError('Invalid destination station');
  }

  const basePrice = stationsConfig.priceMatrix[request.pickupStationId]?.[request.destinationStationId];
  if (basePrice === undefined) {
    throw new PriceCalculationError('Price route not available');
  }
}

export function calculatePrice(request: CalculatePriceRequest): CalculatePriceResponse {
  validateCalculationRequest(request);

  const pickupStation = stationsConfig.stations.find(s => s.id === request.pickupStationId) as Station;
  const destinationStation = stationsConfig.stations.find(s => s.id === request.destinationStationId) as Station;
  
  const pricePerM3 = stationsConfig.priceMatrix[request.pickupStationId]![request.destinationStationId]!;
  const basePrice = pricePerM3 * request.volume;
  const collateralFee = request.collateral * stationsConfig.collateralPercentage;
  const totalPrice = basePrice + collateralFee;

  return {
    basePrice,
    collateralFee,
    totalPrice,
    pickupStation: pickupStation.name,
    destinationStation: destinationStation.name,
    volume: request.volume,
    collateral: request.collateral
  };
}

export function getStationById(stationId: string): Station | undefined {
  return stationsConfig.stations.find(s => s.id === stationId);
}

export function getAllStations(): Station[] {
  return stationsConfig.stations;
}

export function getMaxValues() {
  return {
    maxVolume: stationsConfig.maxVolume,
    maxCollateral: stationsConfig.maxCollateral
  };
}

export function resolveStationFromSystemId(systemId: number): string {
  const stationsInSystem = stationsConfig.stations.filter(s => s.systemId === systemId);
  
  if (stationsInSystem.length === 0) {
    throw new PriceCalculationError(`No stations found in system with ID ${systemId}`);
  }
  
  if (stationsInSystem.length > 1) {
    const systemName = stationsInSystem[0]!.system;
    throw new PriceCalculationError(`Multiple stations found in system ${systemName}. Please specify station ID.`);
  }
  
  return stationsInSystem[0]!.id;
}

export function resolvePublicCalculateRequest(request: PublicCalculatePriceRequest): CalculatePriceRequest {
  let pickupStationId: string;
  let destinationStationId: string;
  
  if (request.pickupStationId) {
    pickupStationId = request.pickupStationId;
  } else if (request.pickupSystemId) {
    pickupStationId = resolveStationFromSystemId(request.pickupSystemId);
  } else {
    throw new PriceCalculationError('Either pickupStationId or pickupSystemId is required');
  }
  
  if (request.destinationStationId) {
    destinationStationId = request.destinationStationId;
  } else if (request.destinationSystemId) {
    destinationStationId = resolveStationFromSystemId(request.destinationSystemId);
  } else {
    throw new PriceCalculationError('Either destinationStationId or destinationSystemId is required');
  }
  
  return {
    pickupStationId,
    destinationStationId,
    volume: request.volume,
    collateral: request.collateral
  };
}