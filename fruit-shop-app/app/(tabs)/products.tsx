import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient, { API_URL } from "../../api/axiosClient";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/useAuth";
import { useCart } from "../../contexts/useCart";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 52) / 2;

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
  unit: string;
  stock: number;
  category: Category;
}

const sortOptions = [
  { key: "featured", label: "Nổi bật", icon: "star-outline" },
  { key: "price_asc", label: "Giá tăng dần", icon: "arrow-up-outline" },
  { key: "price_desc", label: "Giá giảm dần", icon: "arrow-down-outline" },
  { key: "name", label: "Tên A-Z", icon: "text-outline" },
];

const getRating = (id: number) =>
  [4.8, 4.6, 4.9, 4.7, 4.5, 5.0, 4.4, 4.8][id % 8];
const getReviews = (id: number) =>
  [124, 256, 189, 98, 312, 67, 203, 156][id % 8];

// Category emoji mapping for visual flair
const CATEGORY_EMOJI: Record<string, string> = {
  default: "🍃",
  "trái cây nội địa": "🍊",
  "trái cây nhập khẩu": "✈️",
  "trái cây nhiệt đới": "🌴",
  berry: "🫐",
};

const getCatEmoji = (name: string) =>
  CATEGORY_EMOJI[name?.toLowerCase()] ?? CATEGORY_EMOJI.default;

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("featured");
  const [showSortModal, setShowSortModal] = useState(false);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (params.search) setSearchText(String(params.search));
    if (params.category) setSelectedCategory(Number(params.category));
  }, [params]);

  const fetchData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        axiosClient.get("/categories"),
        axiosClient.get("/products"),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter((p) => {
      const matchSearch =
        !searchText || p.name.toLowerCase().includes(searchText.toLowerCase());
      const matchCategory =
        !selectedCategory || p.category?.id === selectedCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return Number(a.price) - Number(b.price);
      if (sortBy === "price_desc") return Number(b.price) - Number(a.price);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const handleAddToCart = (product: Product) => {
    // Kiểm tra hết hàng
    if (product.stock <= 0) return;

    // Kiểm tra đăng nhập
    if (!user) {
      Alert.alert(
        "Vui lòng đăng nhập",
        "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng nhập",
            onPress: () => router.push("/auth/login" as any),
          },
        ],
      );
      return;
    }

    // Nếu đã đăng nhập, thêm vào giỏ
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      thumbnail: product.thumbnail,
      unit: product.unit,
      stock: product.stock || 99,
      quantity: 1,
    });
  };

  const handleReset = () => {
    setSearchText("");
    setSelectedCategory(null);
    setSortBy("featured");
  };

  const currentSort = sortOptions.find((s) => s.key === sortBy);

  const renderProduct = ({ item }: { item: Product }) => {
    const rating = getRating(item.id);
    const reviews = getReviews(item.id);
    const hasDiscount = item.id % 3 === 0;
    const discountPct = ((item.id % 4) + 1) * 5;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push(`/product/${item.id}` as any)}
        activeOpacity={0.85}
      >
        <View style={styles.productImageContainer}>
          {item.thumbnail ? (
            <Image
              source={{ uri: `${API_URL}${item.thumbnail}` }}
              style={styles.productImage}
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={{ fontSize: 36 }}>🍊</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Nổi bật</Text>
          </View>
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>-{discountPct}%</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.productCategory} numberOfLines={1}>
            {item.category?.name || item.unit}
          </Text>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={11} color="#f5a623" />
            <Text style={styles.ratingText}>{rating}</Text>
            <Text style={styles.reviewCount}>({reviews})</Text>
          </View>

          <View style={styles.priceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productPrice}>
                {Number(item.price).toLocaleString("vi-VN")}đ
              </Text>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                {hasDiscount && (
                  <Text style={styles.oldPrice}>
                    {Math.round(Number(item.price) * 1.25).toLocaleString(
                      "vi-VN",
                    )}
                    đ
                  </Text>
                )}
                <Text style={styles.productUnit}>/{item.unit}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.addButton,
                item.stock <= 0 && { backgroundColor: "#ddd" },
              ]}
              onPress={() => handleAddToCart(item)}
              disabled={item.stock <= 0}
            >
              <Ionicons name="cart-outline" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ====== HEADER — redesigned ====== */}
      <LinearGradient
        colors={["#1a7a3c", "#2ecc71"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative circles */}
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />

        {/* Top row: title + cart icon */}
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerEyebrow}>🌿 Cửa hàng trái cây</Text>
            <Text style={styles.headerTitle}>Sản phẩm</Text>
          </View>
          <View style={styles.headerIconBubble}>
            <Text style={{ fontSize: 22 }}>🍉</Text>
          </View>
        </View>

        <Text style={styles.headerSubtitle}>
          Tươi ngon • Sạch • Giao nhanh mỗi ngày
        </Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{products.length}+</Text>
            <Text style={styles.statLabel}>Sản phẩm</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{categories.length}</Text>
            <Text style={styles.statLabel}>Danh mục</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>100%</Text>
            <Text style={styles.statLabel}>Tươi sạch</Text>
          </View>
        </View>

        {/* Search bar embedded in header */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#aaa" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm trái cây..."
            placeholderTextColor="#bbb"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ====== CATEGORY CHIPS — fixed ====== */}
      <View style={styles.categoryWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {/* "Tất cả" chip */}
          <TouchableOpacity
            style={[
              styles.categoryChip,
              !selectedCategory && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text style={styles.categoryChipEmoji}>🍃</Text>
            <Text
              style={[
                styles.categoryChipText,
                !selectedCategory && styles.categoryChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.categoryChipEmoji}>
                {getCatEmoji(cat.name)}
              </Text>
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ====== TOOLBAR ====== */}
      <View style={styles.toolbar}>
        <Text style={styles.resultCount}>
          <Text style={{ color: Colors.primary, fontWeight: "700" }}>
            {filteredProducts.length}
          </Text>{" "}
          sản phẩm
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={styles.sortBtn}
            onPress={() => setShowSortModal(true)}
          >
            <Ionicons
              name={currentSort?.icon as any}
              size={14}
              color={Colors.primary}
            />
            <Text style={styles.sortBtnText}>{currentSort?.label}</Text>
            <Ionicons name="chevron-down" size={14} color="#999" />
          </TouchableOpacity>
          {(searchText || selectedCategory || sortBy !== "featured") && (
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Ionicons name="refresh-outline" size={14} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ====== PRODUCT LIST ====== */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={styles.productList}
        columnWrapperStyle={styles.productRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="search-outline" size={40} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm</Text>
            <Text style={styles.emptyText}>
              Thử tìm với từ khóa khác hoặc đổi bộ lọc
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleReset}>
              <Text style={styles.emptyBtnText}>Xóa bộ lọc</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ====== SORT MODAL ====== */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Sắp xếp theo</Text>
            {sortOptions.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.modalOption,
                  sortBy === opt.key && styles.modalOptionActive,
                ]}
                onPress={() => {
                  setSortBy(opt.key);
                  setShowSortModal(false);
                }}
              >
                <View
                  style={[
                    styles.modalOptionIcon,
                    sortBy === opt.key && { backgroundColor: "#e8f5e9" },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={18}
                    color={sortBy === opt.key ? Colors.primary : "#999"}
                  />
                </View>
                <Text
                  style={[
                    styles.modalOptionText,
                    sortBy === opt.key && styles.modalOptionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {sortBy === opt.key && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // ── NEW HEADER ──────────────────────────────────────────────
  header: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  // Decorative blurred circles
  headerCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -40,
    right: -30,
  },
  headerCircle2: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 30,
    left: -20,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  headerEyebrow: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
    fontWeight: "500",
  },
  // Stats strip
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: { alignItems: "center" },
  statNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  // Search inside header
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 46,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },

  // ── CATEGORY CHIPS — fixed ───────────────────────────────────
  categoryWrapper: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    backgroundColor: "#f5f5f5", // ← solid background (no more border-only)
    borderWidth: 0,
    gap: 5,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipEmoji: {
    fontSize: 13,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555", // ← darker than before (#888) — always visible
  },
  categoryChipTextActive: {
    color: "#fff",
  },

  // ── TOOLBAR ────────────────────────────────────────────────
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultCount: {
    fontSize: 13,
    color: "#999",
    fontWeight: "500",
  },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#eee",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── PRODUCT GRID ────────────────────────────────────────────
  productList: { paddingHorizontal: 14, paddingBottom: 24 },
  productRow: {
    justifyContent: "space-between",
    paddingHorizontal: 4,
    gap: 10,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  productImageContainer: {
    width: "100%",
    height: 150,
    backgroundColor: "#f8f8f8",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6ffed",
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  discountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#e04949",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  discountBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  productInfo: { padding: 12 },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
  },
  productCategory: { fontSize: 11, color: "#bbb", marginBottom: 6 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 8,
  },
  ratingText: { fontSize: 12, fontWeight: "600", color: "#444" },
  reviewCount: { fontSize: 11, color: "#ccc" },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  productPrice: { fontSize: 16, fontWeight: "800", color: Colors.price },
  oldPrice: { fontSize: 11, color: "#ccc", textDecorationLine: "line-through" },
  productUnit: { fontSize: 11, color: "#bbb" },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── EMPTY STATE ─────────────────────────────────────────────
  emptyContainer: {
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#444",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  emptyBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // ── SORT MODAL ──────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#222",
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 14,
  },
  modalOptionActive: { backgroundColor: "#f6ffed" },
  modalOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#666" },
  modalOptionTextActive: { color: Colors.primary, fontWeight: "700" },
});
