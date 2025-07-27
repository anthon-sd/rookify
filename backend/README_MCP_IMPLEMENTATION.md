# Memory Context Protocol (MCP) Implementation for Rookify

## Overview

The Memory Context Protocol (MCP) creates a personalized, emotionally intelligent AI coaching experience by maintaining long-term user memory and context. This enables the AI coach to remember a player's evolution, pain points, and goals over time.

## Architecture

### 🧠 Core Components

1. **Memory Service** (`services/memory_service.py`)
   - Manages user memory and context
   - Creates and updates memory profiles
   - Generates context for AI prompts

2. **Memory Updater** (`utils/memory_updater.py`)
   - Background task for updating memory based on game activity
   - Analyzes performance patterns and detects breakthroughs
   - Updates emotional profiles based on game outcomes

3. **Database Schema** (`migrations/add_user_memory_context.sql`)
   - `user_memory`: Core memory storage with JSONB fields
   - `memory_snapshots`: Historical snapshots for major milestones
   - `session_context`: Short-term session data

4. **API Endpoints** (added to `main.py`)
   - RESTful endpoints for memory management
   - User preference controls
   - Analytics and insights

## Database Schema

### user_memory Table
```sql
CREATE TABLE user_memory (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    memory_type VARCHAR DEFAULT 'profile',
    
    -- Core fields
    chess_level VARCHAR DEFAULT 'intermediate',
    rating_history JSONB DEFAULT '[]',
    playstyle_profile JSONB DEFAULT '{}',
    frequent_errors JSONB DEFAULT '[]',
    current_focus VARCHAR,
    
    -- Emotional intelligence
    emotional_profile JSONB DEFAULT '{}',
    frustration_tendency VARCHAR DEFAULT 'moderate',
    preferred_feedback_tone VARCHAR DEFAULT 'balanced',
    motivation_triggers JSONB DEFAULT '[]',
    
    -- Learning patterns
    session_summaries JSONB DEFAULT '[]',
    breakthrough_moments JSONB DEFAULT '[]',
    
    -- Preferences
    ui_preferences JSONB DEFAULT '{}',
    notification_preferences JSONB DEFAULT '{}',
    training_schedule JSONB DEFAULT '{}'
);
```

## API Endpoints

### Memory Management

#### `GET /api/memory/{user_id}`
Get user's complete memory profile.

**Response:**
```json
{
  "memory": {
    "id": "uuid",
    "chess_level": "intermediate",
    "rating_history": [{"rating": 1200, "timestamp": "2024-01-01T10:00:00Z"}],
    "current_focus": "tactical awareness",
    "emotional_profile": {"confidence_level": "moderate"},
    "preferred_feedback_tone": "encouraging"
  }
}
```

#### `POST /api/memory/{user_id}/update`
Update memory after a gaming session.

**Request:**
```json
{
  "new_rating": 1250,
  "performance_metrics": {
    "win_rate": 0.6,
    "blunder_rate": 0.1,
    "avg_accuracy": 78.5
  },
  "summary": "Good session with improved accuracy",
  "key_moments": ["Tactical breakthrough in game 3"],
  "breakthrough_detected": false
}
```

#### `GET /api/memory/{user_id}/context`
Get formatted context string for AI prompt injection.

**Response:**
```json
{
  "context": "Chess Level: intermediate\nCurrent Rating: 1250\nPlaystyle: aggressive\nWorking on: tactical awareness\nCommon mistakes: hanging pieces, time pressure\nPreferred feedback style: encouraging\nNote: Player confidence is moderate"
}
```

### Preferences

#### `GET /api/memory/{user_id}/preferences`
Get user preferences.

#### `PUT /api/memory/{user_id}/preferences`
Update user preferences.

**Request:**
```json
{
  "feedback_tone": "direct",
  "ui_preferences": {"theme": "dark"},
  "notification_preferences": {"email": false}
}
```

### Analytics

#### `GET /api/memory/{user_id}/analytics`
Get memory analytics and progress data.

**Response:**
```json
{
  "analytics": {
    "current_rating": 1250,
    "rating_trend": 2.5,
    "session_count": 15,
    "breakthrough_count": 2,
    "confidence_level": "moderate"
  }
}
```

#### `GET /api/memory/{user_id}/similar-users`
Find users with similar memory patterns.

### Administrative

#### `DELETE /api/memory/{user_id}/reset`
Reset user memory (fresh start).

## Usage Examples

### 1. Initialize Memory Service
```python
from services.memory_service import MemoryService

memory_service = MemoryService()
memory = await memory_service.get_or_create_memory(user_id)
```

### 2. Update Memory After Games
```python
from utils.memory_updater import MemoryUpdater

updater = MemoryUpdater()
result = await updater.update_user_memory_from_games(user_id, days=7)
```

### 3. Generate AI Context
```python
context = await memory_service.get_context_for_prompt(user_id)
# Use context in AI prompts for personalized responses
```

### 4. Update Preferences
```python
preferences = {
    'feedback_tone': 'gentle',
    'ui_preferences': {'animations': False}
}
await memory_service.update_preferences(user_id, preferences)
```

## Memory Data Structure

### Rating History
```json
[
  {"rating": 1200, "timestamp": "2024-01-01T10:00:00Z"},
  {"rating": 1220, "timestamp": "2024-01-02T15:30:00Z"}
]
```

