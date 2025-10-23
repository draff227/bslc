import { NextResponse } from 'next/server';
import { stationsConfig } from '@/config/stations';
import { Station } from '@/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle preflight CORS requests
 * @openapi
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

/**
 * Get all available EVE Online stations
 * @description Returns a list of all available space stations for delivery calculations in EVE Online
 * @response Station[]
 * @openapi
 */
export async function GET(): Promise<NextResponse<Station[]>> {
  return NextResponse.json(stationsConfig.stations, { status: 200, headers: corsHeaders });
}