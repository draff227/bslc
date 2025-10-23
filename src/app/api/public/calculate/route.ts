import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice, PriceCalculationError, resolvePublicCalculateRequest } from '@/lib/priceCalculator';
import { PublicCalculatePriceRequest, CalculatePriceResponse, ApiError } from '@/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
 * Calculate delivery price between EVE Online stations
 * @description Calculates the total delivery cost including base price and collateral fee for shipping items between space stations in EVE Online. Supports both station IDs and system IDs.
 * @body PublicCalculatePriceRequest
 * @response CalculatePriceResponse
 * @openapi
 */
export async function POST(request: NextRequest): Promise<NextResponse<CalculatePriceResponse | ApiError>> {
  try {
    const body: PublicCalculatePriceRequest = await request.json();
    
    const resolvedRequest = resolvePublicCalculateRequest(body);
    const result = calculatePrice(resolvedRequest);
    
    return NextResponse.json(result, { status: 200, headers: corsHeaders });
  } catch (error) {
    if (error instanceof PriceCalculationError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: error.message,
          statusCode: 400
        },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.error('Price calculation error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while calculating the price',
        statusCode: 500
      },
      { status: 500, headers: corsHeaders }
    );
  }
}