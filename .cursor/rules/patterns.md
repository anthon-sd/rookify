# Common Patterns

## API Endpoints
- Use FastAPI dependency injection for authentication
- Return consistent JSON response format
- Include proper error handling with HTTPException
- Use Pydantic models for request validation

## Chess Analysis Patterns
- Always validate FEN/PGN input before processing
- Use chess.Board for position manipulation
- Store both engine evaluation and AI commentary
- Classify moves: Brilliant, Great, Good, Inaccuracy, Mistake, Blunder

## Frontend Components
- Use AuthContext for user state management
- Implement loading states for async operations
- Use react-chessboard for chess UI
- Handle chess move validation client-side

## Error Handling
- Implement proper error boundaries
- Handle exceptions with proper HTTP status codes
- Provide meaningful error messages to users
- Log errors appropriately for debugging 