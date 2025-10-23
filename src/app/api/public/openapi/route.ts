import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(): Promise<NextResponse> {
  try {
    const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
    
    if (!fs.existsSync(openapiPath)) {
      return NextResponse.json(
        {
          error: 'OpenAPI schema not found',
          message: 'OpenAPI documentation has not been generated yet. Run `npm run openapi:generate` to generate the schema.',
          statusCode: 404
        },
        { status: 404, headers: corsHeaders }
      );
    }
    
    const openapiContent = fs.readFileSync(openapiPath, 'utf8');
    const serverUrl = process.env.OPENAPI_SERVER_URL || 'http://localhost:3000/api';
    const processedContent = openapiContent.replace(/\{\{OPENAPI_SERVER_URL\}\}/g, serverUrl);
    const openapiSchema = JSON.parse(processedContent);
    
    return NextResponse.json(openapiSchema, { 
      status: 200, 
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error serving OpenAPI schema:', error);
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to load OpenAPI schema',
        statusCode: 500
      },
      { status: 500, headers: corsHeaders }
    );
  }
}