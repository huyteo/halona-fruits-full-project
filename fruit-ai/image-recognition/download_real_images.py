"""
HALONA FRUITS — Bổ sung ảnh thực tế
Mận (thêm) + Sầu riêng, Ổi, Vải, Măng cụt, Dừa (mới)
"""

import os
import shutil
import random

REAL_IMAGES_DIR = "real_images"
COMBINED_DIR = "dataset_combined"
TEST_COUNT = 5
MIN_FILE_SIZE = 15 * 1024

CLASSES = [
    # Class cũ cần thêm ảnh
    "Avocado",
    "Cantaloupe",
    "Carambola",
    "Cherimoya",
    "Cherry",
    "Kiwi",
    "Mango",
    "Papaya",
    "Plum",
    "Pomegranate",
    # 5 loại quả MỚI
    "Durian",
    "Guava",
    "Lychee",
    "Mangosteen",
    "Coconut",
]


def main():
    print("=" * 60)
    print("🍒 HALONA FRUITS — BỔ SUNG ẢNH THỰC TẾ")
    print("=" * 60)

    if not os.path.exists(REAL_IMAGES_DIR):
        print(f"❌ Chưa có thư mục '{REAL_IMAGES_DIR}/'")
        return

    total_added = 0
    total_skipped = 0

    for cls in CLASSES:
        cls_dir = os.path.join(REAL_IMAGES_DIR, cls)
        if not os.path.exists(cls_dir):
            print(f"\n⚠️  Chưa có: {cls_dir}/ — bỏ qua")
            continue

        all_files = [f for f in os.listdir(cls_dir)
                     if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]

        good_images = []
        small_count = 0
        for f in all_files:
            filepath = os.path.join(cls_dir, f)
            size = os.path.getsize(filepath)
            if size >= MIN_FILE_SIZE:
                good_images.append(f)
            else:
                small_count += 1

        print(f"\n📂 {cls}: {len(all_files)} file → {len(good_images)} ảnh tốt (bỏ {small_count} ảnh <15KB)")

        if len(good_images) < 5:
            print(f"   ❌ Quá ít ảnh, cần tải thêm!")
            continue

        random.shuffle(good_images)
        n_test = min(TEST_COUNT, len(good_images) // 4)

        splits = {
            "Training":   good_images[n_test:],
            "Validation":  good_images[:n_test],
            "Test":        good_images[:n_test],
        }

        for split_name, split_images in splits.items():
            dst_dir = os.path.join(COMBINED_DIR, split_name, cls)
            os.makedirs(dst_dir, exist_ok=True)

            for i, img in enumerate(split_images):
                src = os.path.join(cls_dir, img)
                ext = os.path.splitext(img)[1] or '.jpg'
                dst_name = f"real_{cls}_{i:04d}{ext}"
                dst = os.path.join(dst_dir, dst_name)
                shutil.copy2(src, dst)

            print(f"   ✅ {split_name}: +{len(split_images)} ảnh")

        total_added += len(good_images)
        total_skipped += small_count

    if total_added == 0:
        print("\n❌ Không có ảnh nào được thêm!")
        return

    # Đếm tổng class trong dataset
    train_dir = os.path.join(COMBINED_DIR, "Training")
    all_classes = sorted([c for c in os.listdir(train_dir)
                          if os.path.isdir(os.path.join(train_dir, c))])
    print(f"\n{'=' * 60}")
    print(f"✅ HOÀN THÀNH!")
    print(f"   Ảnh tốt đã thêm: {total_added}")
    print(f"   Ảnh nhỏ bị bỏ:   {total_skipped}")
    print(f"   Tổng class:      {len(all_classes)}")
    print(f"\n📋 Danh sách {len(all_classes)} class:")
    for c in all_classes:
        count = len(os.listdir(os.path.join(train_dir, c)))
        print(f"   {c}: {count} ảnh")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    random.seed(42)
    main()