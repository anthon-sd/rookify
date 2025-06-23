# Architecture & Integrations

## Chess Analysis Pipeline
1. Import games via Chess.com API or PGN upload
2. Parse games into key moments using python-chess
3. Analyze with Stockfish engine (depth 20 default)
4. Generate AI commentary using OpenAI GPT-4
5. Store position embeddings in Pinecone
6. Create personalized recommendations

## Authentication Flow
- Use Supabase for user registration/login
- JWT tokens for API authentication  
- Protected routes in React frontend
- Middleware validation in backend

## Vector Database Usage
- Store chess positions as embeddings using OpenAI text-embedding-3-small
- Query similar positions for recommendations
- Filter by user_id, skill_category, phase
- Batch upload in groups of 100 records

## Service Communication
- Services communicate via chess-network bridge
- Use Docker Compose for orchestration
- Each service has its own Dockerfile
- Persist database data with named volumes

## Performance Considerations
- Batch Pinecone operations (100 records max)
- Use appropriate Stockfish depth based on use case
- Cache frequent database queries
- Optimize chess position analysis for real-time use 