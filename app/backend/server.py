from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Tuple
import uuid
from datetime import datetime
import random
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Game Constants
SHAPES = ['star', '8star', 'square', 'circle', 'clover', 'diamond']
COLORS = ['red', 'green', 'blue', 'yellow', 'orange', 'purple']
TILES_PER_TYPE = 30
INITIAL_HAND_SIZE = 6

# Enums
class GameStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    FINISHED = "finished"

class PlayerType(str, Enum):
    HUMAN = "human"
    AI = "ai"

class ActionType(str, Enum):
    PASS = "pass"
    EXCHANGE = "exchange"
    PLACE = "place"

# Models
class Tile(BaseModel):
    shape: str
    color: str
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class Position(BaseModel):
    row: int
    col: int

class PlacedTile(BaseModel):
    tile: Tile
    position: Position
    placed_by: str  # player_id
    turn_number: int

class Player(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    player_type: PlayerType
    hand: List[Tile] = []
    score: int = 0
    is_active: bool = True

class GameAction(BaseModel):
    action_type: ActionType
    player_id: str
    tiles: Optional[List[Tile]] = None
    positions: Optional[List[Position]] = None

class GameState(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: GameStatus = GameStatus.WAITING
    players: List[Player] = []
    board: List[PlacedTile] = []
    remaining_tiles: List[Tile] = []
    current_player_index: int = 0
    turn_number: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    winner_id: Optional[str] = None
    consecutive_passes: int = 0

class CreateGameRequest(BaseModel):
    player_name: str
    num_ai_players: int = 1

class JoinGameRequest(BaseModel):
    game_id: str
    player_name: str

class GameActionRequest(BaseModel):
    game_id: str
    action: GameAction

# Game Logic Functions
def create_all_tiles() -> List[Tile]:
    """Create all 1080 tiles (36 types × 30 each)"""
    tiles = []
    for shape in SHAPES:
        for color in COLORS:
            for _ in range(TILES_PER_TYPE):
                tiles.append(Tile(shape=shape, color=color))
    random.shuffle(tiles)
    return tiles

def deal_initial_hands(game_state: GameState):
    """Deal 6 tiles to each player"""
    for player in game_state.players:
        player.hand = game_state.remaining_tiles[:INITIAL_HAND_SIZE]
        game_state.remaining_tiles = game_state.remaining_tiles[INITIAL_HAND_SIZE:]

def place_initial_tile(game_state: GameState):
    """Place the first tile on the board at position (0,0)"""
    if game_state.remaining_tiles:
        initial_tile = game_state.remaining_tiles.pop(0)
        placed_tile = PlacedTile(
            tile=initial_tile,
            position=Position(row=0, col=0),
            placed_by="referee",
            turn_number=0
        )
        game_state.board.append(placed_tile)

def get_neighbors(position: Position, board: List[PlacedTile]) -> Dict[str, Optional[PlacedTile]]:
    """Get immediate neighbors of a position"""
    board_dict = {(tile.position.row, tile.position.col): tile for tile in board}
    
    return {
        "up": board_dict.get((position.row - 1, position.col)),
        "down": board_dict.get((position.row + 1, position.col)),
        "left": board_dict.get((position.row, position.col - 1)),
        "right": board_dict.get((position.row, position.col + 1))
    }

def validate_tile_placement(tile: Tile, position: Position, board: List[PlacedTile]) -> bool:
    """Validate if a tile can be placed at given position"""
    # Check if position is already occupied
    for placed_tile in board:
        if placed_tile.position.row == position.row and placed_tile.position.col == position.col:
            return False
    
    neighbors = get_neighbors(position, board)
    adjacent_neighbors = [n for n in neighbors.values() if n is not None]
    
    # Must have at least one neighbor (except for first tile)
    if not adjacent_neighbors and board:
        return False
    
    # Check matching rules with neighbors
    for neighbor in adjacent_neighbors:
        # Must match either all colors or all shapes in the line
        if not (tile.color == neighbor.tile.color or tile.shape == neighbor.tile.shape):
            return False
    
    return True

def calculate_score(placed_tiles: List[Tuple[Tile, Position]], board: List[PlacedTile]) -> int:
    """Calculate score for placed tiles"""
    score = len(placed_tiles)  # 1 point per tile
    
    # Add points for sequences containing the new tiles
    for tile, position in placed_tiles:
        # Check row sequence
        row_tiles = [pt for pt in board if pt.position.row == position.row]
        row_tiles.append(PlacedTile(tile=tile, position=position, placed_by="temp", turn_number=0))
        row_tiles.sort(key=lambda x: x.position.col)
        
        # Check column sequence  
        col_tiles = [pt for pt in board if pt.position.col == position.col]
        col_tiles.append(PlacedTile(tile=tile, position=position, placed_by="temp", turn_number=0))
        col_tiles.sort(key=lambda x: x.position.row)
        
        # Count contiguous sequences
        score += len(row_tiles)
        score += len(col_tiles)
    
    return score

# API Routes
@api_router.post("/game/create", response_model=GameState)
async def create_game(request: CreateGameRequest):
    """Create a new game"""
    game_state = GameState()
    
    # Add human player
    human_player = Player(name=request.player_name, player_type=PlayerType.HUMAN)
    game_state.players.append(human_player)
    
    # Add AI players
    for i in range(request.num_ai_players):
        ai_player = Player(name=f"AI Player {i+1}", player_type=PlayerType.AI)
        game_state.players.append(ai_player)
    
    # Initialize game
    game_state.remaining_tiles = create_all_tiles()
    deal_initial_hands(game_state)
    place_initial_tile(game_state)
    game_state.status = GameStatus.IN_PROGRESS
    
    # Save to database
    game_dict = game_state.dict()
    await db.games.insert_one(game_dict)
    
    return game_state

@api_router.get("/game/{game_id}", response_model=GameState)
async def get_game(game_id: str):
    """Get game state"""
    game_data = await db.games.find_one({"id": game_id})
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    return GameState(**game_data)

@api_router.post("/game/action", response_model=GameState)
async def perform_action(request: GameActionRequest):
    """Perform a game action"""
    # Get current game state
    game_data = await db.games.find_one({"id": request.game_id})
    if not game_data:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game_state = GameState(**game_data)
    
    if game_state.status != GameStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Game is not in progress")
    
    current_player = game_state.players[game_state.current_player_index]
    
    if request.action.player_id != current_player.id:
        raise HTTPException(status_code=400, detail="Not your turn")
    
    action = request.action
    
    if action.action_type == ActionType.PASS:
        game_state.consecutive_passes += 1
    elif action.action_type == ActionType.EXCHANGE:
        # Exchange all tiles
        returned_tiles = current_player.hand.copy()
        game_state.remaining_tiles.extend(returned_tiles)
        random.shuffle(game_state.remaining_tiles)
        
        # Deal new tiles
        new_hand_size = min(len(returned_tiles), len(game_state.remaining_tiles))
        current_player.hand = game_state.remaining_tiles[:new_hand_size]
        game_state.remaining_tiles = game_state.remaining_tiles[new_hand_size:]
        game_state.consecutive_passes = 0
        
    elif action.action_type == ActionType.PLACE:
        if not action.tiles or not action.positions:
            raise HTTPException(status_code=400, detail="Tiles and positions required for placement")
        
        # Validate placement
        for i, (tile, position) in enumerate(zip(action.tiles, action.positions)):
            if not validate_tile_placement(tile, position, game_state.board):
                raise HTTPException(status_code=400, detail=f"Invalid placement for tile {i}")
        
        # Remove tiles from hand
        for tile in action.tiles:
            try:
                tile_in_hand = next(t for t in current_player.hand if t.shape == tile.shape and t.color == tile.color)
                current_player.hand.remove(tile_in_hand)
            except StopIteration:
                raise HTTPException(status_code=400, detail="Tile not in hand")
        
        # Place tiles on board
        for tile, position in zip(action.tiles, action.positions):
            placed_tile = PlacedTile(
                tile=tile,
                position=position,
                placed_by=current_player.id,
                turn_number=game_state.turn_number
            )
            game_state.board.append(placed_tile)
        
        # Calculate and add score
        score = calculate_score(list(zip(action.tiles, action.positions)), game_state.board[:-len(action.tiles)])
        current_player.score += score
        
        # Deal new tiles
        new_tiles_count = min(len(action.tiles), len(game_state.remaining_tiles))
        current_player.hand.extend(game_state.remaining_tiles[:new_tiles_count])
        game_state.remaining_tiles = game_state.remaining_tiles[new_tiles_count:]
        
        game_state.consecutive_passes = 0
        
        # Check if player used all tiles (bonus points + game end)
        if not current_player.hand:
            current_player.score += 6  # Bonus for using all tiles
            game_state.status = GameStatus.FINISHED
            game_state.winner_id = current_player.id
    
    # Move to next player
    game_state.current_player_index = (game_state.current_player_index + 1) % len(game_state.players)
    game_state.turn_number += 1
    
    # Check game end conditions
    if game_state.consecutive_passes >= len(game_state.players):
        game_state.status = GameStatus.FINISHED
        # Find winner (highest score)
        winner = max(game_state.players, key=lambda p: p.score)
        game_state.winner_id = winner.id
    
    # Update database
    await db.games.replace_one({"id": request.game_id}, game_state.dict())
    
    return game_state

@api_router.get("/game/{game_id}/tiles")
async def get_tile_types():
    """Get all possible tile types"""
    return {
        "shapes": SHAPES,
        "colors": COLORS,
        "tiles_per_type": TILES_PER_TYPE
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()