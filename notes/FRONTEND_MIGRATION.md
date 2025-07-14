# Frontend Migration Guide

## Overview

The RookifyCoach frontend has been migrated from Create React App to a modern Vite + TypeScript setup. This document outlines the changes and how to use the new system.

## What Was Replaced

### Old Setup (frontend/chess-coach-frontend/)
- Create React App (CRA)
- JavaScript
- Custom CSS styling
- React 18

### New Setup (frontend/chess-coach-frontend/client/)
- Vite build tool
- TypeScript
- Tailwind CSS + shadcn/ui
- React 18

## Key Benefits

1. **Faster Development**: Vite provides instant HMR and faster builds
2. **Type Safety**: Full TypeScript implementation
3. **Modern UI**: shadcn/ui components with Tailwind CSS
4. **Better DX**: Improved developer experience and tooling
5. **Smaller Bundles**: More efficient production builds

## Docker Integration

The Docker configuration has been updated to use the new client:

```yaml
# docker-compose.yml
frontend:
  build:
    context: ./frontend/chess-coach-frontend/client  # Changed path
    dockerfile: Dockerfile
    args:
      - VITE_API_URL=${REACT_APP_API_URL}           # Changed env var names
```

## Environment Variables

Environment variables now use the `VITE_` prefix instead of `REACT_APP_`:

```bash
# Old
REACT_APP_API_URL=http://localhost:8000

# New
VITE_API_URL=http://localhost:8000
```

## Authentication

The authentication system has been preserved but converted to TypeScript:

- Backend API authentication (not Supabase direct)
- JWT token storage in localStorage
- Protected routes functionality
- User context management

## File Structure Changes

```
frontend/chess-coach-frontend/
├── [old CRA files]           # Keep for reference
└── client/                   # New Vite app
    ├── src/
    │   ├── components/ui/    # shadcn/ui components
    │   ├── pages/           # Route components (TS)
    │   ├── contexts/        # Auth context (TS)
    │   ├── lib/            # Utilities and API
    │   └── ...
    ├── package.json         # New dependencies
    ├── vite.config.ts      # Vite configuration
    ├── tailwind.config.js  # Tailwind setup
    └── Dockerfile          # Updated Docker config
```

## Running the New Frontend

**⚠️ IMPORTANT: The frontend must always be run via Docker for consistency and proper integration with backend services.**

### Development & Production
```bash
# Run frontend only
docker-compose up frontend --build

# Run complete application stack
docker-compose up --build
```

### Access Points
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (when running full stack)

## Migration Status

### ✅ Completed
- Project setup and configuration
- Authentication system
- Routing and navigation
- Basic page structure
- Docker integration
- UI component system

### 🚧 In Progress
- Game analysis features
- Chess board integration
- Training drills
- User progress tracking

### 📋 TODO
- Migrate existing components from old structure
- Integrate chess.js and react-chessboard
- Add game sync functionality
- Complete all page implementations

## Development Guidelines

1. **Use TypeScript**: All new code should be in TypeScript
2. **shadcn/ui Components**: Use the UI library for consistent styling
3. **Responsive Design**: Follow mobile-first approach with Tailwind
4. **API Integration**: Use the typed API service in `lib/api.ts`
5. **Authentication**: Leverage the existing auth context

## Troubleshooting

### Docker Build Issues
- Ensure Docker is running and has sufficient resources
- Check that the build context points to `./frontend/chess-coach-frontend/client`
- Environment variables should use `VITE_` prefix (not `REACT_APP_`)
- Nginx serves files from `/app/dist` (not `/app/build`)
- For TypeScript errors, check the build logs: `docker-compose logs frontend`

### Runtime Issues
- Verify environment variables are properly set in `.env` file
- Check that backend services are running: `docker-compose ps`
- Ensure port 3000 is not in use by other applications
- For debugging, rebuild without cache: `docker-compose build --no-cache frontend`

## Next Steps

1. **Remove Old Code**: After migration is complete, remove the old CRA setup
2. **Feature Migration**: Gradually move remaining features to the new setup
3. **Testing**: Add comprehensive test coverage
4. **Documentation**: Update all documentation to reflect new structure 