# EVE Online Delivery Cost Calculator

A web application for calculating shipping costs between space stations in EVE Online. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- Real-time delivery cost calculation
- Volume-based pricing with collateral fees
- Support for multiple station routes
- Integer-only inputs with space formatting
- Form validation and error handling
- Public API with rate limiting
- Searchable station dropdowns

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Generate OpenAPI documentation
npm run openapi:generate
```

## Architecture

- **Main Component**: `src/components/DeliveryCalculator.tsx`
- **Configuration**: `src/config/stations.ts`
- **Price Logic**: `src/lib/priceCalculator.ts`
- **APIs**: Internal (`/api/calculate-price`, `/api/appraisal`) and Public (`/api/public/*`) with rate limiting

## Pricing System

- Base price = price per m³ × volume
- Collateral fee = collateral value × 1%
- Different ISK/m³ rates for different routes (300-650 ISK/m³)

## Deployment

Production deployment creates an optimized standalone package:

```bash
# Install dependencies
npm ci --prefer-offline --force

# Build for production
npm run build

# Generate OpenAPI docs
npm run openapi:generate

# Create deployment package (done automatically in CI)
mkdir -p deploy-package
cp -r .next/standalone/. deploy-package/
cp -r .next/static deploy-package/.next/static
cp -r public deploy-package/public

# Run in production
cd deploy-package
node server.js
```

## NGINX Configuration

```nginx
upstream bslc-app {
    server localhost:3000 fail_timeout=0;
}

server {
    server_name bslc.example.com;
    root /opt/bslc/public;
    
    access_log /var/log/nginx/bslc-access.log;
    error_log /var/log/nginx/bslc-error.log notice;

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        if ($scheme != https) { return 301 https://$host$uri$is_args$args; }
        try_files $uri @proxy;
    }

    location @proxy {
        proxy_pass http://bslc-app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_comp_level 6;
    gzip_min_length 1000;
}
```