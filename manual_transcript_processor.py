import os
import json
from openai import OpenAI
from pinecone import Pinecone
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Debug: Print current working directory and check if .env exists
print(f"Current working directory: {os.getcwd()}")
print(f".env file exists: {os.path.exists('.env')}")

# Initialize OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
print(f"OPENAI_API_KEY loaded: {'Yes' if OPENAI_API_KEY else 'No'}")

# Initialize Pinecone
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
print(f"PINECONE_API_KEY loaded: {'Yes' if PINECONE_API_KEY else 'No'}")

if not OPENAI_API_KEY or not PINECONE_API_KEY:
    print("Error: API keys not found in environment variables")
    print("Please ensure your .env file contains both OPENAI_API_KEY and PINECONE_API_KEY")
    exit(1)

client = OpenAI(api_key=OPENAI_API_KEY)

# Initialize Pinecone with new API
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index("rookify-index")

# Chess taxonomy for content categorization
chess_taxonomy = {
    "Rules of the game": {
        "Board setup": "Opening",
        "Piece movements": "All",
        "Check, checkmate, stalemate": "All",
        "Castling": "Opening",
        "Promotion": "Endgame",
        "En passant": "All",
        "Notation": "All",
    },
    "Point value of pieces": {
        "Understand good vs bad trades": "All"
    },
    "Very basic opening principles": {
        "Control the center": "All",
        "Develop your pieces": "Opening",
        "Castle before move 10": "Opening",
        "Don't bring queen out early": "Opening"
    },
    "Types of pieces": {
        "Pawns": "All",
        "Minor pieces (knights+bishops)": "All",
        "Major pieces (queens + rooks)": "All"
    },
    "Blunder check": {
        "Check your king": "All",
        "Check opponent's king": "All",
        "Check your major/minor pieces": "All",
        "Check opponent's major/minor pieces": "All"
    },
    "Basic tactics": {
        "Knight forks": "All",
        "Pawn forks": "All",
        "Queen forks": "All",
        "Bishop pins": "All",
        "Rook pins": "All",
        "Back rank mate": "All"
    },
    "1 Move tactics": {
        "Mate-in-1's": "All",
        "1 move fork, pin, skewer, etc": "All"
    },
    "Basic endgame mates": {
        "King + Queen vs King mate": "Endgame",
        "King + Rook vs King mate": "Endgame"
    },
    "Basic endgame principles": {
        "Activate your king": "Endgame",
        "Create passed pawns": "Endgame",
        "Push passed pawns": "Endgame",
        "Watch out for opponent's passed pawns": "Endgame"
    },
    "Basic positional ideas": {
        "Holes/outposts": "Middlegame",
        "Good vs bad bishops": "Middlegame",
        "Weak squares": "Middlegame",
        "Weak vs safe king": "Middlegame",
        "Dominated knights": "Middlegame",
        "Rooks are good on 7th rank": "Endgame",
        "Rooks should go to open or half open files": "Middlegame"
    },
    "Very basic opening repertoire": {
        "Systems as white against black's 3 most common replies": "Opening",
        "System as black against e4": "Opening",
        "System as black against d4": "Opening"
    },
    "Basic opening ideas": {
        "Understand the key ideas with your white systems": "Opening",
        "Understand key ideas with black systems": "Opening"
    },
    "Intermediate tactics": {
        "Trapped piece": "All",
        "Batteries": "All",
        "Double checks": "All",
        "Discovered checks": "All",
        "Discovered Attacks": "All",
        "Deflection": "All",
        "Overloaded defender": "All",
        "Skewer": "All"
    },
    "2-3 move tactics": {
        "Mate-in-2's": "All",
        "Mate-in-3's": "All",
        "2 move combinations to win material": "All",
        "3 move combinations to win material": "All"
    },
    "Unbalanced trades": {
        "2 minor pieces vs rook+pawn": "All",
        "3 minor pieces vs queen": "All",
        "Minor piece + 2 pawns vs rook": "All",
        "2 rooks vs queen": "All",
        "Rook + bishop vs queen": "All",
        "Rook + knight vs queen": "All"
    },
    "King and pawn endgames": {
        "Opposition (what it is)": "Endgame",
        "King in the box (to catch pawns)": "Endgame",
        "King + pawn vs king (winning)": "Endgame",
        "King + pawn vs king (drawn)": "Endgame",
        "Opposition (when and how to use it)": "Endgame",
        "The power of passed pawns": "Endgame",
        "Crooked king path": "Endgame",
        "Zugzwang": "Endgame"
    },
    "Pawn structures": {
        "Pawn islands": "All",
        "Pawn chains": "All",
        "Passed pawns": "All",
        "Tripled pawns": "All",
        "Connected pawns": "All",
        "Isolated pawns": "All",
        "Doubled pawns": "All",
        "Backward pawns": "All",
        "Pawn majority vs pawn minority": "All"
    },
    "Mating patterns": {
        "Queen next to king": "All",
        "Back rank mate": "All",
        "Ladder mate": "All",
        "Lolli's mate": "All",
        "Damiano's mate": "All",
        "Dovetail + Swallow's tail mate": "All",
        "Epaulette mate": "All",
        "Greco's mate": "All",
        "Blind swine mate": "All",
        "Anastasia's mate": "All",
        "Hook mate": "All",
        "Opera's mate": "All",
        "Morphy and Pillsbury's mate": "All",
        "Vukovic's mate": "All",
        "Reti's mate": "All",
        "Boden's mate": "All",
        "Double bishop mate": "All",
        "Legal's mate": "All",
        "Knight and bishop combo mate": "All",
        "Smothered mate": "All"
    },
    "Understand how to defend your king against threats": {
        "Know when to NOT castle": "Middlegame",
        "Monitor opponent's queen carefully": "Middlegame",
        "Trading pieces": "Middlegame",
        "Plan BEFORE attack occurs": "Middlegame",
        "Counterattack!": "Middlegame",
        "Avoid open files on king": "Middlegame",
        "Consider ALL threats": "Middlegame",
        "f4/f5 idea on kingside castling": "Middlegame",
        "NOT capturing your opponent's pawn": "Middlegame"
    },
    "Attacking principles": {
        "Lead in development": "Middlegame",
        "Central control": "Middlegame",
        "Exposed enemy king": "Middlegame",
        "Tactics are required": "Middlegame",
        "Opposite side castling": "Middlegame",
        "Need advantages": "Middlegame",
        "Attack specific weaknesses": "Middlegame",
        "Have/create open lines": "Middlegame",
        "Remove key defenders": "Middlegame",
        "Momentum is important": "Middlegame",
        "Certain openings lead to more aggressive positions": "Middlegame",
        "Generally it's easier to attack than to defend": "Middlegame",
        "Have enough pieces": "Middlegame",
        "Use ALL your pieces": "Middlegame",
        "Sacrifice multiple pieces when necessary": "Middlegame",
        "Doesn't have to end in checkmate": "Middlegame",
        "Know ALL common mating patterns": "Middlegame"
    },
    "How to analyze your games": {
        "Know how to check databases for similar games": "All",
        "Know how to use stockfish to find mistakes": "All",
        "Fix opening problems and poor plans based on above analysis": "All"
    },
    "The process for making a good plan": {
        "Prioritize": "Middlegame",
        "Attack or defend?": "Middlegame",
        "Short-term vs Long-term": "Middlegame",
        "Easy to stop?": "Middlegame",
        "Multiple plans at the same time?": "Middlegame",
        "Specific tactics": "Middlegame"
    },
    "Mating nets": {
        "What is a mating net": "Middlegame",
        "The power of mating nets": "Middlegame",
        "How to recognize and set up mating nets in your games": "Middlegame"
    },
    "Understand all official rules for tournaments": {
        "Touch move": "All",
        "Notating on boards without coordinates": "All",
        "Understand different time controls": "All",
        "Know how to set your digital clock": "All",
        "Threefold repetition": "All",
        "Fifty-move rule": "All"
    },
    "Time management": {
        "Practice using time at the right moments in the game": "All"
    },
    "Intermediate positional ideas": {
        "Understand when to trade a knight for a bishop": "Middlegame",
        "Understand that moving pawns forward can create permanent weaknesses": "Middlegame",
        "Importance of blockading weak pawns (isolated, doubled, backward)": "Middlegame",
        "Exchange sacrifice": "Middlegame",
        "Weak color complex": "Middlegame",
        "Minority attack": "Middlegame"
    },
    "Intermediate endgame mates": {
        "King + 2 bishops vs king mate": "Endgame",
        "King + knight + bishop vs king mate": "Endgame"
    },
    "Intermediate rook endgames": {
        "King + Rook vs King + Pawn (how to stop the pawn)": "Endgame",
        "Importance of cutting off the king": "Endgame",
        "Lucena position": "Endgame",
        "Philidor position": "Endgame"
    },
    "Specific opening pawn structures": {
        "Caro formation": "Middlegame",
        "Slav formation": "Middlegame",
        "Sicilian - Scheveningen formation": "Middlegame",
        "Sicilian - Dragon formation": "Middlegame",
        "Boleslavsky hole formation": "Middlegame",
        "Maroczy Bind formation": "Middlegame",
        "Hedgehog formation": "Middlegame",
        "Rauzer formation": "Middlegame",
        "d5 chain formation": "Middlegame",
        "e5 chain formation": "Middlegame",
        "Modern Benoni formation": "Middlegame",
        "Isolated d pawn formation": "Middlegame",
        "Hanging pawns formation": "Middlegame",
        "Panov formation": "Middlegame",
        "Stonewall formation": "Middlegame",
        "Closed Sicilian formation": "Middlegame",
        "Botvinnik system formation": "Middlegame"
    },
    "Full opening repertoire": {
        "Complete lines with white until move 10 (approximately)": "Opening",
        "Complete lines with black until move 10 (approximately)": "Opening"
    },
    "Keep emotions under control": {
        "Fear/doubt": "All",
        "Overconfidence": "All",
        "Laziness": "All",
        "Tilt": "All"
    },
    "Queen + pawn endgames": {
        "Queen vs b,d,e or g pawns": "Endgame",
        "Queen vs a or h pawns": "Endgame",
        "Queen vs c or f pawns": "Endgame",
        "Queen vs Queen + pawn": "Endgame",
        "Queens with multiple pawns on the board": "Endgame"
    },
    "Bishop endgames": {
        "Opposite colored bishops": "Endgame",
        "Same colored bishops": "Endgame",
        "1 bishop vs 2 connected pawns": "Endgame",
        "Bishop + 1 pawn vs bishop (same color)": "Endgame",
        "Bishops and multiple pawns": "Endgame"
    },
    "Knight endgames": {
        "Knight vs outside passed pawn": "Endgame",
        "Knight vs center passed pawn": "Endgame",
        "Knight + pawn vs Knight": "Endgame",
        "Knight + extra pawn(s) vs knight and pawns": "Endgame"
    },
    "Minor piece endgames": {
        "Pawns on only one side of the board": "Endgame",
        "Pawns on both sides of the board": "Endgame",
        "Closed positions": "Endgame",
        "Open positions": "Endgame",
        "Knight vs bishop situations": "Endgame"
    },
    "Sacrifice ideas": {
        "Positional pawn sacrifice": "All",
        "f2/f7 piece sacrifice": "Middlegame",
        "Greek gift sacrifice": "Middlegame",
        "Nd5 piece sacrifice": "Middlegame",
        "Fishing pole sacrifice": "Middlegame"
    },
    "Advanced tactics": {
        "Mate-in-4 or more moves": "All",
        "4+ move combinations": "All",
        "Wide variety of tactical motifs": "All"
    },
    "Advanced endgames": {
        "King triangulation (losing a tempo)": "Endgame",
        "Stalemate ideas": "Endgame",
        "Queen + King vs Rook + King": "Endgame",
        "Queen + King vs Knight + King": "Endgame",
        "Rook + King vs Bishop + King": "Endgame",
        "Rook + King vs Knight + King": "Endgame",
        "Rook + Bishop + King vs Rook + King": "Endgame",
        "Rook + Knight + King vs Rook + King": "Endgame"
    },
    "In-depth opening knowledge": {
        "Complete lines with white until move 15-20 (approximately)": "Opening",
        "Complete lines with black until move 15-20 (approximately)": "Opening",
        "Up to date on current opening theory from top GM games": "Opening",
        "Understand long term ideas and plans behind all openings you play": "Opening",
        "Understand all resulting pawn structures from openings played": "Opening",
        "Understand complex transpositions from one line to another": "Opening"
    },
    "GM thought process": {
        "Evaluate positions properly": "All",
        "Only calculate each line once, but accurately": "All",
        "Choose the correct candidate moves": "All",
        "Eliminate bad moves quickly": "All",
        "Ability to separate long term positional ideas from short term concrete lines": "All"
    },
    "External factors": {
        "Enough sleep before and during tournaments": "All",
        "Healthy diet": "All",
        "Regular exercise": "All"
    }
}

