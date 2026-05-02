import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient, { API_URL } from "../../api/axiosClient";
import { useAuth } from "../../contexts/useAuth";
import { useCart } from "../../contexts/useCart";

const { width } = Dimensions.get("window");
const CARD_W = (width - 52) / 2;

const T = {
  primary: "#00875A",
  accent: "#FF6B3D",
  price: "#E53935",
  bg: "#F0FAF4",
  card: "#FFFFFF",
  text: "#0D1F14",
  textSec: "#6B8F7B",
  textMuted: "#A3BFB0",
  border: "#C8E8D5",
  star: "#FFB800",
};

const bannerSlides = [
  {
    image:
      "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=800&q=80",
    tag: "🌿 ORGANIC",
    title: "Trái Cây Tươi\nMỗi Ngày",
    subtitle: "Từ vườn đến tay bạn trong 24 giờ",
  },
  {
    image:
      "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800&q=80",
    tag: "🥭 NHẬP KHẨU",
    title: "Hoa Quả\nCao Cấp",
    subtitle: "Đa dạng chủng loại từ khắp thế giới",
  },
  {
    image:
      "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=800&q=80",
    tag: "💪 VITAMIN",
    title: "Sống Khoẻ\nSống Đẹp",
    subtitle: "Bổ sung dưỡng chất mỗi ngày",
  },
];

const getRating = (id: number) =>
  [4.8, 4.6, 4.9, 4.7, 4.5, 5.0, 4.4, 4.8][id % 8];
const getReviews = (id: number) =>
  [124, 256, 189, 98, 312, 67, 203, 156][id % 8];
const getDiscount = (id: number) => (id % 3 === 0 ? ((id % 4) + 1) * 5 : 0);

