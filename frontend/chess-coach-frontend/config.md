# Frontend Environment Configuration

To run the frontend with sync functionality, create a `.env` file in the `frontend/chess-coach-frontend/` directory with the following variables:

```bash
# Backend API Configuration
REACT_APP_API_URL=http://localhost:8000

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## Environment Variables Explained

- **REACT_APP_API_URL**: The URL of your FastAPI backend server for sync operations
- **REACT_APP_SUPABASE_URL**: Your Supabase project URL
- **REACT_APP_SUPABASE_ANON_KEY**: Your Supabase anonymous key for authentication

## Setup Instructions

1. Copy the environment variables above into a `.env` file
2. Replace the placeholder values with your actual Supabase credentials
3. Ensure your backend server is running on the specified port (8000 by default)
4. Restart the React development server after creating the .env file 