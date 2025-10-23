import { NextRequest, NextResponse } from 'next/server';
import { calculatePrice, PriceCalculationError } from '@/lib/priceCalculator';
import { CalculatePriceRequest, CalculatePriceResponse, ApiError } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<CalculatePriceResponse | ApiError>> {
  try {
    const body: CalculatePriceRequest = await request.json();
    
    const result = calculatePrice(body);
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof PriceCalculationError) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: error.message,
          statusCode: 400
        },
        { status: 400 }
      );
    }
    
    console.error('Price calculation error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred while calculating the price',
        statusCode: 500
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<{ message: string }>> {
  return NextResponse.json(
    { message: 'Use POST method to calculate delivery price' },
    { status: 405 }
  );
}