"""
HALONA FRUITS — Gộp Fruits-360 + Kritikseth
=============================================
Lấy ảnh Fruits-360 (nhiều class, nhiều ảnh) + Kritikseth (ảnh thực tế)
→ Gộp thành 1 dataset mạnh, chỉ giữ TRÁI CÂY

Cách dùng:
  1. Đảm bảo đã có:
     - dataset/fruits-360_original-size/fruits-360-original-size/Training/ (& Test/)
     - train/ , validation/ , test/  (từ kritikseth)
  2. python prepare_dataset.py
"""

import os
import shutil
import json
import random
from collections import defaultdict

# ─── ĐƯỜNG DẪN ────────────────────────────────────────────
# Fruits-360 original size
F360_BASE = os.path.join("dataset", "fruits-360_original-size", "fruits-360-original-size")
F360_TRAIN = os.path.join(F360_BASE, "Training")
F360_TEST = os.path.join(F360_BASE, "Test")

# Kritikseth
KS_TRAIN = "train"
KS_VAL = "validation"
KS_TEST = "test"

# Output
OUTPUT = "dataset_combined"

# ─── FRUITS-360: QUY TẮC GỘP (tên thư mục → class) ──────
# Chỉ giữ trái cây, loại bỏ rau/củ/hạt
# Gộp biến thể: "Apple 5", "Apple 6", "apple_red_1"... → "Apple"

EXCLUDE_KEYWORDS = [
    "almond", "bean", "cabbage", "cactus", "carrot", "corn",
    "cucumber", "eggplant", "ginger", "nut", "onion",
    "peanut", "pepper", "pistachio", "tomato", "zucchini",
    "caju", "kohlrabi", "potato",
]

F360_MERGE = {
    "apple":       "Apple",
    "apricot":     "Apricot",
    "avocado":     "Avocado",
    "banana":      "Banana",
    "blackberry":  "Blackberry",
    "blueberry":   "Blueberry",
    "cantaloupe":  "Cantaloupe",
    "carambola":   "Carambola",
    "cherimoya":   "Cherimoya",
    "cherry":      "Cherry",
    "clementine":  "Clementine",
    "cocos":       "Coconut",
    "dates":       "Dates",
    "fig":         "Fig",
    "gooseberry":  "Gooseberry",
    "grape":       "Grape",
    "grapefruit":  "Grapefruit",
    "guava":       "Guava",
    "huckleberry": "Huckleberry",
    "kiwi":        "Kiwi",
    "kumquat":     "Kumquat",
    "lemon":       "Lemon",
    "lime":        "Lime",
    "lychee":      "Lychee",
    "mandarine":   "Mandarine",
    "mango":       "Mango",
    "mangostan":   "Mangosteen",
    "melon":       "Melon",
    "mulberry":    "Mulberry",
    "nectarine":   "Nectarine",
    "orange":      "Orange",
    "papaya":      "Papaya",
    "passion":     "Passionfruit",
    "peach":       "Peach",
    "pear":        "Pear",
    "physalis":    "Physalis",
    "pineapple":   "Pineapple",
    "pitahaya":    "Pitahaya",
    "plum":        "Plum",
    "pomegranate": "Pomegranate",
    "pomelo":      "Pomelo",
    "quince":      "Quince",
    "rambutan":    "Rambutan",
    "raspberry":   "Raspberry",
    "redcurrant":  "Redcurrant",
    "salak":       "Salak",
    "strawberry":  "Strawberry",
    "tamarillo":   "Tamarillo",
    "tangelo":     "Tangelo",
    "walnut":      "Walnut",
    "watermelon":  "Watermelon",
}

# ─── KRITIKSETH: CHỈ GIỮ TRÁI CÂY ──────────────────────
KS_FRUITS = {
    "apple":       "Apple",
    "banana":      "Banana",
    "grapes":      "Grape",
    "kiwi":        "Kiwi",
    "mango":       "Mango",
    "orange":      "Orange",
    "papaya":      "Papaya",
    "pear":        "Pear",
    "pineapple":   "Pineapple",
    "pomegranate": "Pomegranate",
    "watermelon":  "Watermelon",
}

