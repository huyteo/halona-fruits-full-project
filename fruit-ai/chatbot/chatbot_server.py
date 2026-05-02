from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from chatbot.llm_client import GeminiClient
from chatbot.prompt_templates import build_prompt
from chatbot.context_builder import get_products_context, get_orders_context

app = FastAPI()
gemini_client = GeminiClient()

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    user_id: int
    message: str
    history: List[Message] = []
    imageUrl: Optional[str] = None

@app.get("/")
def root():
    return {"status": "Chatbot AI Server is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
       
        # Get context
        products = get_products_context(request.message)
        orders = get_orders_context(request.user_id)
        
        # ✅ Convert Pydantic models to dicts
        history_dicts = []
        for h in request.history:
            try:
                # Pydantic v2
                history_dicts.append(h.model_dump())
            except AttributeError:
                # Pydantic v1
                history_dicts.append(h.dict())
        
        # Build prompt
        prompt = build_prompt(
            user_message=request.message,
            products=products,
            orders=orders,
            history=history_dicts,  # ✅ Pass dicts
            image_url=request.imageUrl
        )
        
        # Generate response
        if request.imageUrl:
            response = gemini_client.generate_with_image(prompt, request.imageUrl)
        else:
            response = gemini_client.generate_response(prompt)
        
        return {"response": response}
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)