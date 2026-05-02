"""
Xóa các class không cần khỏi dataset_combined
"""
import os
import shutil

COMBINED_DIR = "dataset_combined"

# Các class cần XÓA
REMOVE_CLASSES = [
    "Dates",        # Chà là
    "Gooseberry",   # Lý gai
    "Nectarine",    # Xuân đào
    "Peach",        # Đào
    "Quince",       # Mộc qua
]

SPLITS = ["Training", "Validation", "Test"]


def main():
    print("=" * 60)
    print("🗑️  XÓA CLASS KHÔNG CẦN")
    print("=" * 60)

    for cls in REMOVE_CLASSES:
        for split in SPLITS:
            path = os.path.join(COMBINED_DIR, split, cls)
            if os.path.exists(path):
                count = len(os.listdir(path))
                shutil.rmtree(path)
                print(f"   ❌ Đã xóa: {split}/{cls} ({count} ảnh)")
            else:
                print(f"   ⏭️  Không có: {split}/{cls}")

    # Đếm class còn lại
    train_dir = os.path.join(COMBINED_DIR, "Training")
    remaining = [c for c in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, c))]
    print(f"\n✅ Còn lại {len(remaining)} class:")
    for c in sorted(remaining):
        count = len(os.listdir(os.path.join(train_dir, c)))
        print(f"   📂 {c}: {count} ảnh")

    print(f"\n🎯 Tiếp theo: tải ảnh quả mới → chạy download_real_images.py")


if __name__ == "__main__":
    main()