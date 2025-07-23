# Schema Compatibility: Supabase ↔ Pinecone

This document outlines the schema compatibility improvements made to ensure seamless data flow between Supabase (primary database) and Pinecone (vector database).

## Overview

The Rookify system uses two databases:
1. **Supabase PostgreSQL** - Primary storage for structured game data
2. **Pinecone Vector DB** - Vector storage for similarity search and AI recommendations

Previously, these systems had incompatible schemas that caused data loss and prevented effective vector search. This update resolves those issues.

## Schema Changes

### Enhanced Supabase Schema

The `game_analysis` table has been enhanced with additional columns to store metadata that Pinecone requires:

#### New Columns Added:
```sql
-- Chess platform specific fields
white_username VARCHAR,
black_username VARCHAR,
white_rating INTEGER,
black_rating INTEGER,
user_color VARCHAR CHECK (user_color IN ('white', 'black')),
result VARCHAR CHECK (result IN ('1-0', '0-1', '1/2-1/2')),
time_control VARCHAR,
game_timestamp TIMESTAMP WITH TIME ZONE,

-- Opening information
opening_name VARCHAR,
eco_code VARCHAR,

-- Game statistics
avg_accuracy FLOAT,
total_moves INTEGER,
blunders_count INTEGER DEFAULT 0,
mistakes_count INTEGER DEFAULT 0,
inaccuracies_count INTEGER DEFAULT 0,

-- Pinecone sync tracking
pinecone_uploaded BOOLEAN DEFAULT FALSE,
pinecone_vector_count INTEGER DEFAULT 0,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
```

#### Enhanced Recommendations Table:
```sql
-- Better matching metadata
skill_category VARCHAR,
sub_skill VARCHAR,
phase VARCHAR,
confidence FLOAT,
position_fen TEXT,
move VARCHAR,
accuracy_class VARCHAR,
delta_cp FLOAT
```

### Pinecone Schema Compatibility

Each game moment in Supabase's `key_moments` JSONB field is converted to individual vectors in Pinecone with comprehensive metadata:

#### Vector Metadata Structure:
```javascript
{
  // Game identification
  user_id: string,
  game_id: string,
  supabase_game_id: string,
  
  // Game context
  color: "white" | "black",
  opponent_rating: number,
  user_rating: number,
  result: "1-0" | "0-1" | "1/2-1/2",
  timestamp: ISO_datetime,
  source: "chess.com" | "lichess",
  
  // Position data
  move_number: number,
  fen: string,
  move: string,
  eval_score: number,
  stockfish_best: string,
  delta_cp: number,
  accuracy_class: string,
  
  // Analysis context
  phase: "opening" | "middlegame" | "endgame",
  skill_category: string,
  sub_skill: string,
  score_impact: number,
  commentary: string,
  
  // Opening information
  opening_name: string,
  eco_code: string,
  
  // Additional flags
  is_tactical_puzzle: boolean,
  is_brilliant: boolean,
  is_great: boolean, // Derived from accuracy_class == "Great"
  game_url: string
}
```

## Migration Process

### 1. Database Migration
Apply the schema migration:
```bash
psql -h your-supabase-host -d postgres -f backend/migrations/update_schema_for_pinecone_compatibility.sql
```

### 2. Data Enhancement
Existing games will have enhanced metadata extracted from their PGN data automatically when synced.

### 3. Pinecone Sync
Use the new sync utility to upload existing games to Pinecone:
```bash
cd backend
python sync_to_pinecone.py --help
```

#### Sync Options:
```bash
# Sync all unsynced games
python sync_to_pinecone.py

# Sync specific user's games
python sync_to_pinecone.py --user-id "user-uuid"

# Sync with limit (for testing)
python sync_to_pinecone.py --limit 10

# Dry run (don't actually upload)
python sync_to_pinecone.py --dry-run

# Sync all games (including previously synced)
python sync_to_pinecone.py --all
```

## Data Flow

### Game Analysis Process:
1. **Game Import** → Chess.com/Lichess API retrieves PGN
2. **PGN Parsing** → Extract metadata (players, ratings, opening, etc.)
3. **AI Analysis** → Generate key moments with evaluations
4. **Supabase Storage** → Save with enhanced metadata
5. **Vector Generation** → Convert moments to embeddings
6. **Pinecone Upload** → Store vectors with comprehensive metadata
7. **Sync Tracking** → Mark as uploaded in Supabase

### Vector Search Process:
1. **User Query** → Natural language or position-based
2. **Embedding Generation** → Convert query to vector
3. **Pinecone Search** → Find similar positions/patterns
4. **Metadata Filtering** → Apply user/skill/phase filters
5. **Result Enhancement** → Enrich with Supabase data if needed

## Benefits of Enhanced Schema

### ✅ Data Consistency
- No more data loss between systems
- All metadata preserved and accessible
- Bidirectional compatibility

### ✅ Enhanced Search Capabilities
- Filter by player rating ranges
- Search by opening, phase, or skill category
- Find tactical patterns by user color
- Temporal filtering by game date

### ✅ Better Recommendations
- Skill-based recommendations with confidence scores
- Position-specific training suggestions
- Phase-aware pattern matching

### ✅ Operational Benefits
- Sync status tracking prevents duplicate uploads
- Error handling and retry mechanisms
- Performance metrics and monitoring

## Backwards Compatibility

The enhanced schema is fully backwards compatible:
- Existing queries continue to work
- Old data is automatically enhanced on next sync
- New fields are optional with sensible defaults
- Migration can be applied incrementally

## Future Enhancements

### Planned Improvements:
1. **Real-time Sync** - Automatic Pinecone upload on game analysis
2. **Advanced Filtering** - Time control, tournament type, etc.
3. **Smart Deduplication** - Prevent duplicate vector uploads
4. **Performance Optimization** - Batch operations and caching
5. **Analytics Integration** - Usage metrics and query optimization

## Troubleshooting

### Common Issues:

#### 1. Missing PGN Metadata
Some games may lack complete PGN headers. The system gracefully handles this by:
- Using default values for missing fields
- Inferring data where possible (e.g., user color from username)
- Logging warnings for manual review

#### 2. Pinecone Rate Limits
Large sync operations may hit rate limits:
- Use `--limit` parameter for incremental sync
- The system includes automatic retry logic
- Progress is saved, so interrupted syncs can resume

#### 3. Schema Conflicts
If you encounter schema conflicts:
- Check for custom modifications to tables
- Verify column types match expectations
- Run migration with `IF NOT EXISTS` clauses

### Monitoring Commands:
```bash
# Check sync status
python sync_to_pinecone.py --dry-run --limit 1

# Count unsynced games
psql -c "SELECT COUNT(*) FROM game_analysis WHERE pinecone_uploaded = FALSE"

# Check Pinecone index stats
python -c "
from pinecone_upload import pc
index = pc.Index('rookify-user-data')
print(index.describe_index_stats())
"
```

## Support

For issues related to schema compatibility:
1. Check the migration logs for any failed operations
2. Verify environment variables are set correctly
3. Test with a small dataset first (`--limit 5 --dry-run`)
4. Check both Supabase and Pinecone for data consistency

The enhanced schema ensures robust, scalable data flow between your databases while maintaining backwards compatibility and enabling advanced AI-powered features. 