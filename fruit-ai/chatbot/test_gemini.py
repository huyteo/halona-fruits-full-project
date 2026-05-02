import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Available models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"  ✅ {m.name}")

# Test text
model = genai.GenerativeModel("gemini-1.5-flash-latest")
response = model.generate_content("Hello, xin chào!")
print(f"\nTest response: {response.text}")