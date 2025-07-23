# Coding Standards

## Python (Backend & AI Engine)
- Use FastAPI for main backend endpoints
- Follow PEP 8 style guidelines
- Use type hints for all function signatures
- Use Pydantic models for request/response validation
- Handle exceptions with proper HTTP status codes
- Use async/await for database operations
- Import order: standard library, third-party, local imports

## JavaScript/TypeScript (Frontend)
- Use functional components with hooks
- Prefer TypeScript over JavaScript for new files
- Use React Router for navigation
- Implement proper error boundaries
- Use Supabase client for authentication
- Follow React best practices for state management
- Use chess.js for chess logic validation

## Testing Standards
- Use pytest for Python backend tests
- Use Jest/React Testing Library for frontend
- Test chess analysis logic with known positions
- Mock external API calls in tests

## Code Quality
- Always validate FEN/PGN input before processing
- Use chess.Board for position manipulation
- Store both engine evaluation and AI commentary
- Classify moves: Brilliant, Best, Great, Balanced, Book, Forced, Inaccuracy, Mistake, Blunder 