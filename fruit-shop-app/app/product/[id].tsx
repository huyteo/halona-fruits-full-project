import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  thumbnail: string;
  images: string[];
  unit: string;
  stock: number;
  categoryId: number;
  category: { id: number; name: string };
}

interface Review {
  id: number;
  rating: number;
  comment: string;
  user: { name: string };
  createdAt: string;
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState("");
  const [activeTab, setActiveTab] = useState<"desc" | "reviews">("desc");
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [averageRating, setAverageRating] = useState({ average: 0, total: 0 });

  // ✅ Related products state
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const [prodRes, revRes, ratingRes] = await Promise.all([
        axiosClient.get(`/products/${id}`),
        axiosClient.get(`/reviews/product/${id}`),
        axiosClient.get(`/reviews/product/${id}/average`),
      ]);
      setProduct(prodRes.data);
      setSelectedImage(prodRes.data.thumbnail || "");
      setReviews(revRes.data);
      setAverageRating(ratingRes.data);

      // ✅ Fetch related products based on category
      if (prodRes.data.categoryId) {
        try {
          const relatedRes = await axiosClient.get(
            `/products/category/${prodRes.data.categoryId}`,
          );
          // Filter out current product and take first 4
          const filtered = relatedRes.data
            .filter((p: Product) => p.id !== prodRes.data.id)
            .slice(0, 4);
          setRelatedProducts(filtered);
        } catch (error) {
          console.error("Error fetching related products:", error);
          setRelatedProducts([]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

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
      stock: product.stock,
      quantity,
    });
    Alert.alert("Thành công", `Đã thêm ${product.name} vào giỏ hàng`, [
      { text: "Tiếp tục mua", style: "cancel" },
      { text: "Xem giỏ hàng", onPress: () => router.push("/(tabs)/cart") },
    ]);
  };

