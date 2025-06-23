# Rookify Chess Coaching Platform

## Project Overview
Rookify is a chess coaching platform with microservices architecture designed to help players improve through AI-powered game analysis and personalized recommendations.

## Architecture Overview
- **Frontend**: React 18.2 + TypeScript (port 3000)
- **Backend**: FastAPI (Python) + Node.js/Express hybrid (port 8000) 
- **AI Engine**: Flask + Stockfish + OpenAI GPT-4 (port 5000)
- **Database**: PostgreSQL + Supabase + Pinecone vector DB
- **Deployment**: Docker Compose with containerized services

## File Organization
- `/frontend/chess-coach-frontend/` - React application
- `/backend/` - Python FastAPI backend + Node.js routes
- `/ai-engine/` - Flask chess analysis service
- `/backend/src/` - Node.js Express server
- Docker Compose orchestrates all services

## Environment Variables
- OPENAI_API_KEY - for AI analysis and embeddings
- PINECONE_API_KEY - for vector database
- SUPABASE_URL/SUPABASE_SERVICE_KEY - for auth and database
- DATABASE_URL - for PostgreSQL connection

## Core Principles
When working on this project:
1. Always consider the chess domain context
2. Maintain consistency between Python and JavaScript code styles  
3. Test chess logic thoroughly with edge cases
4. Consider user experience for chess players of all levels
5. Optimize for both accuracy and performance in analysis 