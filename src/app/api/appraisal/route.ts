import { NextRequest, NextResponse } from 'next/server';
import { AppraisalRequest, AppraisalResponse, ApiError } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<AppraisalResponse | ApiError>> {
  try {
    const body: AppraisalRequest = await request.json();
    
    if (!body.itemDescription || body.estimatedValue < 0) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Item description is required and estimated value must be non-negative',
          statusCode: 400
        },
        { status: 400 }
      );
    }
    
    const appraisedValue = Math.round(body.estimatedValue * (0.85 + Math.random() * 0.3));
    const confidence = Math.round(75 + Math.random() * 20);
    
    const result: AppraisalResponse = {
      itemDescription: body.itemDescription,
      estimatedValue: body.estimatedValue,
      appraisedValue,
      confidence,
      notes: `Appraisal based on current market conditions. Confidence level: ${confidence}%`
    };
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Appraisal error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during appraisal',
        statusCode: 500
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<{ message: string }>> {
  return NextResponse.json(
    { message: 'Use POST method to request an appraisal' },
    { status: 405 }
  );
}