  const handleBuyNow = async () => {
    if (!product) return;

    // Kiểm tra đăng nhập
    if (!user) {
      Alert.alert("Vui lòng đăng nhập", "Bạn cần đăng nhập để mua hàng", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng nhập",
          onPress: () => router.push("/auth/login" as any),
        },
      ]);
      return;
    }

    try {
      // Tạo item chỉ với sản phẩm hiện tại
      const buyNowItem = [
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          thumbnail: product.thumbnail,
          unit: product.unit,
          quantity,
        },
      ];

      // Lưu vào AsyncStorage
      await AsyncStorage.setItem("checkoutItems", JSON.stringify(buyNowItem));

      // Navigate với flag buyNow
      router.push({
        pathname: "/checkout",
        params: { buyNow: "true" },
      });
    } catch (error) {
      console.error("Error saving checkout item:", error);
      Alert.alert("Lỗi", "Không thể tiến hành thanh toán");
    }
  };

  const handleSubmitReview = async () => {
    if (!isAuthenticated) {
      Alert.alert("Chưa đăng nhập", "Vui lòng đăng nhập để đánh giá sản phẩm", [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng nhập", onPress: () => router.push("/auth/login") },
      ]);
      return;
    }

    if (reviewRating === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn số sao đánh giá!");
      return;
    }

    setReviewLoading(true);
    try {
      await axiosClient.post("/reviews", {
        productId: Number(id),
        rating: reviewRating,
        comment: reviewComment,
      });

      Alert.alert("Thành công", "Đánh giá của bạn đã được gửi!");
      setReviewRating(0);
      setReviewComment("");

      // Refresh reviews
      const [revRes, ratingRes] = await Promise.all([
        axiosClient.get(`/reviews/product/${id}`),
        axiosClient.get(`/reviews/product/${id}/average`),
      ]);
      setReviews(revRes.data);
      setAverageRating(ratingRes.data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Gửi đánh giá thất bại",
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const avgRating =
    averageRating.average ||
    (reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0);

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const allImages = [product.thumbnail, ...(product.images || [])].filter(
    Boolean,
  );
  const hasDiscount = product.id % 3 === 0;
  const discountPct = ((product.id % 4) + 1) * 5;
  const oldPrice = hasDiscount ? Math.round(Number(product.price) * 1.2) : null;

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* ====== IMAGE ====== */}
        <View style={styles.imageSection}>
          <Image
            source={{ uri: `${API_URL}${selectedImage}` }}
            style={styles.mainImage}
          />
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color="#333" />
          </TouchableOpacity>
          <View style={styles.imgBadge}>
            <Text style={styles.imgBadgeText}>Nổi bật</Text>
          </View>
          {hasDiscount && (
            <View style={styles.imgDiscount}>
              <Text style={styles.imgDiscountText}>-{discountPct}%</Text>
            </View>
          )}
        </View>

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbList}
          >
            {allImages.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImage(img)}
                style={[
                  styles.thumbItem,
                  selectedImage === img && styles.thumbActive,
                ]}
              >
                <Image
                  source={{ uri: `${API_URL}${img}` }}
                  style={styles.thumbImage}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ====== INFO CARD ====== */}
        <View style={styles.infoCard}>
          {/* Badge + Category */}
          <View style={styles.tagRow}>
            <View style={styles.featuredTag}>
              <Text style={styles.featuredTagText}>Nổi bật</Text>
            </View>
            {product.category && (
              <Text style={styles.categoryText}>{product.category.name}</Text>
            )}
          </View>

          {/* Name */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Rating */}
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(avgRating) ? "star" : "star-outline"}
                size={16}
                color="#f5a623"
              />
            ))}
            <Text style={styles.ratingValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.ratingCount}>
              ({averageRating.total || reviews.length} đánh giá)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>
              {Number(product.price).toLocaleString("vi-VN")}đ
            </Text>
            {oldPrice && (
              <Text style={styles.oldPrice}>
                {oldPrice.toLocaleString("vi-VN")}đ
              </Text>
            )}
            {hasDiscount && (
              <View style={styles.discountTag}>
                <Text style={styles.discountTagText}>-{discountPct}%</Text>
              </View>
            )}
            <Text style={styles.unitText}>/{product.unit}</Text>
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            {product.stock > 0 ? (
              <>
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={Colors.primary}
                />
                <Text style={styles.stockText}>
                  Còn {product.stock} {product.unit} trong kho
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="close-circle" size={18} color="#e04949" />
                <Text style={[styles.stockText, { color: "#e04949" }]}>
                  Hết hàng
                </Text>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description preview */}
          {product.description && (
            <View style={styles.descPreview}>
              <Text style={styles.descPreviewTitle}>Mô tả sản phẩm</Text>
              <Text style={styles.descPreviewText} numberOfLines={3}>
                {product.description}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Quantity */}
          {product.stock > 0 && (
            <View>
              <Text style={styles.qtyLabel}>Số lượng</Text>
              <View style={styles.qtyRow}>
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      quantity <= 1 && styles.qtyBtnDisabled,
                    ]}
                    onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={quantity <= 1 ? "#ddd" : Colors.primary}
                    />
                  </TouchableOpacity>
                  <View style={styles.qtyValueBox}>
                    <Text style={styles.qtyValue}>{quantity}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.qtyBtn,
                      quantity >= product.stock && styles.qtyBtnDisabled,
                    ]}
                    onPress={() =>
                      setQuantity(Math.min(product.stock, quantity + 1))
                    }
                    disabled={quantity >= product.stock}
                  >
                    <Ionicons
                      name="add"
                      size={18}
                      color={
                        quantity >= product.stock ? "#ddd" : Colors.primary
                      }
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.qtyUnit}>{product.unit}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ====== TABS: MÔ TẢ / ĐÁNH GIÁ ====== */}
        <View style={styles.tabCard}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "desc" && styles.tabActive]}
              onPress={() => setActiveTab("desc")}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={activeTab === "desc" ? Colors.primary : "#aaa"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "desc" && styles.tabTextActive,
                ]}
              >
                MÔ TẢ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "reviews" && styles.tabActive]}
              onPress={() => setActiveTab("reviews")}
            >
              <Ionicons
                name="chatbubble-outline"
                size={16}
                color={activeTab === "reviews" ? Colors.primary : "#aaa"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "reviews" && styles.tabTextActive,
                ]}
              >
                ĐÁNH GIÁ ({averageRating.total || reviews.length})
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === "desc" ? (
            <View style={styles.tabContent}>
              <Text style={styles.descFullText}>
                {product.description || "Chưa có mô tả cho sản phẩm này."}
              </Text>
            </View>
          ) : (
            <View style={styles.tabContent}>
              {/* ====== WRITE REVIEW FORM ====== */}
              {isAuthenticated ? (
                <View style={styles.reviewFormCard}>
                  <Text style={styles.reviewFormTitle}>
                    Viết đánh giá của bạn
                  </Text>

                  {/* Star selector */}
                  <Text style={styles.reviewFormLabel}>Đánh giá</Text>
                  <View style={styles.starSelector}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity
                        key={star}
                        onPress={() => setReviewRating(star)}
                        style={styles.starBtn}
                      >
                        <Ionicons
                          name={star <= reviewRating ? "star" : "star-outline"}
                          size={32}
                          color={star <= reviewRating ? "#f5a623" : "#ddd"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Comment input */}
                  <Text style={styles.reviewFormLabel}>Nội dung</Text>
                  <TextInput
                    style={styles.reviewTextInput}
                    multiline
                    numberOfLines={3}
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                    placeholderTextColor="#bbb"
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    textAlignVertical="top"
                  />

                  {/* Submit button */}
                  <TouchableOpacity
                    style={[
                      styles.submitReviewBtn,
                      reviewLoading && styles.submitReviewBtnDisabled,
                    ]}
                    onPress={handleSubmitReview}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="send" size={16} color="#fff" />
                        <Text style={styles.submitReviewText}>
                          Gửi đánh giá
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                // Not logged in — prompt to login
                <View style={styles.loginPromptCard}>
                  <Ionicons
                    name="person-circle-outline"
                    size={36}
                    color="#ccc"
                  />
                  <Text style={styles.loginPromptText}>
                    Vui lòng{" "}
                    <Text
                      style={styles.loginPromptLink}
                      onPress={() => router.push("/auth/login")}
                    >
                      đăng nhập
                    </Text>{" "}
                    để đánh giá sản phẩm
                  </Text>
                </View>
              )}

              {/* Rating summary */}
              <View style={styles.ratingSummary}>
                <View style={styles.ratingSummaryLeft}>
                  <Text style={styles.ratingSummaryValue}>
                    {avgRating.toFixed(1)}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 2 }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Ionicons
                        key={s}
                        name={
                          s <= Math.round(avgRating) ? "star" : "star-outline"
                        }
                        size={14}
                        color="#f5a623"
                      />
                    ))}
                  </View>
                  <Text style={styles.ratingSummaryCount}>
                    {averageRating.total || reviews.length} đánh giá
                  </Text>
                </View>
                <View style={styles.ratingSummaryRight}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = reviews.filter(
                      (r) => r.rating === star,
                    ).length;
                    const pct =
                      reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                    return (
                      <View key={star} style={styles.ratingBarRow}>
                        <Text style={styles.ratingBarLabel}>{star}</Text>
                        <Ionicons name="star" size={10} color="#f5a623" />
                        <View style={styles.ratingBarTrack}>
                          <View
                            style={[styles.ratingBarFill, { width: `${pct}%` }]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Review list */}
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <View key={review.id} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}>
                        <Text style={{ fontSize: 14 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewUser}>
                          {review.user?.name || "Ẩn danh"}
                        </Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.createdAt).toLocaleDateString(
                            "vi-VN",
                          )}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 1 }}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Ionicons
                            key={s}
                            name={s <= review.rating ? "star" : "star-outline"}
                            size={12}
                            color="#f5a623"
                          />
                        ))}
                      </View>
                    </View>
                    {review.comment ? (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyReview}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={36}
                    color="#ddd"
                  />
                  <Text style={styles.emptyReviewText}>
                    Chưa có đánh giá nào
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ====== RELATED PRODUCTS ====== */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Sản phẩm liên quan</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.relatedList}
            >
              {relatedProducts.map((rp) => {
                const hasDiscount = rp.id % 3 === 0;
                const discountPct = ((rp.id % 4) + 1) * 5;
                const oldPrice = hasDiscount
                  ? Math.round(Number(rp.price) * 1.2)
                  : null;
                const rating = [4.8, 4.6, 4.7, 4.5][rp.id % 4];
                const reviewCount = [124, 145, 167, 98][rp.id % 4];

                return (
                  <TouchableOpacity
                    key={rp.id}
                    style={styles.relatedCard}
                    onPress={() => router.push(`/product/${rp.id}` as any)}
                    activeOpacity={0.7}
                  >
                    {/* Image */}
                    <View style={styles.relatedImageWrapper}>
                      <Image
                        source={{ uri: `${API_URL}${rp.thumbnail}` }}
                        style={styles.relatedImage}
                      />
                      {rp.id % 2 === 0 && (
                        <View style={styles.relatedBadge}>
                          <Text style={styles.relatedBadgeText}>Nổi bật</Text>
                        </View>
                      )}
                      {hasDiscount && (
                        <View style={styles.relatedDiscount}>
                          <Text style={styles.relatedDiscountText}>
                            -{discountPct}%
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.relatedInfo}>
                      <Text style={styles.relatedName} numberOfLines={1}>
                        {rp.name}
                      </Text>
                      <Text style={styles.relatedCategory} numberOfLines={1}>
                        {rp.category?.name || rp.unit}
                      </Text>

                      {/* Rating */}
                      <View style={styles.relatedRating}>
                        <Ionicons name="star" size={11} color="#f5a623" />
                        <Text style={styles.relatedRatingValue}>{rating}</Text>
                        <Text style={styles.relatedRatingCount}>
                          ({reviewCount})
                        </Text>
                      </View>

                      {/* Price */}
                      <View style={styles.relatedPriceRow}>
                        <Text style={styles.relatedPrice}>
                          {Number(rp.price).toLocaleString("vi-VN")}đ
                        </Text>
                        {oldPrice && (
                          <Text style={styles.relatedOldPrice}>
                            {oldPrice.toLocaleString("vi-VN")}đ
                          </Text>
                        )}
                      </View>

                      {/* Add to cart button */}
                      <TouchableOpacity
                        style={styles.relatedAddBtn}
                        onPress={(e) => {
                          e.stopPropagation();

                          // Kiểm tra đăng nhập
                          if (!user) {
                            Alert.alert(
                              "Vui lòng đăng nhập",
                              "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng",
                              [
                                { text: "Hủy", style: "cancel" },
                                {
                                  text: "Đăng nhập",
                                  onPress: () =>
                                    router.push("/auth/login" as any),
                                },
                              ],
                            );
                            return;
                          }

                          // Nếu đã đăng nhập, thêm vào giỏ
                          addToCart({
                            productId: rp.id,
                            name: rp.name,
                            price: rp.price,
                            thumbnail: rp.thumbnail,
                            unit: rp.unit,
                            stock: rp.stock,
                            quantity: 1,
                          });
                          Alert.alert(
                            "Thành công",
                            `Đã thêm ${rp.name} vào giỏ hàng`,
                          );
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="cart-outline" size={13} color="#fff" />
                        <Text style={styles.relatedAddText}>Thêm</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ====== BOTTOM BAR ====== */}
      {product.stock > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={handleAddToCart}
          >
            <Ionicons name="cart-outline" size={20} color={Colors.primary} />
            <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNowBtn} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Mua ngay</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  // Image
  imageSection: {
    width,
    height: width * 0.85,
    backgroundColor: "#f5f5f5",
    position: "relative",
  },
  mainImage: { width: "100%", height: "100%", resizeMode: "cover" },
  backBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  shareBtn: {
    position: "absolute",
    top: 50,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imgBadge: {
    position: "absolute",
    bottom: 14,
    left: 14,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imgBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  imgDiscount: {
    position: "absolute",
    bottom: 14,
    right: 14,
    backgroundColor: "#e04949",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  imgDiscountText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Thumbnails
  thumbList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
  },
  thumbItem: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "#eee",
  },
  thumbActive: { borderColor: Colors.primary, borderWidth: 2.5 },
  thumbImage: { width: "100%", height: "100%", resizeMode: "cover" },

  // Info Card
  infoCard: {
    backgroundColor: "#fff",
    marginHorizontal: 0,
    marginTop: 8,
    padding: 20,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  featuredTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  categoryText: { fontSize: 13, color: "#999" },
  productName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#222",
    marginBottom: 10,
    lineHeight: 30,
  },

  // Rating
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 16,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#444",
    marginLeft: 6,
  },
  ratingCount: { fontSize: 13, color: "#aaa", marginLeft: 2 },

  // Price
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  currentPrice: { fontSize: 28, fontWeight: "900", color: "#333" },
  oldPrice: {
    fontSize: 16,
    color: "#ccc",
    textDecorationLine: "line-through",
  },
  discountTag: {
    backgroundColor: "#e04949",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  discountTagText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  unitText: { fontSize: 14, color: "#aaa" },

  // Stock
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  stockText: { fontSize: 14, color: "#666" },

  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 16,
  },

  // Desc preview
  descPreview: { marginBottom: 0 },
  descPreviewTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  descPreviewText: { fontSize: 14, color: "#888", lineHeight: 22 },

  // Quantity
  qtyLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 12,
    overflow: "hidden",
  },
  qtyBtn: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6ffed",
  },
  qtyBtnDisabled: { backgroundColor: "#fafafa" },
  qtyValueBox: {
    width: 50,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: "#e8e8e8",
  },
  qtyValue: { fontSize: 17, fontWeight: "700", color: "#333" },
  qtyUnit: { fontSize: 14, color: "#aaa" },

  // Tab Card
  tabCard: {
    backgroundColor: "#fff",
    marginTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#f0f0f0",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: { fontSize: 13, fontWeight: "700", color: "#bbb" },
  tabTextActive: { color: Colors.primary },

  tabContent: { padding: 20 },

  // Description
  descFullText: { fontSize: 14, color: "#666", lineHeight: 24 },

  // ====== REVIEW FORM ======
  reviewFormCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  reviewFormTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 14,
  },
  reviewFormLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
  },
  starSelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
  },
  starBtn: {
    padding: 2,
  },
  reviewTextInput: {
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
    minHeight: 80,
    marginBottom: 14,
  },
  submitReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitReviewBtnDisabled: {
    opacity: 0.7,
  },
  submitReviewText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Login prompt
  loginPromptCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  loginPromptText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  loginPromptLink: {
    color: Colors.primary,
    fontWeight: "700",
  },

  // Rating summary
  ratingSummary: {
    flexDirection: "row",
    backgroundColor: "#f6ffed",
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    gap: 20,
  },
  ratingSummaryLeft: {
    alignItems: "center",
    justifyContent: "center",
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: "#e0ecd0",
  },
  ratingSummaryValue: {
    fontSize: 36,
    fontWeight: "900",
    color: Colors.primary,
    marginBottom: 4,
  },
  ratingSummaryCount: { fontSize: 11, color: "#aaa", marginTop: 4 },
  ratingSummaryRight: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingBarLabel: {
    fontSize: 11,
    color: "#888",
    width: 12,
    textAlign: "right",
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#e8e8e8",
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  // Reviews
  reviewItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#c8e6c9",
  },
  reviewUser: { fontSize: 14, fontWeight: "700", color: "#333" },
  reviewDate: { fontSize: 11, color: "#bbb", marginTop: 1 },
  reviewComment: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginLeft: 46,
  },

  emptyReview: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyReviewText: { fontSize: 14, color: "#bbb" },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 5,
  },
  addToCartBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: "#fff",
  },
  addToCartText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  buyNowBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  buyNowText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // ====== RELATED PRODUCTS ======
  relatedSection: {
    backgroundColor: "#fff",
    marginTop: 8,
    paddingTop: 20,
    paddingBottom: 16,
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222",
    fontStyle: "italic",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  relatedList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  relatedCard: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#ebebeb",
    overflow: "hidden",
    marginRight: 12,
  },
  relatedImageWrapper: {
    position: "relative",
    width: "100%",
    height: 120,
  },
  relatedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  relatedBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  relatedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  relatedDiscount: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#e04949",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 14,
  },
  relatedDiscountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  relatedInfo: {
    padding: 10,
  },
  relatedName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    marginBottom: 2,
    lineHeight: 16,
  },
  relatedCategory: {
    fontSize: 11,
    color: "#888",
    marginBottom: 4,
  },
  relatedRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 6,
  },
  relatedRatingValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  relatedRatingCount: {
    fontSize: 11,
    color: "#bbb",
  },
  relatedPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  relatedPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e04949",
  },
  relatedOldPrice: {
    fontSize: 11,
    color: "#bbb",
    textDecorationLine: "line-through",
  },
  relatedUnit: {
    fontSize: 11,
    color: "#999",
  },
  relatedAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    borderRadius: 7,
  },
  relatedAddText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