def get_embedding(text, model="text-embedding-ada-002"):
    """Get embedding for a text using OpenAI's API."""
    try:
        response = client.embeddings.create(
            model=model,
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"Error getting embedding: {str(e)}")
        return None

def process_manual_transcript(transcript_text, video_id):
    # Use GPT-4 to break down the transcript into meaningful chunks
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    # First, get GPT-4 to analyze and chunk the content
    chunking_prompt = f"""Analyze this chess tutorial transcript and break it down into meaningful chunks based on the following chess taxonomy:
    {json.dumps(chess_taxonomy, indent=2)}
    
    For each chunk:
    1. Identify the main skill and sub-skill being taught from the taxonomy
    2. Keep related concepts together
    3. Make chunks self-contained but concise
    4. Include relevant context
    5. Note the game phase (Opening, Middlegame, Endgame, or All) from the taxonomy
    
    Transcript:
    {transcript_text}
    
    Return the chunks as a JSON array of objects with this structure:
    {{
        "text": "chunk text",
        "skill": "main skill from taxonomy",
        "sub_skill": "sub-skill from taxonomy",
        "phase": "game phase from taxonomy",
        "context": "brief context about what this chunk teaches"
    }}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a chess education expert that helps break down chess tutorials into meaningful learning segments."},
                {"role": "user", "content": chunking_prompt}
            ],
            temperature=0.3
        )
        
        # Debug: Print the raw response from GPT-4
        print("\n--- RAW GPT-4 RESPONSE ---\n")
        print(response.choices[0].message.content)
        print("\n--- END RAW RESPONSE ---\n")
        
        # Parse the chunks from GPT-4's response
        try:
            chunks = json.loads(response.choices[0].message.content)
        except Exception as json_err:
            print(f"Error parsing GPT-4 response as JSON: {json_err}")
            return []
        
        # Process each chunk
        items = []
        for idx, chunk in enumerate(chunks):
            # Get embedding for the chunk
            embedding = get_embedding(chunk["text"])
            if embedding is None:
                continue
                
            item = {
                "id": f"{video_id}_{idx}",
                "embedding": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "skill": chunk["skill"],
                    "sub_skill": chunk["sub_skill"],
                    "phase": chunk["phase"],
                    "context": chunk["context"],
                    "source": f"https://youtube.com/watch?v={video_id}",
                    "chunk_index": idx
                }
            }
            items.append(item)
            
        return items
        
    except Exception as e:
        print(f"Error processing transcript: {str(e)}")
        return []

# Example usage:
# video_id = "MTgUJ219JIo"
# manual_transcript = "in this video i'm going to teach you how to play chess so chess is a two player game played on a board of dark and light colored squares you've got white pieces and black pieces and white always goes first and then players just take turns making moves one at a time the objective of the game is to checkmate your opponent's king so these are the kings they usually have some sort of little cross on the top of them sometimes they look a little different but that's how you can tell which one's the king and which one's the queen just look for the little cross checkmate it just means that you've trapped the other person's king and we'll talk about that more once we learn how all the pieces move so there are six different types of pieces there's rooks knights bishops queens kings and pawns on a chess board and they all have different ways that they move so what i'm going to do now is just go one at a time and talk about how each of them move the rook moves in straight lines it can be up or down left or right and it can go as far as it wants to as long as it's not blocked by another piece so if this black knight was right here i could no longer go to these two squares with my rook because i'm blocked by the knight and rooks capture pieces just by landing on top of this the square that they're trying to capture so if you're going to move somewhere you just land on top and take the piece bishops move diagonally so these are diagonals it's basically just squares that are connected on their corners and again it can go as far as it wants to just like the rook as long as it's not blocked by another piece so like here i couldn't go to those three squares anymore and capturing you just land on top of the piece you're trying to capture queens are the most powerful piece on a chessboard and you only have one of these you have two rooks two bishops and only one queen but the queen moves just like a rook and a bishop combined so it can move in straight lines up and down left and right it can also move diagonally like bishops so as you can see it covers a lot of squares but also it can't you know go through pieces so now i can't go to these three squares and if i want to capture something i just move on top of it the king which is the piece that you're trying to checkmate you're trying to checkmate your opponent's king and obviously not get your king checkmated uh king just moves in one one square in any direction so up down diagonally left right sideways just one square that's it pretty pretty straightforward knight is a cool piece um it's one of the trickier ones to understand but it's not too bad it moves in an l shape like that and the l shape could be any any rotation so it could be over here to this this way it could be down here these are the squares that the knight can go to and if if an l shape doesn't really make sense another way to think about it is it moves two spaces in one direction followed by one to the side and so two in one direction and then one to the side of that either up or down like that two down and then one over and you can see how it still makes the l shape the other cool thing about the knight is that it is allowed to jump over other pieces so even if this knight was completely surrounded by like a bunch of pawns i could still jump to these squares it doesn't matter that there are pieces in my way i can always go to the squares that are in an l-shape for me so that's a cool thing about knights and last but not least well they are at least they're kind of the worst piece but they're a little bit tricky to understand are the pawns so pawns move one space forward so just like that you just go one space forward the tricky part is that they don't capture pieces the same way that they move so all the other pieces that we looked at if they land if they move to a square and there's another piece on it you just capture the piece so just real quick as an example if i move my rook up to where this bishop is i just capture it because i landed on top of it well pawns cannot capture the way that they move so what that means is if there's a piece in front of a pawn it can't move like that pawns capture diagonally up so if there's a piece over here like another bishop's over here i could capture it like that diagonally but if if it's just like this i'm stuck this pawn can't move because it's blocked by the piece so pawns move one way they move once base forward and they capture a different way the other thing about pawns is that on the very first move of the game so if they're on this the starting uh the starting rank so where they first start at the beginning of the game they're allowed to move two spaces it's just like a special thing that they could do only on their first move if you want so instead of just one you can go two spaces and the other thing about pawns they are not allowed to move backwards so once they go forward can't move them backwards all the other pieces can go forwards backwards it doesn't matter pawns have to go forward only so just to recap they move one space forward but they capture diagonally forward all right so now that you know how all the pieces move the next thing you need to understand is what check and checkmate are so in chess check just means that a king is under attack and checkmate means a king is under attack and it can't move or you can't do anything to get out of check so in this position if white moves the rook up here that's a check on black's king because as you can see since rooks move in straight lines it's attacking the square that the king's on so on black's turn he would have to move his king out of the way so like right up there so it's no longer check because he's out of the line of the rook however white's next move can be to move the rook up here and this would be an example of checkmate and the reason why is the rook is attacking the king and if the king tries to move let's say up here it would still be in line with this rook putting it in check so you can't do that and if you check all the spots that the black king can move to they're all covered by these rooks so it's checkmate there's nothing that black can do to get out of this position now if i were to like add a piece let's say this bishop is sitting over here in this position it's not checkmate anymore because black can move their bishop back here and block the rook so [Music] that's just an example of check and checkmate alright so now you know how all the pieces move and you know what check and checkmate are the last thing about chess is that there are three special moves in the game that are just kind of in their own category they're just kind of weird they don't follow the other rules and so we're going to talk about those now the first one is called pawn promotion so if this is the position in the in the game and you're white then you move this pawn up and say black moves his king here move your pawn up like moves his king here and your pawn reaches the back of the back rank you can get any piece that you want so normally it's a queen but you could get a rook a knight or a bishop and the pawn just transforms into that piece and you can have multiple pieces of the same thing you can have two three four or five queens if you got all your pawns back there and turned them into queens so that's a cool thing about pawns it's hard to do because they only move one space at a time but it does happen and that's something that you definitely need to understand so that's pawn promotion so the second special move in chess is called castling castling happens between the king and one of the rooks you can do it both directions you can castle king side or you can castle queen side and the way castling works is as long as you have not moved your king or your rook that you're trying to castle with you move your king two spaces over and the rook jumps around so castling is the only move when the king is allowed to move two spaces at one time and let me just back it up you can also do it on the other side two spaces over and the rook hops to the other side of the king one other thing to note about castling you're not allowed to castle if you're in check so if this knight was gone and black's bishop was over here since i'm in check i'm not allowed to castle also you cannot castle if your king passes through check so if like i said you move your king over two spaces if you happen to land in a check when you tried to do that you would not be allowed to do it so i'm going to move this pawn up here and i'm going to put this white bishop over here as an example so if you notice that bishop controls this square so if i were to try to castle this way my king is going to pass through that square so i'm not allowed to do to do that however i could castle on this side no problem and the rook would jump around okay so that's a special move uh number two in chess all right so the last special move in chess is called on passant and it involves two pawns so let me show you an example i think amazon stands for like in passing in french or something but anyway um if i move my pawn up and let's say black moves his pawn up and i move my pawn up again normally this pawn could capture pieces that landed here and here right it captures forward diagonally one space so those are the two spaces that the pawn could capture pieces for example if black moved this pawn up i could capture it that's just normally how the pawns work i'm going to back up on passant is a special case where if your opponent tries to move their pawn two spaces and lands directly um on the side of your pawn you can still capture it like you would normally capture that pawn just like that and this guy would go away so let me back up one more time just to recap even if they jump past you where it looks like you know you shouldn't be able to capture it so we'll do it on this side now if it lands side by side your pawn you can still capture it normally just like that and it goes away okay so that's on poissant that's a special move with the pawn now one thing that you have to be aware of we'll go back to this side if black plays this move you have one chance to do that you have to do it your very next move and take their pawn if you don't and you move something else like your knight you can no longer capture that pawn so you only get one chance to do it so that's just something to be aware of but that is on passant that's the last of the three special moves in chess so we've talked about uh pawn promotion when a pawn makes it to the end of the board you can get any piece you want castling with your king and your rook and then on passant special move between pawns that's it for this video i hope you learned something if you could give it a thumbs up if you enjoyed it i would really appreciate it and let me know in the comments below if there's something that you want me to do another video on and subscribe if you don't want to miss out on any more videos like this one thanks a lot"

# Read video_id and transcript from an external file
# For example, from content_processing/MTgUJ219JIo.txt
# The file should contain lines like:
# video_id = "MTgUJ219JIo"
# transcript = "your transcript text here"
# You can use a simple parsing approach or a more robust one depending on your needs.

# Example parsing (assuming the file is in the format shown above):
import os

def read_video_data(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    # Simple parsing: assume the file contains lines like 'video_id = "..."' and 'transcript = "..."'
    # You might want to use a more robust approach (e.g., using a config parser or regex) in production.
    video_id = None
    transcript = None
    for line in content.split('\n'):
        if line.startswith('video_id'):
            video_id = line.split('=')[1].strip().strip('"')
        elif line.startswith('transcript'):
            transcript = line.split('=', 1)[1].strip().strip('"')
    return video_id, transcript

# Example usage:
file_path = 'content_processing/86Is6YemsyA.txt'
video_id, manual_transcript = read_video_data(file_path)

if video_id and manual_transcript:
    chunked_and_tagged_items = process_manual_transcript(manual_transcript, video_id)
    if chunked_and_tagged_items:
        to_upsert = [
            (item["id"], item["embedding"], item["metadata"])
            for item in chunked_and_tagged_items
        ]
        index.upsert(vectors=to_upsert, upsert=True)
        print(f"Uploaded {len(to_upsert)} chunks for video {video_id}!")
else:
    print("Failed to read video_id or transcript from the file.") 