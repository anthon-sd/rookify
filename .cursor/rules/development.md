# Development Workflow

## Environment Management
- **Environment Files**: The .env file is globally ignored. NEVER attempt to read, modify, or create .env files. All environment variable configuration must be handled manually by the user.
- **Service Execution**: Always use Docker containers when running application services. Use `docker-compose up` or individual Docker commands rather than running services directly on the host system.

## Docker & Deployment
- Each service has its own Dockerfile
- Use docker-compose.yml for local development
- Services communicate via chess-network bridge
- Persist database data with named volumes

## Development Best Practices
- Use Docker containers for consistent development environment
- Test thoroughly before committing changes
- Follow the established file organization structure
- Maintain separation of concerns between services

## Service Management
- Frontend runs on port 3000
- Backend runs on port 8000
- AI Engine runs on port 5000
- Use docker-compose for orchestrating all services 