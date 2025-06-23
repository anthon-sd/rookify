# Database Guidelines

## Schema Design
- Use UUID primary keys for all tables
- Include created_at/updated_at timestamps
- Use proper foreign key relationships
- Index frequently queried columns
- Use Supabase for auth-related tables
- Use Pinecone for vector similarity searches

## Query Best Practices
- Use parameterized queries for database operations
- Use async/await for database operations
- Sanitize user inputs
- Cache frequent database queries

## Data Storage Strategy
- PostgreSQL for relational data
- Supabase for authentication and user management
- Pinecone for chess position embeddings and similarity search
- Store position embeddings using OpenAI text-embedding-3-small 