# ─── TIẾNG VIỆT ──────────────────────────────────────────
VI_NAMES = {
    "Apple": "Táo", "Apricot": "Mơ", "Avocado": "Bơ",
    "Banana": "Chuối", "Blackberry": "Mâm xôi đen", "Blueberry": "Việt quất",
    "Cantaloupe": "Dưa lưới", "Carambola": "Khế", "Cherimoya": "Mãng cầu",
    "Cherry": "Cherry", "Clementine": "Quýt", "Coconut": "Dừa",
    "Dates": "Chà là", "Fig": "Sung", "Gooseberry": "Lý gai",
    "Grape": "Nho", "Grapefruit": "Bưởi chùm", "Guava": "Ổi",
    "Huckleberry": "Việt quất rừng", "Kiwi": "Kiwi", "Kumquat": "Quất",
    "Lemon": "Chanh vàng", "Lime": "Chanh xanh", "Lychee": "Vải",
    "Mandarine": "Quýt", "Mango": "Xoài", "Mangosteen": "Măng cụt",
    "Melon": "Dưa gang", "Mulberry": "Dâu tằm", "Nectarine": "Xuân đào",
    "Orange": "Cam", "Papaya": "Đu đủ", "Passionfruit": "Chanh dây",
    "Peach": "Đào", "Pear": "Lê", "Physalis": "Tầm bóp",
    "Pineapple": "Dứa", "Pitahaya": "Thanh long", "Plum": "Mận",
    "Pomegranate": "Lựu", "Pomelo": "Bưởi", "Quince": "Mộc qua",
    "Rambutan": "Chôm chôm", "Raspberry": "Mâm xôi", "Redcurrant": "Nho đỏ",
    "Salak": "Salak", "Strawberry": "Dâu tây", "Tamarillo": "Cà chua gỗ",
    "Tangelo": "Quýt lai", "Walnut": "Óc chó", "Watermelon": "Dưa hấu",
}


def should_exclude(folder_name: str) -> bool:
    name_lower = folder_name.lower().replace("_", " ")
    return any(kw in name_lower for kw in EXCLUDE_KEYWORDS)


def get_f360_class(folder_name: str) -> str | None:
    name_lower = folder_name.lower().replace("_", " ")
    for keyword, cls in F360_MERGE.items():
        if name_lower.startswith(keyword):
            return cls
    return None


def copy_images(src_dir: str, dst_dir: str, prefix: str = "") -> int:
    """Copy ảnh từ src → dst, trả về số ảnh đã copy"""
    os.makedirs(dst_dir, exist_ok=True)
    images = [f for f in os.listdir(src_dir)
              if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]
    for img in images:
        new_name = f"{prefix}_{img}" if prefix else img
        shutil.copy2(os.path.join(src_dir, img), os.path.join(dst_dir, new_name))
    return len(images)


def process_f360(split_src: str, split_dst: str, stats: dict):
    """Xử lý 1 split của Fruits-360"""
    if not os.path.exists(split_src):
        print(f"   ⚠️  Không tìm thấy: {split_src}")
        return

    for folder in sorted(os.listdir(split_src)):
        folder_path = os.path.join(split_src, folder)
        if not os.path.isdir(folder_path):
            continue
        if should_exclude(folder):
            continue

        cls = get_f360_class(folder)
        if cls is None:
            continue

        dst = os.path.join(OUTPUT, split_dst, cls)
        n = copy_images(folder_path, dst, prefix=f"f360_{folder.replace(' ', '_')}")
        stats[cls] = stats.get(cls, 0) + n


def process_ks(split_src: str, split_dst: str, stats: dict):
    """Xử lý 1 split của Kritikseth"""
    if not os.path.exists(split_src):
        print(f"   ⚠️  Không tìm thấy: {split_src}")
        return

    for folder in sorted(os.listdir(split_src)):
        folder_path = os.path.join(split_src, folder)
        if not os.path.isdir(folder_path):
            continue

        folder_lower = folder.lower()
        if folder_lower not in KS_FRUITS:
            continue

        cls = KS_FRUITS[folder_lower]
        dst = os.path.join(OUTPUT, split_dst, cls)
        n = copy_images(folder_path, dst, prefix="ks")
        stats[cls] = stats.get(cls, 0) + n


