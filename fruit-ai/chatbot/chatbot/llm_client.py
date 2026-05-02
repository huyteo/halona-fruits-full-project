from google import genai
from .config import GEMINI_API_KEY
import time
import requests
from PIL import Image
from io import BytesIO

class GeminiClient:
    def __init__(self):
        # ✅ Dùng API mới
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
        # ✅ Dùng models có sẵn
        self.models_to_try = [
            "gemini-2.5-flash",           # ✅ Available
            "gemini-flash-latest",        # ✅ Available
            "gemini-pro-latest",          # ✅ Available
        ]
        
        self.vision_models_to_try = [
            "gemini-2.5-flash",           # ✅ Vision support
            "gemini-flash-latest",        # ✅ Vision support
            "gemini-2.5-flash-image",     # ✅ Image specific
        ]
        
        self.working_model = None
        self.working_vision_model = None
        
        print(f"🤖 Gemini Client initialized with new API")
    
    def generate_response(self, prompt: str) -> str:
        """Generate text response"""
        
        if self.working_model:
            try:
                response = self.client.models.generate_content(
                    model=self.working_model,
                    contents=prompt
                )
                return response.text
            except Exception as e:
                print(f"⚠️ {self.working_model} failed: {e}")
                self.working_model = None
        
        for model_name in self.models_to_try:
            try:
                print(f"🔍 Trying: {model_name}")
                
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                
                print(f"✅ Working: {model_name}")
                self.working_model = model_name
                return response.text
            
            except Exception as e:
                print(f"❌ {model_name}: {str(e)[:80]}")
                time.sleep(0.5)
                continue
        
        return "⚠️ AI không khả dụng. Vui lòng thử lại sau."
    
    def generate_with_image(self, prompt: str, image_url: str) -> str:
        """Generate response with image"""
        
        try:
            print(f"🖼️ Downloading: {image_url}")
            
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            # Convert to base64
            import base64
            image_data = base64.b64encode(response.content).decode('utf-8')
            print(f"📦 Image: {len(image_data)} bytes")
            
            if self.working_vision_model:
                try:
                    result = self._call_vision(
                        self.working_vision_model,
                        prompt,
                        image_data
                    )
                    return result
                except Exception as e:
                    print(f"⚠️ {self.working_vision_model} failed: {e}")
                    self.working_vision_model = None
            
            for model_name in self.vision_models_to_try:
                try:
                    print(f"🔍 Trying vision: {model_name}")
                    
                    result = self._call_vision(model_name, prompt, image_data)
                    
                    print(f"✅ Vision working: {model_name}")
                    self.working_vision_model = model_name
                    return result
                
                except Exception as e:
                    print(f"❌ {model_name}: {str(e)[:80]}")
                    time.sleep(0.5)
                    continue
            
            print("⚠️ Vision failed, fallback to text")
            return self.generate_response(prompt + "\n\n(Không xem được ảnh)")
        
        except Exception as e:
            print(f"❌ Image error: {e}")
            return "Xin lỗi, không thể xử lý ảnh."
    
    def _call_vision(self, model: str, prompt: str, image_base64: str) -> str:
        """Call vision model"""
        response = self.client.models.generate_content(
            model=model,
            contents=[
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": image_base64
                            }
                        }
                    ]
                }
            ]
        )
        return response.text