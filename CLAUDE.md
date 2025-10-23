# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an EVE Online delivery cost calculator built with Next.js 15, TypeScript, and Tailwind CSS. The app calculates shipping costs between space stations based on volume-based pricing and collateral fees.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`
- **Generate OpenAPI documentation**: `npm run openapi:generate`

All commands use dotenv-cli to load environment variables from `.env.local` and `.env` files. The project uses Turbopack for faster builds.

## Architecture

### Core Components
- **DeliveryCalculator** (`src/components/DeliveryCalculator.tsx`): Main UI component with Choices.js integration for searchable station dropdowns, real-time price calculation, and clipboard functionality
- **Station Configuration** (`src/config/stations.ts`): Central configuration for all stations, pricing matrix, and system limits (maxVolume: 345,000 m³, maxCollateral: 2.5B ISK)
- **Price Calculator** (`src/lib/priceCalculator.ts`): Business logic for price calculations and validation with custom error handling
- **Rate Limiter** (`src/lib/rateLimiter.ts`): Sliding window rate limiting implementation for public APIs
- **Types** (`src/types/index.ts`): TypeScript interfaces for all data structures

### API Endpoints

#### Internal APIs (origin-protected)
- **POST /api/calculate-price**: Calculates delivery costs based on pickup/destination stations, volume, and collateral
- **POST /api/appraisal**: Mock item appraisal endpoint (demonstration purposes)

#### Public APIs (rate-limited)
- **POST /api/public/calculate**: Public endpoint for price calculations with rate limiting
- **GET /api/public/stations**: Returns list of all available stations
- **GET /api/public/openapi**: Returns OpenAPI specification
- **GET /api/public/swagger**: Serves Swagger UI for API documentation

### Security & Middleware
- **Origin Protection**: Internal APIs require requests from allowed origins (set via ALLOWED_ORIGINS env var)
- **Rate Limiting**: Public APIs are rate-limited per IP address using sliding window algorithm
- **Request Validation**: All calculation requests are validated for proper station IDs, volume limits, and collateral limits

### Pricing System
The app uses a volume-based pricing model:
- Base price = price per m³ × volume
- Collateral fee = collateral value × 1%
- Different routes have different ISK/m³ rates stored in the price matrix

### Key Features
- **Real-time calculation**: Prices update automatically as user types
- **Number formatting**: All numbers display with space separators (not commas)
- **Integer-only inputs**: Volume and collateral fields accept only whole numbers with space formatting while typing
- **Form validation**: Client-side validation with error messages
- **TypeScript**: Strongly typed throughout with custom interfaces

### Data Flow
1. User selects stations and enters volume/collateral in `DeliveryCalculator`
2. Component validates input and calls `/api/calculate-price`
3. API uses `priceCalculator` functions to compute costs
4. Response displays formatted price with breakdown

### Configuration Management
Station data, pricing matrix, and limits are centralized in `src/config/stations.ts`. The price matrix defines ISK/m³ rates between all station pairs. Current stations include Jita, Saminer, and various nullsec locations with different pricing tiers (300 ISK/m³ for Jita-Saminer routes, 650 ISK/m³ for other routes).