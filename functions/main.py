from firebase_functions import https_fn
from firebase_admin import initialize_app, firestore
import random
import string
import json

initialize_app()
_db = None

def get_db():
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


def generate_username() -> str:
    """Generate a random username."""
    adjectives = [
        "swift", "brave", "clever", "bright", "calm", "daring", "eager",
        "fierce", "gentle", "happy", "jolly", "kind", "lucky", "mighty",
        "noble", "proud", "quick", "radiant", "silent", "wise"
    ]
    nouns = [
        "tiger", "eagle", "wolf", "dragon", "phoenix", "falcon", "lion",
        "fox", "bear", "raven", "hawk", "panther", "jaguar", "lynx",
        "shark", "orca", "viper", "cobra", "puma", "wolverine"
    ]
    numbers = ''.join(random.choices(string.digits, k=3))
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    return f"{adj}_{noun}_{numbers}"


def generate_color() -> str:
    """Generate a random hex color."""
    return f"#{''.join(random.choices('0123456789ABCDEF', k=6))}"


@https_fn.on_request()
def get_or_create_user(req: https_fn.Request) -> https_fn.Response:
    """HTTP function to get or create a user based on browser_id."""
    # CORS setup
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Vary": "Origin",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "3600",
        "Content-Type": "application/json",
    }

    # Preflight
    if req.method == "OPTIONS":
        return https_fn.Response("", status=204, headers=cors_headers)

    if req.method != "POST":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers=cors_headers
        )
    
    try:
        body = req.get_json(silent=True)
        if not body:
            return https_fn.Response(
                json.dumps({"error": "Invalid request body"}),
                status=400,
                headers=cors_headers
            )
        
        browser_id = body.get("browser_id")
        if not browser_id:
            return https_fn.Response(
                json.dumps({"error": "browser_id is required"}),
                status=400,
                headers=cors_headers
            )
        
        # Check if browser_id exists in Firestore
        db = get_db()
        user_ref = db.collection("zero-auth").document(browser_id)
        user_doc = user_ref.get()
        
        if user_doc.exists:
            # User exists, return existing data
            user_data = user_doc.to_dict()
            response_data = {
                "username": user_data.get("username"),
                "color": user_data.get("color")
            }
            return https_fn.Response(json.dumps(response_data), status=200, headers=cors_headers)
        else:
            # User doesn't exist, create new user
            username = generate_username()
            color = generate_color()
            
            user_ref.set({
                "browser_id": browser_id,
                "username": username,
                "color": color,
                "created_at": firestore.SERVER_TIMESTAMP
            })
            
            response_data = {
                "username": username,
                "color": color
            }
            return https_fn.Response(json.dumps(response_data), status=200, headers=cors_headers)
    
    except Exception as e:
        return https_fn.Response(json.dumps({"error": f"Internal server error: {str(e)}"}), status=500, headers=cors_headers)