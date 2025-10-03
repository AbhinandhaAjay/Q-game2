import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import GameBoard from './components/GameBoard';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const HomePage = () => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(false);

  const createGame = async () => {
    console.log('createGame called with playerName:', playerName);
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Making API call to:', `${API}/game/create`);
      const response = await axios.post(`${API}/game/create`, {
        player_name: playerName,
        num_ai_players: 1
      });
      console.log('Game created successfully:', response.data);
      setCurrentGame(response.data);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!gameId.trim() || !playerName.trim()) {
      alert('Please enter game ID and your name');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/game/${gameId}`);
      setCurrentGame(response.data);
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Game not found');
    } finally {
      setLoading(false);
    }
  };

  const backToMenu = () => {
    setCurrentGame(null);
    setGameId('');
  };

  if (currentGame) {
    return (
      <GameBoard 
        gameState={currentGame} 
        playerName={playerName}
        onBackToMenu={backToMenu}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl border-2 border-amber-200">
        <CardHeader className="text-center bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="text-3xl font-bold tracking-wide">Q-Game</CardTitle>
          <p className="text-amber-100 mt-2">Classic Tile Placement Game</p>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Player Name</label>
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="border-amber-300 focus:border-amber-500"
              data-testid="player-name-input"
            />
          </div>

          <div className="space-y-4">
            <Button 
              onClick={createGame}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
              data-testid="create-game-button"
            >
              {loading ? 'Creating...' : 'Create New Game (vs AI)'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter Game ID"
                className="border-amber-300 focus:border-amber-500"
                data-testid="game-id-input"
              />
              <Button 
                onClick={joinGame}
                disabled={loading}
                variant="outline"
                className="w-full border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3"
                data-testid="join-game-button"
              >
                {loading ? 'Joining...' : 'Join Existing Game'}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-2">How to Play:</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• Place tiles matching colors or shapes</li>
              <li>• Score points for each tile and sequence</li>
              <li>• Complete a Q (all shapes/colors) for bonus points</li>
              <li>• Use all your tiles to win instantly!</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;