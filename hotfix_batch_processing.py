#!/usr/bin/env python3
"""
Hotfix for batch processing 'int' object is not iterable error
This script provides a defensive wrapper for analyze_game_moments
"""

def safe_analyze_game_moments(analyzer, moments, depth=12, user_rating=1500, user_level="intermediate"):
    """
    Safe wrapper for analyze_game_moments that handles parameter validation
    """
    print(f"🛡️ HOTFIX: safe_analyze_game_moments called")
    print(f"   - moments type: {type(moments)}")
    print(f"   - depth: {depth} (type: {type(depth)})")
    print(f"   - user_rating: {user_rating} (type: {type(user_rating)})")
    print(f"   - user_level: {user_level} (type: {type(user_level)})")
    
    # Defensive parameter validation
    if not isinstance(moments, list):
        print(f"❌ HOTFIX: moments is not a list (got {type(moments)}), converting to empty list")
        moments = []
    
    if not isinstance(depth, int):
        print(f"⚠️ HOTFIX: depth is not an int (got {type(depth)}), using default 12")
        depth = 12
    
    if not isinstance(user_rating, int):
        print(f"⚠️ HOTFIX: user_rating is not an int (got {type(user_rating)}), using default 1500")
        user_rating = 1500
        
    if not isinstance(user_level, str):
        print(f"⚠️ HOTFIX: user_level is not a str (got {type(user_level)}), using default 'intermediate'")
        user_level = "intermediate"
    
    if len(moments) == 0:
        print("⚠️ HOTFIX: No moments to analyze, returning empty list")
        return []
    
    # Validate each moment is a dictionary
    valid_moments = []
    for i, moment in enumerate(moments):
        if isinstance(moment, dict):
            valid_moments.append(moment)
        else:
            print(f"⚠️ HOTFIX: Moment {i} is not a dict (got {type(moment)}), skipping")
    
    if len(valid_moments) == 0:
        print("⚠️ HOTFIX: No valid moments found, returning empty list")
        return []
    
    print(f"✅ HOTFIX: Calling analyzer.analyze_game_moments with {len(valid_moments)} valid moments")
    
    try:
        # Call the actual function with validated parameters
        result = analyzer.analyze_game_moments(
            moments=valid_moments,
            depth=depth,
            user_rating=user_rating,
            user_level=user_level
        )
        print(f"✅ HOTFIX: analyze_game_moments returned {len(result) if isinstance(result, list) else type(result)}")
        return result if isinstance(result, list) else []
        
    except Exception as e:
        print(f"❌ HOTFIX: analyze_game_moments failed: {e}")
        import traceback
        print(f"❌ HOTFIX: Full traceback: {traceback.format_exc()}")
        
        # Return empty list as fallback
        return []

# Instructions for applying this hotfix:
print("""
🛡️ HOTFIX INSTRUCTIONS:

To apply this hotfix to your running system:

1. Copy this file to your backend directory
2. In main.py, replace the problematic analyze_game_moments call with:

   # BEFORE:
   analyzed_moments = analyzer.analyze_game_moments(
       moments, 
       depth=12, 
       user_rating=user_rating,
       user_level="intermediate"
   )
   
   # AFTER:
   from hotfix_batch_processing import safe_analyze_game_moments
   analyzed_moments = safe_analyze_game_moments(
       analyzer,
       moments, 
       depth=12, 
       user_rating=user_rating,
       user_level="intermediate"
   )

3. Restart the backend service

This hotfix will:
- ✅ Validate all parameters before calling the function
- ✅ Convert invalid parameters to safe defaults
- ✅ Handle any remaining errors gracefully
- ✅ Provide detailed logging for debugging
- ✅ Return empty list instead of crashing

The hotfix maintains backward compatibility while preventing the crash.
""")

if __name__ == "__main__":
    # Test the validation logic
    print("🧪 Testing hotfix validation logic...")
    
    # Test cases
    test_cases = [
        ([], 12, 1500, "intermediate"),  # Empty list
        ("not a list", 12, 1500, "intermediate"),  # Invalid moments
        ([{"test": "moment"}], "not int", 1500, "intermediate"),  # Invalid depth
        ([{"test": "moment"}], 12, "not int", "intermediate"),  # Invalid rating
        ([{"test": "moment"}], 12, 1500, 123),  # Invalid level
    ]
    
    class MockAnalyzer:
        def analyze_game_moments(self, moments, depth=12, user_rating=1500, user_level="intermediate"):
            return [{"analyzed": True}] * len(moments)
    
    analyzer = MockAnalyzer()
    
    for i, (moments, depth, user_rating, user_level) in enumerate(test_cases):
        print(f"\n🧪 Test case {i+1}:")
        result = safe_analyze_game_moments(analyzer, moments, depth, user_rating, user_level)
        print(f"   Result: {len(result)} moments")
    
    print("\n✅ Hotfix validation tests completed!") 