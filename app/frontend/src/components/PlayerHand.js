import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import TileComponent from './TileComponent';

const PlayerHand = ({ player, selectedTiles, onTileSelect, isMyTurn }) => {
  if (!player) return null;

  return (
    <Card className="bg-white border-2 border-amber-200">
      <CardHeader className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <CardTitle className="text-lg">
          {player.name} (Score: {player.score})
        </CardTitle>
        <p className="text-amber-100 text-sm">
          {player.hand.length} tiles remaining
        </p>
      </CardHeader>
      
      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-2" data-testid="player-hand">
          {player.hand.map((tile, index) => {
            const isSelected = selectedTiles.some(t => t.id === tile.id);
            return (
              <TileComponent
                key={`${tile.id}-${index}`}
                tile={tile}
                selected={isSelected}
                onClick={isMyTurn ? () => onTileSelect(tile) : null}
                className={isMyTurn ? "hover:scale-105" : "cursor-not-allowed opacity-75"}
              />
            );
          })}
        </div>
        
        {selectedTiles.length > 0 && (
          <div className="mt-4 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-medium text-blue-800">
              Selected: {selectedTiles.length} tile{selectedTiles.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlayerHand;