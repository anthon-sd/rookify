import React, { useState, useEffect } from 'react';
import ChessboardComponent from 'chessboardjsx';
import { Chess } from 'chess.js';
import { useQuery } from 'react-query';
import axios from 'axios';

interface ChessboardProps {
  initialFen?: string;
  onPositionChange?: (fen: string) => void;
}

const Chessboard: React.FC<ChessboardProps> = ({ initialFen, onPositionChange }) => {
  const [game, setGame] = useState<Chess>(new Chess(initialFen));
  const [position, setPosition] = useState(initialFen || 'start');

  const { data: analysis, refetch: analyzePosition } = useQuery(
    ['analysis', position],
    async () => {
      const response = await axios.post('http://localhost:5000/analyze', {
        fen: position,
        depth: 20,
        user_level: 'intermediate'
      });
      return response.data;
    },
    {
      enabled: false,
      retry: false
    }
  );

  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(position);
    }
  }, [position, onPositionChange]);

  const onDrop = (move: { sourceSquare: string; targetSquare: string }) => {
    try {
      const newGame = new Chess(game.fen());
      newGame.move({
        from: move.sourceSquare,
        to: move.targetSquare,
        promotion: 'q' // Always promote to queen for simplicity
      });

      setGame(newGame);
      setPosition(newGame.fen());
      analyzePosition();
    } catch (error) {
      return false;
    }
    return true;
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-2xl bg-secondary-cream border border-neutral-gray rounded-lg p-2">
        <ChessboardComponent
          position={position}
          onDrop={onDrop}
          width={600}
          orientation="white"
        />
      </div>
      {analysis && (
        <div className="w-full max-w-2xl p-4 bg-neutral-ghost rounded-lg border border-neutral-gray shadow">
          <h3 className="text-lg font-semibold mb-2 text-primary">Analysis</h3>
          <p className="text-secondary-slate">{analysis.analysis}</p>
          <div className="mt-2">
            <span className="font-medium text-primary">Best move: </span>
            <span className="text-accent-gold font-bold">{analysis.best_move}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chessboard; 