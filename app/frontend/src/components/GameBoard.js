import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import TileComponent from './TileComponent';
import PlayerHand from './PlayerHand';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GameBoard = ({ gameState: initialGameState, playerName, onBackToMenu }) => {
  const [gameState, setGameState] = useState(initialGameState);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [isPlacing, setIsPlacing] = useState(false);
  const [loading, setLoading] = useState(false);
  const boardRef = useRef(null);
  const [boardOffset, setBoardOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentPlayer = gameState.players[gameState.current_player_index];
  const isMyTurn = currentPlayer && currentPlayer.name === playerName;
  
  const refreshGameState = async () => {
    try {
      const response = await axios.get(`${API}/game/${gameState.id}`);
      setGameState(response.data);
    } catch (error) {
      console.error('Error refreshing game state:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(refreshGameState, 2000);
    return () => clearInterval(interval);
  }, [gameState.id]);

  const performAction = async (action) => {
    setLoading(true);
    try {
      const myPlayer = gameState.players.find(p => p.name === playerName);
      const response = await axios.post(`${API}/game/action`, {
        game_id: gameState.id,
        action: {
          ...action,
          player_id: myPlayer.id
        }
      });
      setGameState(response.data);
      setSelectedTiles([]);
      setSelectedPositions([]);
      setIsPlacing(false);
    } catch (error) {
      console.error('Error performing action:', error);
      alert(error.response?.data?.detail || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePass = () => {
    performAction({ action_type: 'pass' });
  };

  const handleExchange = () => {
    performAction({ action_type: 'exchange' });
  };

  const handleTileSelect = (tile) => {
    if (!isMyTurn) return;
    
    const index = selectedTiles.findIndex(t => t.id === tile.id);
    if (index >= 0) {
      setSelectedTiles(selectedTiles.filter(t => t.id !== tile.id));
    } else {
      setSelectedTiles([...selectedTiles, tile]);
    }
  };

  const startPlacing = () => {
    if (selectedTiles.length === 0) {
      alert('Select tiles first');
      return;
    }
    setIsPlacing(true);
  };

  const handleBoardClick = (event) => {
    if (!isPlacing || isDragging) return;
    
    const rect = boardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left - boardOffset.x;
    const y = event.clientY - rect.top - boardOffset.y;
    
    const col = Math.floor(x / 60);
    const row = Math.floor(y / 60);
    
    const position = { row, col };
    
    // Check if position already selected
    const existingIndex = selectedPositions.findIndex(p => p.row === row && p.col === col);
    if (existingIndex >= 0) {
      setSelectedPositions(selectedPositions.filter((_, i) => i !== existingIndex));
    } else if (selectedPositions.length < selectedTiles.length) {
      setSelectedPositions([...selectedPositions, position]);
    }
  };

  const confirmPlacement = () => {
    if (selectedTiles.length !== selectedPositions.length) {
      alert('Select positions for all tiles');
      return;
    }
    
    performAction({
      action_type: 'place',
      tiles: selectedTiles,
      positions: selectedPositions
    });
  };

  const cancelPlacement = () => {
    setIsPlacing(false);
    setSelectedPositions([]);
  };

  // Board dragging
  const handleMouseDown = (event) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX - boardOffset.x, y: event.clientY - boardOffset.y });
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;
    setBoardOffset({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate board bounds
  const getBoardBounds = () => {
    if (gameState.board.length === 0) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
    
    const rows = gameState.board.map(tile => tile.position.row);
    const cols = gameState.board.map(tile => tile.position.col);
    
    return {
      minRow: Math.min(...rows) - 2,
      maxRow: Math.max(...rows) + 2,
      minCol: Math.min(...cols) - 2,
      maxCol: Math.max(...cols) + 2
    };
  };

  const bounds = getBoardBounds();

  const renderBoard = () => {
    const tiles = [];
    
    // Render existing tiles
    gameState.board.forEach(placedTile => {
      tiles.push(
        <div
          key={`${placedTile.position.row}-${placedTile.position.col}`}
          className="absolute"
          style={{
            left: placedTile.position.col * 60,
            top: placedTile.position.row * 60,
            width: 60,
            height: 60
          }}
        >
          <TileComponent tile={placedTile.tile} />
        </div>
      );
    });
    
    // Render selected positions
    selectedPositions.forEach((position, index) => {
      tiles.push(
        <div
          key={`selected-${position.row}-${position.col}`}
          className="absolute border-4 border-blue-500 bg-blue-100 bg-opacity-50 flex items-center justify-center"
          style={{
            left: position.col * 60,
            top: position.row * 60,
            width: 60,
            height: 60
          }}
        >
          {selectedTiles[index] && <TileComponent tile={selectedTiles[index]} />}
        </div>
      );
    });
    
    // Render grid for placement
    if (isPlacing) {
      for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
        for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
          const isOccupied = gameState.board.some(t => t.position.row === row && t.position.col === col);
          const isSelected = selectedPositions.some(p => p.row === row && p.col === col);
          
          if (!isOccupied && !isSelected) {
            tiles.push(
              <div
                key={`grid-${row}-${col}`}
                className="absolute border border-gray-300 bg-gray-50 hover:bg-blue-50 cursor-pointer"
                style={{
                  left: col * 60,
                  top: row * 60,
                  width: 60,
                  height: 60
                }}
              />
            );
          }
        }
      }
    }
    
    return tiles;
  };

  if (gameState.status === 'finished') {
    const winner = gameState.players.find(p => p.id === gameState.winner_id);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white shadow-2xl">
          <CardHeader className="text-center bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <CardTitle className="text-2xl">Game Over!</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold text-green-800">Winner: {winner?.name}</h3>
              <p className="text-green-600">Score: {winner?.score}</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Final Scores:</h4>
              {gameState.players.map(player => (
                <div key={player.id} className="flex justify-between">
                  <span>{player.name}</span>
                  <span>{player.score}</span>
                </div>
              ))}
            </div>
            
            <Button onClick={onBackToMenu} className="w-full">
              Back to Menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <Button onClick={onBackToMenu} variant="outline">
          ← Back to Menu
        </Button>
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-amber-800">Q-Game</h1>
          <div className="flex gap-4 mt-2">
            {gameState.players.map(player => (
              <Badge 
                key={player.id} 
                variant={player.name === currentPlayer?.name ? "default" : "secondary"}
                className={player.name === currentPlayer?.name ? "bg-amber-600" : ""}
              >
                {player.name}: {player.score}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="text-right text-sm text-gray-600">
          <div>Turn: {gameState.turn_number}</div>
          <div>Tiles left: {gameState.remaining_tiles.length}</div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Game Board */}
        <div className="flex-1 bg-white rounded-lg shadow-lg border-2 border-amber-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold">Game Board</h2>
            {isMyTurn ? (
              <Badge className="bg-green-600">Your Turn</Badge>
            ) : (
              <Badge variant="secondary">Waiting for {currentPlayer?.name}</Badge>
            )}
          </div>
          
          <div 
            ref={boardRef}
            className="relative overflow-hidden h-96 cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleBoardClick}
            data-testid="game-board"
          >
            <div 
              className="relative"
              style={{
                transform: `translate(${boardOffset.x}px, ${boardOffset.y}px)`,
                width: (bounds.maxCol - bounds.minCol + 1) * 60,
                height: (bounds.maxRow - bounds.minRow + 1) * 60,
                left: -bounds.minCol * 60,
                top: -bounds.minRow * 60
              }}
            >
              {renderBoard()}
            </div>
          </div>
        </div>

        {/* Player Panel */}
        <div className="w-80">
          <PlayerHand
            player={gameState.players.find(p => p.name === playerName)}
            selectedTiles={selectedTiles}
            onTileSelect={handleTileSelect}
            isMyTurn={isMyTurn}
          />
          
          {/* Action Buttons */}
          {isMyTurn && (
            <Card className="mt-4">
              <CardContent className="p-4 space-y-2">
                {!isPlacing ? (
                  <>
                    <Button 
                      onClick={handlePass}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                      data-testid="pass-button"
                    >
                      Pass Turn
                    </Button>
                    <Button 
                      onClick={handleExchange}
                      disabled={loading || gameState.remaining_tiles.length < 6}
                      variant="outline"
                      className="w-full"
                      data-testid="exchange-button"
                    >
                      Exchange Tiles
                    </Button>
                    <Button 
                      onClick={startPlacing}
                      disabled={loading || selectedTiles.length === 0}
                      className="w-full bg-amber-600 hover:bg-amber-700"
                      data-testid="place-tiles-button"
                    >
                      Place Selected Tiles ({selectedTiles.length})
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-2">
                      Click on the board to place tiles ({selectedPositions.length}/{selectedTiles.length})
                    </p>
                    <Button 
                      onClick={confirmPlacement}
                      disabled={selectedPositions.length !== selectedTiles.length}
                      className="w-full bg-green-600 hover:bg-green-700"
                      data-testid="confirm-placement-button"
                    >
                      Confirm Placement
                    </Button>
                    <Button 
                      onClick={cancelPlacement}
                      variant="outline"
                      className="w-full"
                      data-testid="cancel-placement-button"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;