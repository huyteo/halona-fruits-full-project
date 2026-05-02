import os, json
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

# ✅ Import TensorFlow và Keras
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications.efficientnet import preprocess_input

# ─── Đường dẫn ───────────────────────────────────────────
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model", "fruit_model_best.keras")
CLASS_JSON = os.path.join(BASE_DIR, "model", "class_names.json")
VI_JSON    = os.path.join(BASE_DIR, "model", "label_map_vi.json")

IMG_SIZE       = 224
CONFIDENCE_MIN = 30.0

# ─── App ─────────────────────────────────────────────────
app = FastAPI(
    title="Halona Fruits — AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load model 1 lần duy nhất khi server start ──────────
print("⏳ Đang load model...")
model = load_model(MODEL_PATH)  # ✅ Import trực tiếp

with open(CLASS_JSON, "r", encoding="utf-8") as f:
    class_names: dict = json.load(f)

with open(VI_JSON, "r", encoding="utf-8") as f:
    label_map_vi: dict = json.load(f)

print(f"✅ Server sẵn sàng — {len(class_names)} loại trái cây")


# ─── Preprocess ──────────────────────────────────────────
def preprocess(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE))
    arr = np.array(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return preprocess_input(arr)  # ✅ Dùng import ở trên


# ─── Endpoints ───────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "Halona Fruits AI", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "File phải là ảnh")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "Ảnh quá lớn, tối đa 10MB")

    try:
        img_tensor = preprocess(contents)
        preds = model.predict(img_tensor, verbose=0)[0]

        top3_idx = np.argsort(preds)[::-1][:3]
        top3 = []
        for idx in top3_idx:
            en_name = class_names[str(idx)]
            vi_name = label_map_vi.get(en_name, en_name)
            top3.append({
                "name_en":    en_name,
                "name_vi":    vi_name,
                "confidence": round(float(preds[idx]) * 100, 2),
            })

        top = top3[0]
        is_fruit = top["confidence"] >= CONFIDENCE_MIN

        return {
            "success":    True,
            "is_fruit":   is_fruit,
            "fruit":      top["name_vi"] if is_fruit else None,
            "fruit_en":   top["name_en"] if is_fruit else None,
            "confidence": top["confidence"],
            "top3":       top3,
            "message": (
                f"Đây là {top['name_vi']} ({top['confidence']:.1f}%)"
                if is_fruit
                else "Không nhận diện được trái cây trong ảnh"
            ),
        }

    except Exception as e:
        raise HTTPException(500, f"Lỗi xử lý: {str(e)}")