interface Category {
  id: number;
  name: string;
  image: string;
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

function ProductCard({
  product,
  onPress,
  onAddToCart,
  style,
}: {
  product: Product;
  onPress: () => void;
  onAddToCart: () => void;
  style?: any;
}) {
  const rating = getRating(product.id);
  const reviews = getReviews(product.id);
  const discount = getDiscount(product.id);

  return (
    <TouchableOpacity
      style={[s.pCard, style]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={s.pImgWrap}>
        {product.thumbnail ? (
          <Image
            source={{ uri: `${API_URL}${product.thumbnail}` }}
            style={s.pImg}
          />
        ) : (
          <View style={s.pImgFallback}>
            <Text style={{ fontSize: 40 }}>🍊</Text>
          </View>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.08)"]}
          style={s.pImgGrad}
        />
        <View style={s.pBadgeRow}>
          <LinearGradient
            colors={["#1a7a3c", "#2ecc71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.pBadge}
          >
            <Text style={s.pBadgeText}>Nổi bật</Text>
          </LinearGradient>
          {discount > 0 && (
            <View style={s.pDiscBadge}>
              <Text style={s.pDiscText}>-{discount}%</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={s.pHeart} activeOpacity={0.7}>
          <Ionicons name="heart-outline" size={15} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={s.pInfo}>
        <Text style={s.pName} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={s.pCat} numberOfLines={1}>
          {product.category?.name || ""}
        </Text>
        <View style={s.pRatingRow}>
          <Ionicons name="star" size={11} color={T.star} />
          <Text style={s.pRatingVal}>{rating}</Text>
          <Text style={s.pRatingCnt}>({reviews})</Text>
        </View>
        <View style={s.pBottom}>
          <View style={{ flex: 1 }}>
            <Text style={s.pPrice}>
              {Number(product.price).toLocaleString("vi-VN")}đ
            </Text>
            <Text style={s.pUnit}>/{product.unit}</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              onAddToCart();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.pCartBtn}
            >
              <Ionicons name="cart-outline" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({
  title,
  onSeeAll,
}: {
  title: string;
  onSeeAll: () => void;
}) {
  return (
    <View style={s.secHeader}>
      <View style={s.secTitleRow}>
        <View style={s.secBar} />
        <Text style={s.secTitle}>{title}</Text>
      </View>
      <TouchableOpacity
        onPress={onSeeAll}
        style={s.seeAllBtn}
        activeOpacity={0.7}
      >
        <Text style={s.seeAllText}>Xem tất cả</Text>
        <Ionicons name="arrow-forward" size={13} color={T.primary} />
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const { user } = useAuth();
  const { addToCart } = useCart();
  const router = useRouter();
  const bannerRef = useRef<ScrollView>(null);

  const fetchData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        axiosClient.get("/categories"),
        axiosClient.get("/products"),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => {
        const next = (prev + 1) % bannerSlides.length;
        bannerRef.current?.scrollTo({ x: next * (width - 40), animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleSearch = () => {
    if (searchText.trim())
      router.push(`/(tabs)/products?search=${encodeURIComponent(searchText)}`);
  };

  const handleAddToCart = (p: Product) => {
    // Kiểm tra đăng nhập trước khi thêm vào giỏ
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

    // Nếu đã đăng nhập, thêm vào giỏ hàng
    addToCart({
      productId: p.id,
      name: p.name,
      price: p.price,
      thumbnail: p.thumbnail,
      unit: p.unit,
      stock: p.stock || 99,
      quantity: 1,
    });
  };

  if (loading)
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
          />
        }
      >
        <LinearGradient
          colors={["#1a7a3c", "#2ecc71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.headerGrad}
        >
          <View
            style={[
              s.deco,
              { width: 200, height: 200, top: -70, right: -50, opacity: 0.12 },
            ]}
          />
          <View
            style={[
              s.deco,
              { width: 90, height: 90, bottom: 30, left: -20, opacity: 0.08 },
            ]}
          />
          <View
            style={[
              s.deco,
              {
                width: 50,
                height: 50,
                top: 40,
                left: width * 0.4,
                opacity: 0.06,
              },
            ]}
          />

          <View style={s.headerTop}>
            <View style={s.headerLeft}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(user?.name || "K")[0].toUpperCase()}
                </Text>
                <View style={s.avatarDot} />
              </View>
              <View>
                <Text style={s.greeting}>Xin chào 👋</Text>
                <Text style={s.userName}>{user?.name || "Khách"}</Text>
              </View>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.headerIconBtn} activeOpacity={0.7}>
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <View style={s.notifDot} />
              </TouchableOpacity>
              {/* ====== THAY ICON 🍒 BẰNG LOGO CÔNG TY ====== */}
              <View style={s.logoPill}>
                <Image
                  source={require("../../assets/company-logo.png")}
                  style={s.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          <View style={s.searchBar}>
            <Ionicons name="search" size={18} color="rgba(0,100,50,0.4)" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm kiếm trái cây tươi ngon..."
              placeholderTextColor="rgba(0,100,50,0.35)"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color="rgba(0,100,50,0.3)"
                />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        <View style={s.bannerOuter}>
          <ScrollView
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setCurrentSlide(
                Math.round(e.nativeEvent.contentOffset.x / (width - 40)),
              )
            }
          >
            {bannerSlides.map((slide, i) => (
              <View key={i} style={[s.bannerSlide, { width: width - 40 }]}>
                <Image
                  source={{ uri: slide.image }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["rgba(0,60,30,0.7)", "rgba(0,100,50,0.3)"]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={s.bannerContent}>
                  <View style={s.bannerTag}>
                    <Text style={s.bannerTagText}>{slide.tag}</Text>
                  </View>
                  <Text style={s.bannerTitle}>{slide.title}</Text>
                  <Text style={s.bannerSub}>{slide.subtitle}</Text>
                  <TouchableOpacity
                    style={s.bannerCta}
                    onPress={() => router.push("/(tabs)/products")}
                    activeOpacity={0.85}
                  >
                    <Text style={s.bannerCtaText}>Khám phá ngay</Text>
                    <View style={s.bannerCtaArrow}>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={T.primary}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={s.dotsWrap}>
            {bannerSlides.map((_, i) => (
              <View
                key={i}
                style={[s.dot, currentSlide === i && s.dotActive]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipScroll}
        >
          {[
            {
              icon: "leaf",
              label: "100% Organic",
              color: "#00875A",
              bg: "#E8F5EE",
            },
            {
              icon: "car",
              label: "Giao hàng 2h",
              color: "#2196f3",
              bg: "#E3F2FD",
            },
            {
              icon: "shield-checkmark",
              label: "Hoàn tiền 100%",
              color: "#FF9800",
              bg: "#FFF3E0",
            },
            { icon: "star", label: "VietGAP", color: "#9C27B0", bg: "#F3E5F5" },
          ].map((f, i) => (
            <View key={i} style={[s.chip, { backgroundColor: f.bg }]}>
              <Ionicons name={f.icon as any} size={13} color={f.color} />
              <Text style={[s.chipText, { color: f.color }]}>{f.label}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={s.statsCard}>
          {[
            {
              value: "5000+",
              label: "Khách hàng",
              icon: "people",
              color: "#2196f3",
            },
            {
              value: "100%",
              label: "Tươi ngon",
              icon: "leaf",
              color: "#4caf50",
            },
            {
              value: "99%",
              label: "Hài lòng",
              icon: "heart",
              color: "#e91e63",
            },
            {
              value: "50+",
              label: "Loại quả",
              icon: "nutrition",
              color: "#ff9800",
            },
          ].map((st, i) => (
            <View key={i} style={s.statItem}>
              <View style={[s.statIcon, { backgroundColor: st.color + "15" }]}>
                <Ionicons name={st.icon as any} size={15} color={st.color} />
              </View>
              <Text style={s.statVal}>{st.value}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <SectionHeader
            title="Danh mục"
            onSeeAll={() => router.push("/(tabs)/products")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={s.catItem}
                onPress={() =>
                  router.push(`/(tabs)/products?category=${cat.id}`)
                }
                activeOpacity={0.75}
              >
                <View style={s.catImgWrap}>
                  {cat.image ? (
                    <Image
                      source={{ uri: `${API_URL}${cat.image}` }}
                      style={s.catImg}
                    />
                  ) : (
                    <Ionicons name="leaf" size={26} color={T.primary} />
                  )}
                </View>
                <Text style={s.catName} numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={s.section}>
          <SectionHeader
            title="Sản phẩm nổi bật"
            onSeeAll={() => router.push("/(tabs)/products")}
          />
          <View style={s.grid}>
            {products.slice(0, 4).map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                style={{ width: CARD_W }}
                onPress={() => router.push(`/product/${p.id}` as any)}
                onAddToCart={() => handleAddToCart(p)}
              />
            ))}
          </View>
        </View>

        {categories.map((cat) => {
          const cp = products.filter((p) => p.category?.id === cat.id);
          if (cp.length === 0) return null;
          return (
            <View key={cat.id} style={s.section}>
              <SectionHeader
                title={cat.name}
                onSeeAll={() =>
                  router.push(`/(tabs)/products?category=${cat.id}`)
                }
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
              >
                {cp.slice(0, 6).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    style={{ width: 170, marginRight: 12 }}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                    onAddToCart={() => handleAddToCart(p)}
                  />
                ))}
              </ScrollView>
            </View>
          );
        })}

        <View style={s.ctaOuter}>
          <LinearGradient
            colors={["#1a7a3c", "#2ecc71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.ctaCard}
          >
            <View
              style={[
                s.deco,
                { width: 160, height: 160, top: -50, right: -30, opacity: 0.1 },
              ]}
            />
            <View
              style={[
                s.deco,
                { width: 70, height: 70, bottom: -15, left: 20, opacity: 0.07 },
              ]}
            />
            <Text style={s.ctaEmoji}>🍎🍊🍇🥝🍑</Text>
            <Text style={s.ctaTitle}>Đặt hàng ngay!</Text>
            <Text style={s.ctaSub}>
              Hàng ngàn khách hàng tin tưởng{"\n"}Halona Fruits mỗi ngày
            </Text>
            <TouchableOpacity
              style={s.ctaBtn}
              onPress={() => router.push("/(tabs)/products")}
              activeOpacity={0.85}
            >
              <Text style={s.ctaBtnText}>Mua sắm ngay</Text>
              <Ionicons name="arrow-forward" size={16} color={T.primary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
  },
  deco: { position: "absolute", borderRadius: 9999, backgroundColor: "#fff" },

  // ── HEADER ──
  headerGrad: {
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    position: "relative",
  },
  avatarText: { fontSize: 18, fontWeight: "900", color: "#fff" },
  avatarDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#7cfc00",
    borderWidth: 2.5,
    borderColor: "#1a7a3c",
  },
  greeting: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  userName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FF6B3D",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  logoPill: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    padding: 6,
  },
  logoImage: {
    width: 30,
    height: 30,
  },

  // ── SEARCH ──
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.text },

  // ── BANNER ──
  bannerOuter: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 22,
    overflow: "hidden",
    height: 210,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bannerSlide: { height: 210, overflow: "hidden" },
  bannerContent: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 22,
    paddingBottom: 36,
  },
  bannerTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  bannerTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  bannerTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 33,
    letterSpacing: -0.8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bannerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "500",
  },
  bannerCta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingLeft: 18,
    paddingRight: 5,
    paddingVertical: 5,
    borderRadius: 26,
    marginTop: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bannerCtaText: { color: T.primary, fontWeight: "800", fontSize: 13 },
  bannerCtaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  dotsWrap: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: { width: 26, borderRadius: 4, backgroundColor: "#fff" },

  // ── CHIPS ──
  chipScroll: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 22,
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "700" },

  // ── STATS ──
  statsCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: T.card,
    borderRadius: 20,
    padding: 14,
    shadowColor: "#0A3A1A",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "900",
    color: T.text,
    letterSpacing: -0.5,
  },
  statLbl: { fontSize: 10, color: T.textMuted, fontWeight: "500" },

  // ── SECTION ──
  section: { marginTop: 24 },
  secHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  secTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  secBar: { width: 4, height: 20, borderRadius: 2, backgroundColor: T.primary },
  secTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: T.text,
    letterSpacing: -0.3,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  seeAllText: { fontSize: 12, color: T.primary, fontWeight: "700" },

  // ── CATEGORY ──
  catItem: { alignItems: "center", marginRight: 14, width: 74 },
  catImgWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  catImg: { width: 64, height: 64, resizeMode: "cover" },
  catName: {
    fontSize: 11,
    color: T.textSec,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── PRODUCT GRID ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
  },

  // ── PRODUCT CARD ──
  pCard: {
    backgroundColor: T.card,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#0A3A1A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 4,
  },
  pImgWrap: {
    width: "100%",
    height: 150,
    backgroundColor: "#f5f7f5",
    position: "relative",
    overflow: "hidden",
  },
  pImg: { width: "100%", height: "100%", resizeMode: "cover" },
  pImgFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5EE",
  },
  pImgGrad: { position: "absolute", bottom: 0, left: 0, right: 0, height: 40 },
  pBadgeRow: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    gap: 4,
  },
  pBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  pBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  pDiscBadge: {
    backgroundColor: T.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pDiscText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  pHeart: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  pInfo: { padding: 12 },
  pName: { fontSize: 14, fontWeight: "700", color: T.text, marginBottom: 2 },
  pCat: { fontSize: 11, color: T.textMuted, marginBottom: 6 },
  pRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  pRatingVal: { fontSize: 12, fontWeight: "700", color: T.text },
  pRatingCnt: { fontSize: 11, color: T.textMuted },
  pBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: T.price,
    letterSpacing: -0.3,
  },
  pUnit: { fontSize: 11, color: T.textMuted, marginTop: 1 },
  pCartBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  // ── CTA ──
  ctaOuter: { marginHorizontal: 16, marginTop: 28 },
  ctaCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
  },
  ctaEmoji: { fontSize: 34, marginBottom: 10 },
  ctaTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  ctaSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  ctaBtnText: { color: T.primary, fontWeight: "800", fontSize: 15 },
});
