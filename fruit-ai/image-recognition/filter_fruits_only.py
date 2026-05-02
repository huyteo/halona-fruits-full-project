"""
HALONA FRUITS — Lọc dataset chỉ giữ trái cây
Cách dùng: python filter_fruits_only.py
"""

import os
import shutil
import json

# ─── Thư mục chứa train/, validation/, test/ vừa giải nén ───
SOURCE_DIR = "."
OUTPUT_DIR = "dataset_fruits"

# ─── Chỉ giữ các class là TRÁI CÂY ─────────────────────────
FRUIT_CLASSES = {
    "apple":        "Apple",
    "banana":       "Banana",
    "grapes":       "Grape",
    "kiwi":         "Kiwi",
    "mango":        "Mango",
    "orange":       "Orange",
    "papaya":       "Papaya",
    "pear":         "Pear",
    "pineapple":    "Pineapple",
    "pomegranate":  "Pomegranate",
    "watermelon":   "Watermelon",
}

# ─── Tên tiếng Việt ─────────────────────────────────────────
VI_NAMES = {
    "Apple":        "Táo",
    "Banana":       "Chuối",
    "Grape":        "Nho",
    "Kiwi":         "Kiwi",
    "Mango":        "Xoài",
    "Orange":       "Cam",
    "Papaya":       "Đu đủ",
    "Pear":         "Lê",
    "Pineapple":    "Dứa",
    "Pomegranate":  "Lựu",
    "Watermelon":   "Dưa hấu",
}

# Mapping split gốc → tên thư mục output
SPLIT_MAP = {
    "train":      "Training",
    "validation": "Validation",
    "test":       "Test",
}


def main():
    print("=" * 60)
    print("🍒 HALONA FRUITS — LỌC CHỈ GIỮ TRÁI CÂY")
    print("=" * 60)

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)

    total_images = 0

    for src_split, dst_split in SPLIT_MAP.items():
        src_path = os.path.join(SOURCE_DIR, src_split)
        if not os.path.exists(src_path):
            print(f"\n⚠️  Không tìm thấy: {src_path}")
            continue

        print(f"\n📂 {src_split}/ → {dst_split}/")
        print("-" * 40)

        split_count = 0
        for folder in sorted(os.listdir(src_path)):
            folder_path = os.path.join(src_path, folder)
            if not os.path.isdir(folder_path):
                continue

            folder_lower = folder.lower()
            if folder_lower not in FRUIT_CLASSES:
                print(f"   ❌ Bỏ (rau/củ): {folder}")
                continue

            class_name = FRUIT_CLASSES[folder_lower]
            dst_dir = os.path.join(OUTPUT_DIR, dst_split, class_name)
            os.makedirs(dst_dir, exist_ok=True)

            images = [f for f in os.listdir(folder_path)
                      if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]

            for img in images:
                shutil.copy2(
                    os.path.join(folder_path, img),
                    os.path.join(dst_dir, img)
                )

            vi = VI_NAMES.get(class_name, "?")
            print(f"   ✅ {folder} → {class_name} ({vi}) — {len(images)} ảnh")
            split_count += len(images)

        total_images += split_count
        print(f"   📊 Tổng {src_split}: {split_count} ảnh")

    # Lưu label_map_vi.json vào model/
    os.makedirs("model", exist_ok=True)
    vi_path = os.path.join("model", "label_map_vi.json")
    with open(vi_path, "w", encoding="utf-8") as f:
        json.dump(VI_NAMES, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"✅ HOÀN THÀNH!")
    print(f"   Số loại trái cây: {len(FRUIT_CLASSES)}")
    print(f"   Tổng ảnh:        {total_images}")
    print(f"   Output:          {os.path.abspath(OUTPUT_DIR)}/")
    print(f"   Label VI:        {vi_path}")
    print("=" * 60)
    print(f"\n🎯 Bước tiếp: python model/train_model.py")


if __name__ == "__main__":
    main()