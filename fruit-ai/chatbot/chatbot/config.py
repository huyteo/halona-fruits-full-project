import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ✅ Dùng alias thay vì full name
MODEL_NAME = "gemini-flash-latest"  # ← Alias của gemini-2.5-flash
# Hoặc:
# MODEL_NAME = "gemini-pro-latest"

MAX_HISTORY = 10

if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY not found in .env file!")

print(f"✅ Gemini API Key loaded: {GEMINI_API_KEY[:10]}...")
print(f"✅ Using model: {MODEL_NAME}")