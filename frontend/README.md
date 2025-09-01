# Frontend Application

## Environment Configuration

### Development
For local development, the app will use:
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:5000`

### Production
For production deployment, the app will use:
- **Frontend**: `https://sodeclick-front-production.up.railway.app`
- **Backend**: `https://sodeclick-back-production.up.railway.app`

## Setup

1. Install dependencies:
```bash
npm install
```

2. For development, create a `.env` file in the frontend directory:
```bash
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_ENV=development
```

3. For production, the app will automatically use the production environment variables.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Files

- `env.development` - Development environment settings
- `env.production` - Production environment settings
- `env.example` - Example configuration
- `.env` - Local environment override (create this file for development)

## API Configuration

The app automatically detects the environment and uses the appropriate API base URL:
- Development: `http://localhost:5000`
- Production: `https://sodeclick-back-production.up.railway.app`

You can check the current environment and API URL in the browser console when the app loads.
