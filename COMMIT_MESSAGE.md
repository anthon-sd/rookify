feat: implement frontend sync functionality with Docker optimization

## Frontend Sync Implementation (Blueprint Step 3)

### New Components
- **BackendApiService**: Authentication and sync operations with FastAPI backend
  - Auto-login using Supabase credentials with fallback password
  - Sync job management (start, status monitoring, history)
  - Comprehensive error handling and token management

- **SyncProgress Component**: Real-time sync monitoring
  - Live progress tracking with 2-second polling intervals
  - Visual progress bars with status-specific styling
  - Completion summaries and detailed error reporting
  - Responsive design with modern animations

- **SyncModal Component**: User-friendly sync initiation
  - Platform selection (Chess.com/Lichess) with custom forms
  - Username input validation and time period selection
  - Optional Lichess API token support with help links
  - Loading states and comprehensive form validation

### Enhanced Analyze Page
- Integrated authentication status display
- Real-time sync progress monitoring
- Sync history viewing with status indicators
- Seamless sync workflow from initiation to completion
- Improved error messaging and user feedback

### Styling & UX
- Modern CSS with animations and transitions
- Responsive design for mobile compatibility
- Status-specific color coding and icons
- Loading spinners and progress indicators
- Accessibility improvements with proper ARIA labels

## Docker Infrastructure Improvements

### Container Optimization
- **Frontend**: Multi-stage build with Node.js + nginx
  - Production-ready nginx configuration
  - Client-side routing support with fallback to index.html
  - Security headers and gzip compression
  - Health check endpoint implementation

### Configuration Cleanup
- Removed unused PostgreSQL service (backend uses Supabase)
- Fixed Docker networking for proper service communication
- Cleaned up environment variables and dependencies
- Removed obsolete docker-compose version attribute
- Added comprehensive .dockerignore for faster builds

### Service Architecture
- Frontend: React SPA served by nginx (port 3000)
- Backend: FastAPI with Supabase integration (port 8000)  
- AI Engine: Flask service for chess analysis (port 5000)
- All services properly networked via chess-network bridge

## Technical Improvements

### Authentication Flow
- Seamless integration between Supabase (frontend) and FastAPI (backend)
- Automatic user registration for sync functionality
- Persistent token management with localStorage
- Graceful fallback handling for authentication failures

### Rate Limiting & Security
- Platform-specific API rate limits (Chess.com: 20/min, Lichess: 30/min)
- User sync job limits (5 per 10 minutes)
- Input validation and sanitization
- Secure credential handling

### Code Quality
- Fixed ESLint warnings and build issues
- Removed unused dependencies and imports
- Consistent error handling patterns
- Comprehensive component documentation

## Testing & Validation
- All services successfully build and run in Docker
- Frontend health checks and routing verified
- Backend API endpoints accessible and functional
- Real-time sync progress polling operational
- Cross-platform compatibility confirmed

This implementation completes Step 3 of the engineering blueprint, providing
production-ready sync functionality for Chess.com and Lichess integration
with a modern, responsive user interface. 