# Game Sync Filtering Implementation

## Overview
The platform sync functionality has been enhanced to allow users to filter games by:
- **Game Type**: bullet, blitz, rapid, classical
- **Result**: win, loss, draw (from user's perspective)
- **Color**: white, black

## Changes Made

### Backend Changes (`backend/main.py`)

1. **Updated SyncRequest Model**
   - Added `game_types: Optional[List[str]]`
   - Added `results: Optional[List[str]]`
   - Added `colors: Optional[List[str]]`

2. **Added Helper Functions**
   - `classify_time_control()`: Categorizes time controls into game types
   - `should_include_game()`: Filters games based on user criteria

3. **Updated Process Logic**
   - Added filtering step after fetching games but before analysis
   - Optimized Lichess API calls to filter at API level when possible

### Frontend Changes (`frontend/chess-coach-frontend/src/components/SyncModal.js`)

1. **Added Filter State**
   - Game type checkboxes (bullet, blitz, rapid, classical)
   - Result checkboxes (win, loss, draw)
   - Color checkboxes (white, black)

2. **Updated Form Submission**
   - Filters are included in sync request
   - Default settings favor common game types (blitz, rapid)

3. **Enhanced UI**
   - Added filter controls with helpful descriptions
   - Proper state management and reset functionality

### Styling (`frontend/chess-coach-frontend/src/components/SyncModal.css`)

- Added responsive checkbox layouts
- Hover effects and proper styling for filter controls

## Game Type Classification

Time controls are classified as follows:
- **Bullet**: < 3 minutes total time
- **Blitz**: 3-10 minutes total time  
- **Rapid**: 10-30 minutes total time
- **Classical**: ≥ 30 minutes total time

Total time = base_time + (40 × increment) to account for typical game length.

## Filter Behavior

### Game Types
- Filters based on actual time control in PGN
- Multiple selections act as OR logic (include any selected type)
- Default: blitz and rapid enabled

### Results
- Converted to user's perspective (win/loss/draw)
- Based on PGN Result header and user's color
- Default: all results enabled

### Colors
- Filters based on which color the user played
- Determined by comparing username with White/Black headers
- Default: both colors enabled

## Platform-Specific Handling

### Chess.com
- Filtering happens server-side after fetching games
- All games in date range are fetched, then filtered

### Lichess
- Game type filtering happens at API level for efficiency
- Result and color filtering still happens server-side

## Usage Example

```javascript
// Frontend sync request
const syncData = {
  platform: "chess.com",
  username: "myusername",
  fromDate: "2024-01-01",
  toDate: "2024-01-31",
  game_types: ["blitz", "rapid"],
  results: ["win", "draw"],
  colors: ["white"]
};
```

## Testing

A test function is included in `main.py` that validates:
- Time control classification accuracy
- PGN parsing for filtering criteria
- Filter logic with various scenarios

To run tests, uncomment the `test_filtering()` call in `main.py`.

## Performance Considerations

- Filtering reduces the number of games analyzed, saving computational resources
- Lichess API-level filtering reduces network traffic
- Server-side filtering ensures accurate results based on actual game metadata 