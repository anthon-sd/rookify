# Rookify Chess Platform

A comprehensive chess analysis and training platform with AI-powered insights.

## 🏗️ Architecture

- **Frontend**: Vite + React + TypeScript (Port 3000)
- **Backend**: FastAPI + Python (Port 8000)  
- **AI Engine**: Flask + OpenAI (Port 5000)
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: Pinecone
- **Containerization**: Docker + Docker Compose

## 🚀 Quick Start

**⚠️ IMPORTANT: This application must be run via Docker for proper service integration.**

### Prerequisites
- Docker Desktop installed and running
- `.env` file configured (copy from `.env.example`)

### Run the Complete Application

```bash
# Clone the repository
git clone <repository-url>
cd rookify

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys (Supabase, OpenAI, Pinecone)

# Start all services
docker-compose up --build
```

### Run Individual Services

```bash
# Frontend only
docker-compose up frontend --build

# Backend only  
docker-compose up backend --build

# AI Engine only
docker-compose up ai-engine --build
```

## 🌐 Access Points

Once running, access the application at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **AI Engine**: http://localhost:5000

## 🔧 Environment Configuration

Required environment variables in `.env`:

```bash
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
PINECONE_API_KEY=your-pinecone-api-key

# Frontend
VITE_API_URL=http://localhost:8000
VITE_REACT_APP_SUPABASE_URL=your-supabase-project-url
VITE_REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📁 Project Structure

```
rookify/
├── frontend/chess-coach-frontend/client/  # Vite + React + TypeScript
├── backend/                               # FastAPI + Python
├── ai-engine/                            # Flask + AI Models
├── docker-compose.yml                    # Service orchestration
└── .env                                  # Environment configuration
```

## 🔄 Development Workflow

1. **Make Changes**: Edit code in respective directories
2. **Rebuild**: `docker-compose up --build <service-name>`
3. **View Logs**: `docker-compose logs <service-name>`
4. **Debug**: `docker-compose logs -f <service-name>`

## 🐛 Troubleshooting

### Build Issues
```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs ai-engine
```

### Port Conflicts
- Ensure ports 3000, 8000, and 5000 are available
- Stop conflicting services or change ports in docker-compose.yml

### Environment Issues
- Verify all required environment variables are set
- Check .env file formatting (no spaces around =)
- Ensure API keys are valid and have proper permissions

## 📚 Documentation

- [Frontend Migration Guide](FRONTEND_MIGRATION.md)
- [Sync Job Implementation](SYNC_JOB_IMPLEMENTATION_SUMMARY.md)
- [Batch Processing](BATCH_PROCESSING_README.md)

## 🎯 Features

- **Game Analysis**: AI-powered chess game analysis
- **Platform Sync**: Import games from Chess.com and Lichess
- **Real-time Progress**: Live sync progress tracking
- **Modern UI**: TypeScript + Tailwind CSS interface
- **Authentication**: Secure user management with Supabase

---

**Remember: Always use Docker commands for consistent development and deployment!** 🐳