### Playstyle Profile
```json
{
  "type": "aggressive",
  "aggressiveness": 0.7,
  "risk_tolerance": 0.6,
  "time_management": "fast"
}
```

### Emotional Profile
```json
{
  "confidence_level": "moderate",
  "tilt_susceptibility": 0.3,
  "learning_style": "visual",
  "preferred_pace": "steady"
}
```

### Session Summaries
```json
[
  {
    "timestamp": "2024-01-01T10:00:00Z",
    "summary": "Strong performance with tactical improvements",
    "key_moments": ["Breakthrough in endgame technique"],
    "mood_indicators": {"frustration_level": "low"}
  }
]
```

## AI Integration

### Context Injection Example
```python
# In AI engine
user_context = await get_user_context(user_id)

prompt = f"""
You are a personalized chess coach with deep knowledge of this player.

{user_context}

Current position analysis:
Position: {fen}
Best move: {best_move}

Provide analysis that:
1. Relates to the player's known patterns
2. Uses their preferred feedback tone
3. Builds on their current focus areas
4. References their progress when relevant
"""
```

## Setup Instructions

### 1. Run Database Migration
```bash
cd backend
python run_migration.py migrations/add_user_memory_context.sql
```

### 2. Test Implementation
```bash
python test_mcp_implementation.py
```

### 3. Start Backend with MCP
```bash
python main.py
```

## Memory Update Pipeline

### Automatic Updates
Memory is automatically updated when:
- Games are analyzed
- User completes training sessions
- Significant rating changes occur
- Breakthrough moments are detected

### Manual Updates
```python
# Update specific user
from utils.memory_updater import update_user_memory
await update_user_memory(user_id, days=7)

# Bulk update all active users
from utils.memory_updater import update_all_memories
await update_all_memories(days=7)
```

## Personalization Features

### 1. Adaptive Feedback Tone
- **Gentle**: Extra encouraging for low confidence players
- **Balanced**: Standard coaching approach
- **Direct**: Honest, critical feedback for resilient players
- **Tough Love**: Challenging feedback for competitive players

### 2. Focus Area Tracking
- Automatically detects weak areas from game analysis
- Tracks improvement over time
- Suggests targeted training

### 3. Emotional Intelligence
- Detects frustration from blunder patterns
- Adjusts coaching tone based on mood indicators
- Celebrates breakthroughs and milestones

### 4. Learning Pattern Recognition
- Tracks learning pace and retention
- Identifies effective training methods
- Personalizes difficulty progression

## Performance Considerations

### 1. Database Optimization
- JSONB fields for flexible semi-structured data
- Indexes on user_id and frequently queried fields
- Automatic cleanup of old session data

### 2. Memory Efficiency
- Session summaries limited to last 10 entries
- Rating history limited to last 50 entries
- Snapshots only for significant milestones

### 3. Caching Strategy
- Cache frequently accessed memory data
- Update cache on memory modifications
- Implement cache invalidation for real-time updates

## Security & Privacy

### 1. Data Protection
- User memory is linked to authenticated users only
- Memory reset functionality for user control
- Snapshot history for audit trail

### 2. Access Control
- Users can only access their own memory
- Admin endpoints protected with proper authorization
- Memory data is anonymized in analytics

## Monitoring & Analytics

### 1. Memory Health Metrics
- Memory creation success rate
- Context generation latency
- Update success rate

### 2. User Engagement Metrics
- Memory utilization patterns
- Preference update frequency
- Breakthrough detection accuracy

## Troubleshooting

### Common Issues

1. **Memory Creation Fails**
   - Check user exists in users table
   - Verify UserProfiler can access game data
   - Check database connection

2. **Context Generation Empty**
   - Verify memory has been created
   - Check rating_history has entries
   - Ensure user has recent activity

3. **Slow Memory Updates**
   - Check game_analysis table indexes
   - Monitor Supabase query performance
   - Consider batch processing for bulk updates

### Debug Commands
```bash
# Test memory service
python -c "
import asyncio
from services.memory_service import MemoryService
async def test():
    ms = MemoryService()
    memory = await ms.get_or_create_memory('user-id')
    print(memory)
asyncio.run(test())
"

# Check memory tables
psql -h your-host -d postgres -c "SELECT COUNT(*) FROM user_memory;"
```

## Future Enhancements

### 1. Advanced Features
- Machine learning for pattern recognition
- Collaborative filtering for similar users
- Predictive analytics for improvement suggestions

### 2. Integration Improvements
- Real-time memory updates via WebSocket
- Integration with external chess platforms
- Mobile app synchronization

### 3. Analytics Dashboard
- Memory evolution visualization
- Breakthrough moment timeline
- Personalized insights reporting

## Contributing

When working with the MCP system:

1. **Test thoroughly** - Use `test_mcp_implementation.py`
2. **Document changes** - Update this README for new features
3. **Consider privacy** - Ensure user data protection
4. **Monitor performance** - Check database query efficiency
5. **Validate context** - Ensure AI context is meaningful

## Support

For issues with the MCP implementation:

1. Check the test suite output
2. Review database logs for errors
3. Verify memory service initialization
4. Check API endpoint responses
5. Monitor memory update pipeline 