# Security Guidelines

## Input Validation
- Validate all chess inputs (FEN/PGN)
- Use parameterized queries for database operations
- Sanitize user inputs
- Implement rate limiting for expensive operations

## Authentication & Authorization
- Use Supabase for secure user authentication
- Implement JWT token validation
- Use middleware for API authentication
- Protect sensitive routes and endpoints

## API Security
- Use CORS appropriately for production
- Implement proper error handling without exposing sensitive information
- Rate limit expensive operations like chess analysis
- Validate all input parameters

## Data Protection
- Use secure connections for all external API calls
- Store sensitive configuration in environment variables
- Never commit API keys or secrets to version control
- Use proper access controls for database operations 