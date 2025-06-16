import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import Chessboard from './components/chess/Chessboard';

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-secondary-cream">
        <header className="bg-primary shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-accent-gold drop-shadow">Chess Coach</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <Chessboard />
          </div>
        </main>
      </div>
    </QueryClientProvider>
  );
};

export default App; 