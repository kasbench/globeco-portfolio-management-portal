# GlobeCo Portfolio Management Portal

The web UI for the GlobeCo Portfolio Management Suite, part of the KASBench benchmark for Kubernetes autoscaling.

![GlobeCo Logo](./documentation/images/globeco-logo.png)

## Overview

This application is the primary web user interface for the GlobeCo Portfolio Management Suite. It's a Next.js-based React application designed for financial portfolio management, serving employees and institutional investors with modern, professional interfaces for trading, portfolio management, and administration.

**Author:** Noah Krieger (noah@kasbench.org)  
**Organization:** KASBench (kasbench.org)  
**License:** Apache 2.0  
**GitHub:** https://github.com/kasbench/globeco-portfolio-management-portal

## User Roles

- **Admin**: Access to all functions within the application
- **Internal**: Access to all functions except Admin-only features
- **Partner**: External users with access to Partner-enabled features only
- **Customer**: External users with access to Customer-enabled features only

## Prerequisites

Before running this application in development mode, ensure you have the following installed:

- **Node.js** (version 18.0.0 or higher)
- **npm** (version 8.0.0 or higher) or **yarn**
- **Docker** (for running dependent microservices)
- **Git**

## Backend Services

This application integrates with the following GlobeCo microservices that must be running:

| Service | Host | Port | Description |
|---------|------|------|-------------|
| Portfolio Accounting Service | globeco-portfolio-accounting-service | 8087 | Portfolio accounting and reporting |
| Execution Service | globeco-execution-service | 8084 | Trade execution management |
| Trade Service | globeco-trade-service | 8082 | Trade processing and management |
| Pricing Service | globeco-pricing-service | 8083 | Real-time pricing data |
| Security Service | globeco-security-service | 8000 | Authentication and authorization |
| Order Service | globeco-order-service | 8081 | Order management |
| Portfolio Service | globeco-portfolio-service | 8001 | Portfolio data and operations |
| Order Generation Service | globeco-order-generation-service | 8088 | Automated order generation |

**Note:** All services run on the Docker network `my-network`. Do not use `localhost` in any configuration.

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/kasbench/globeco-portfolio-management-portal.git
cd globeco-portfolio-management-portal
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory with the following environment variables:

```env
# API Base URLs (adjust as needed for your environment)
NEXT_PUBLIC_API_BASE_URL=http://globeco-api-gateway:8080
NEXT_PUBLIC_PORTFOLIO_SERVICE_URL=http://globeco-portfolio-service:8001
NEXT_PUBLIC_SECURITY_SERVICE_URL=http://globeco-security-service:8000
NEXT_PUBLIC_ORDER_SERVICE_URL=http://globeco-order-service:8081
NEXT_PUBLIC_TRADE_SERVICE_URL=http://globeco-trade-service:8082
NEXT_PUBLIC_PRICING_SERVICE_URL=http://globeco-pricing-service:8083
NEXT_PUBLIC_EXECUTION_SERVICE_URL=http://globeco-execution-service:8084
NEXT_PUBLIC_PORTFOLIO_ACCOUNTING_SERVICE_URL=http://globeco-portfolio-accounting-service:8087
NEXT_PUBLIC_ORDER_GENERATION_SERVICE_URL=http://globeco-order-generation-service:8088

# Development settings
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=development
```

### 4. Start Backend Services

Ensure all required GlobeCo microservices are running in Docker on the `my-network` network. Refer to the individual service documentation for startup instructions.

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` - Starts the development server with hot reloading
- `npm run build` - Creates an optimized production build
- `npm run start` - Starts the production server (requires build first)
- `npm run lint` - Runs ESLint for code quality checks
- `npm run type-check` - Runs TypeScript type checking without emitting files
- `npm run test` - Runs the test suite
- `npm run test:watch` - Runs tests in watch mode
- `npm run storybook` - Starts Storybook for component development
- `npm run build-storybook` - Builds Storybook for deployment

## Development Workflow

### Code Quality

This project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Tailwind CSS** for styling
- **Jest** for testing

### Component Development

Components are organized in the `src/components/` directory:
- `ui/` - Reusable UI components
- `forms/` - Form components
- `tables/` - Table components
- `charts/` - Chart and visualization components
- `layout/` - Layout components

### State Management

The application uses:
- **Zustand** for global state management
- **React Query** for server state management
- **React Hook Form** for form state management

### API Integration

API clients are located in `src/lib/api/`. Each microservice has its own client module based on the OpenAPI specifications.

## Testing

Run tests with:

```bash
npm run test
```

For watch mode during development:

```bash
npm run test:watch
```

## Storybook

View and develop components in isolation:

```bash
npm run storybook
```

Storybook will be available at [http://localhost:6006](http://localhost:6006).

## Deployment

### Docker Build

The application includes Docker configuration for multi-architecture builds (AMD64 and ARM64).

### Kubernetes Deployment

This application is designed to run in Kubernetes namespace `globeco`. Deployment configurations will be added in future releases.

### GitHub Actions

Automated builds and deployments to Docker Hub as `kasbench/globeco-portfolio-management-portal` are configured via GitHub Actions.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin-only pages
│   ├── administration/    # Administration pages
│   ├── dashboard/         # Dashboard pages
│   ├── trading/           # Trading pages
│   └── ...
├── components/            # Reusable components
├── lib/                   # Utilities and configurations
│   ├── api/              # API clients
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── store/                 # Global state management
└── types/                 # TypeScript type definitions
```

## Troubleshooting

### Common Issues

1. **Service Connection Errors**: Ensure all backend microservices are running and accessible on the `my-network` Docker network.

2. **Port Conflicts**: If port 3000 is already in use, Next.js will automatically try the next available port.

3. **Environment Variables**: Verify all required environment variables are set in `.env.local`.

### Getting Help

For issues related to this application:
- Check the [GitHub Issues](https://github.com/kasbench/globeco-portfolio-management-portal/issues)
- Contact: noah@kasbench.org

## Contributing

This application is part of the KASBench project. Contributions should align with the benchmark requirements and focus on performance, reliability, and realistic financial application workflows.

## License

Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

---

**Note:** This application is designed for benchmarking purposes only and will never contain production data. Security measures are implemented for realistic simulation but are not production-grade.
