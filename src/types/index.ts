export interface Station {
  id: string;
  name: string;
  system: string;
  systemId: number;
}

export interface PriceMatrix {
  [fromStationId: string]: {
    [toStationId: string]: number;
  };
}

export interface Config {
  stations: Station[];
  priceMatrix: PriceMatrix;
  maxVolume: number;
  maxCollateral: number;
  collateralPercentage: number;
  defaultPickupStation: string;
  defaultDestinationStation: string;
}

export interface CalculatePriceRequest {
  pickupStationId: string;
  destinationStationId: string;
  volume: number;
  collateral: number;
}

export interface PublicCalculatePriceRequest {
  pickupStationId?: string;
  pickupSystemId?: number;
  destinationStationId?: string;
  destinationSystemId?: number;
  volume: number;
  collateral: number;
}

export interface CalculatePriceResponse {
  basePrice: number;
  collateralFee: number;
  totalPrice: number;
  pickupStation: string;
  destinationStation: string;
  volume: number;
  collateral: number;
}

export interface AppraisalRequest {
  itemDescription: string;
  estimatedValue: number;
}

export interface AppraisalResponse {
  itemDescription: string;
  estimatedValue: number;
  appraisedValue: number;
  confidence: number;
  notes: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}