def create_val_from_train(val_ratio: float = 0.15):
    """Tách Validation từ Training nếu chưa có đủ"""
    train_dir = os.path.join(OUTPUT, "Training")
    val_dir = os.path.join(OUTPUT, "Validation")

    for cls in sorted(os.listdir(train_dir)):
        cls_train = os.path.join(train_dir, cls)
        cls_val = os.path.join(val_dir, cls)
        if not os.path.isdir(cls_train):
            continue

        # Nếu val đã có ảnh (từ kritikseth), bỏ qua
        if os.path.exists(cls_val) and len(os.listdir(cls_val)) > 5:
            continue

        os.makedirs(cls_val, exist_ok=True)
        images = [f for f in os.listdir(cls_train)
                  if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        random.shuffle(images)
        n_val = max(int(len(images) * val_ratio), 5)

        for img in images[:n_val]:
            shutil.move(os.path.join(cls_train, img), os.path.join(cls_val, img))

    print(f"   ✅ Đã tách Validation từ Training")


def main():
    print("=" * 60)
    print("🍒 HALONA FRUITS — GỘP 2 DATASET")
    print("=" * 60)

    if os.path.exists(OUTPUT):
        shutil.rmtree(OUTPUT)

    train_stats = {}
    test_stats = {}

    # 1. Fruits-360
    print("\n📂 Xử lý Fruits-360...")
    process_f360(F360_TRAIN, "Training", train_stats)
    process_f360(F360_TEST, "Test", test_stats)
    print(f"   ✅ {len(train_stats)} class từ Fruits-360")

    # 2. Kritikseth (ảnh thực tế)
    ks_train_stats = {}
    ks_val_stats = {}
    ks_test_stats = {}
    print("\n📂 Xử lý Kritikseth (ảnh thực tế)...")
    process_ks(KS_TRAIN, "Training", ks_train_stats)
    process_ks(KS_VAL, "Validation", ks_val_stats)
    process_ks(KS_TEST, "Test", ks_test_stats)

    # Merge stats
    for cls, n in ks_train_stats.items():
        train_stats[cls] = train_stats.get(cls, 0) + n
    for cls, n in ks_test_stats.items():
        test_stats[cls] = test_stats.get(cls, 0) + n

    print(f"   ✅ Thêm ảnh thực tế cho {len(ks_train_stats)} class")

    # 3. Tạo Validation
    print("\n📂 Tạo Validation set...")
    create_val_from_train()

    # 4. Thống kê
    all_classes = sorted(set(list(train_stats.keys()) + list(test_stats.keys())))

    print("\n" + "=" * 60)
    print("📊 KẾT QUẢ")
    print("=" * 60)
    print(f"\n{'Class':<20} {'Train':>8} {'Test':>8} {'Tiếng Việt':<15}")
    print("-" * 60)

    total_train = 0
    total_test = 0
    for cls in all_classes:
        t = train_stats.get(cls, 0)
        e = test_stats.get(cls, 0)
        vi = VI_NAMES.get(cls, cls)
        total_train += t
        total_test += e
        print(f"   {cls:<18} {t:>6} {e:>6}   {vi}")

    print("-" * 60)
    print(f"   {'TỔNG':<18} {total_train:>6} {total_test:>6}")
    print(f"\n✅ Số loại trái cây: {len(all_classes)}")
    print(f"📁 Output: {os.path.abspath(OUTPUT)}/")

    # 5. Lưu label map
    os.makedirs("model", exist_ok=True)
    with open(os.path.join("model", "label_map_vi.json"), "w", encoding="utf-8") as f:
        json.dump(VI_NAMES, f, ensure_ascii=False, indent=2)
    print(f"💾 Label map: model/label_map_vi.json")

    print(f"\n🎯 Tiếp theo: python model/train_model.py")


if __name__ == "__main__":
    random.seed(42)
    main()