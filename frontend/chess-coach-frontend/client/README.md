# RookifyCoach Client (Vite + React + TypeScript)

This is the new Vite-based frontend for RookifyCoach, replacing the previous Create React App setup.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 18** - Modern React with hooks
- 🔷 **TypeScript** - Type-safe development
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧩 **shadcn/ui** - Modern, accessible UI components
- 🔐 **Authentication** - Backend API authentication
- 📱 **Responsive Design** - Mobile-first approach

## Project Structure

```
src/
├── components/
│   └── ui/              # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx  # Authentication context
├── lib/
│   ├── api.ts          # Backend API service
│   └── utils.ts        # Utility functions
├── pages/              # Route components
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Analyze.tsx
│   ├── Profile.tsx
│   ├── Drills.tsx
│   └── Learn.tsx
├── App.tsx             # Main app component
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Getting Started

**⚠️ IMPORTANT: This application must be run via Docker for proper integration with backend services.**

### Docker Development & Production

1. Navigate to the project root:
   ```bash
   cd ../../../  # Go to rookify project root
   ```

2. Ensure environment variables are set in `.env` file:
   ```
   VITE_API_URL=http://localhost:8000
   VITE_REACT_APP_SUPABASE_URL=your-supabase-url
   VITE_REACT_APP_SUPABASE_ANON_KEY=your-supabase-key
   ```

3. Run the frontend (development mode):
   ```bash
   docker-compose up frontend --build
   ```

4. Run the complete application stack:
   ```bash
   docker-compose up --build
   ```

### Access Points
- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000 (when running full stack)

### Docker Architecture

The application uses multi-stage Docker build:
- **Build Stage**: Node.js environment for TypeScript compilation and Vite build
- **Production Stage**: Nginx for serving optimized static files
- **Environment Variables**: Injected at build time via Docker Compose

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |
| `VITE_REACT_APP_SUPABASE_URL` | Supabase URL (optional) | - |
| `VITE_REACT_APP_SUPABASE_ANON_KEY` | Supabase Key (optional) | - |

## Migration from Create React App

This application replaces the previous Create React App setup with several improvements:

### What Changed

- **Build Tool**: Create React App → Vite
- **Language**: JavaScript → TypeScript
- **UI Framework**: Custom CSS → Tailwind CSS + shadcn/ui
- **Development**: Faster dev server and HMR
- **Bundle Size**: Smaller production builds

### Migrated Features

- ✅ Authentication system
- ✅ Routing (React Router)
- ✅ Protected routes
- ✅ User context
- ✅ Backend API integration
- ✅ Responsive navigation
- ✅ Error boundaries

### In Progress

- 🚧 Game analysis functionality
- 🚧 Training drills
- 🚧 Chess board integration
- 🚧 User progress tracking

## Contributing

1. Use TypeScript for all new code
2. Follow the existing component patterns
3. Use shadcn/ui components where possible
4. Maintain responsive design principles
5. Test authentication flows

## Internal Scripts

**⚠️ These scripts are used internally by Docker and should not be run directly:**

- `npm run dev` - Used by Docker for development server
- `npm run build` - Used by Docker build process for production
- `npm run preview` - Preview production build (Docker internal)
- `npm run lint` - TypeScript/ESLint checking (Docker internal)

**For development, always use Docker commands as shown in the Getting Started section.** 