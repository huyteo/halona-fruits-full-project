import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { API_URL } from "../../api/axiosClient";
import { useAuth } from "../../contexts/useAuth";
import { useCart } from "../../contexts/useCart";

const { width } = Dimensions.get("window");

// ─── Design Tokens ──────────────────────────────────────────────────────────
const C = {
  emerald: "#00875A",
  emeraldDark: "#005C3B",
  lime: "#52C476",
  limeLight: "#D4F7E2",
  limeXLight: "#EDFBF3",
  coral: "#FF5A36",
  coralLight: "#FFF0EC",
  amber: "#FFB020",
  bg: "#F0FAF4",
  white: "#FFFFFF",
  text: "#0D1F14",
  textMid: "#3D6B50",
  muted: "#88A899",
  border: "#C8E8D5",
  price: "rgb(0, 166, 62)",
};

// ─── Floating Fruit (dùng cho empty state) ──────────────────────────────────
const FRUITS = [
  { emoji: "🍎", x: 0.06, delay: 0, duration: 3200 },
  { emoji: "🍊", x: 0.8, delay: 350, duration: 2800 },
  { emoji: "🍇", x: 0.2, delay: 800, duration: 3600 },
  { emoji: "🥝", x: 0.68, delay: 550, duration: 3000 },
  { emoji: "🍓", x: 0.44, delay: 1100, duration: 2600 },
  { emoji: "🍌", x: 0.56, delay: 180, duration: 3400 },
];

function FloatingFruit({
  emoji,
  x,
  delay,
  duration,
}: {
  emoji: string;
  x: number;
  delay: number;
  duration: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -14,
              duration: duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, {
              toValue: 1,
              duration: duration,
              useNativeDriver: true,
            }),
            Animated.timing(rotate, {
              toValue: -1,
              duration: duration,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]),
    ]).start();
  }, []);

  const rot = rotate.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-12deg", "12deg"],
  });

  return (
    <Animated.Text
      style={{
        position: "absolute",
        left: x * (width - 40),
        top: 0,
        fontSize: 26,
        opacity,
        transform: [{ translateY }, { rotate: rot }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ─── Cart Item Card ─────────────────────────────────────────────────────────
function CartItemCard({
  item,
  isSelected,
  index,
  onToggle,
  onUpdateQty,
  onRemove,
  onNavigate,
}: any) {
  const enterY = useRef(new Animated.Value(40)).current;
  const enterO = useRef(new Animated.Value(0)).current;
  const scaleA = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(enterY, {
        toValue: 0,
        friction: 7,
        tension: 50,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.timing(enterO, {
        toValue: 1,
        duration: 300,
        delay: index * 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleA, {
        toValue: 1,
        friction: 6,
        delay: index * 70,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const itemTotal = item.price * item.quantity;
  const canDecrease = item.quantity > 1;
  const canIncrease = item.quantity < item.stock;

  return (
    <Animated.View
      style={{
        opacity: enterO,
        transform: [{ translateY: enterY }, { scale: scaleA }],
      }}
    >
      <View style={[styles.card, isSelected && styles.cardActive]}>
        {isSelected && (
          <LinearGradient
            colors={["#1a7a3c", "#2ecc71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardTopStrip}
          />
        )}
        <View style={styles.cardInner}>
          {/* Checkbox */}
          <TouchableOpacity
            onPress={() => onToggle(item.productId)}
            activeOpacity={0.7}
            style={styles.cbWrap}
          >
            <LinearGradient
              colors={
                isSelected ? ["#1a7a3c", "#2ecc71"] : ["#E2EEE6", "#E2EEE6"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cbGrad}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Image */}
          <TouchableOpacity
            onPress={() => onNavigate(item.productId)}
            activeOpacity={0.88}
          >
            <View
              style={[styles.imgShell, isSelected && styles.imgShellActive]}
            >
              {item.thumbnail ? (
                <Image
                  source={{ uri: `${API_URL}${item.thumbnail}` }}
                  style={styles.productImg}
                />
              ) : (
                <View style={styles.imgFallback}>
                  <Text style={{ fontSize: 34 }}>🍊</Text>
                </View>
              )}
              <View style={styles.imgGloss} />
            </View>
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.cardBody}>
            <View style={styles.nameRow}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
              <TouchableOpacity
                onPress={() => onRemove(item.productId, item.name)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={styles.removeBtn}
              >
                <Ionicons name="close" size={13} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Price pill */}
            <View style={styles.pricePillRow}>
              <LinearGradient
                colors={[C.coral, "#FF8A6F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pricePill}
              >
                <Text style={styles.pricePillText}>
                  {Number(item.price).toLocaleString("vi-VN")}đ
                  <Text style={styles.pricePillUnit}> /{item.unit}</Text>
                </Text>
              </LinearGradient>
            </View>

            {/* Qty + subtotal */}
            <View style={styles.qtyRow}>
              <View style={styles.qtyGroup}>
                <TouchableOpacity
                  style={[
                    styles.qtyBtnCircle,
                    !canDecrease && styles.qtyBtnOff,
                  ]}
                  onPress={() =>
                    onUpdateQty(item.productId, Math.max(1, item.quantity - 1))
                  }
                  disabled={!canDecrease}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="remove"
                    size={15}
                    color={canDecrease ? C.emerald : "#C8D8CC"}
                  />
                </TouchableOpacity>
                <View style={styles.qtyValuePill}>
                  <Text style={styles.qtyValueText}>{item.quantity}</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.qtyBtnCircle,
                    !canIncrease && styles.qtyBtnOff,
                  ]}
                  onPress={() =>
                    onUpdateQty(
                      item.productId,
                      Math.min(item.stock, item.quantity + 1),
                    )
                  }
                  disabled={!canIncrease}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="add"
                    size={15}
                    color={canIncrease ? C.emerald : "#C8D8CC"}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.subtotalBadge}>
                <Text style={styles.subtotalText}>
                  {itemTotal.toLocaleString("vi-VN")}đ
                </Text>
              </View>
            </View>

            {!canIncrease && (
              <View style={styles.stockRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={11}
                  color={C.amber}
                />
                <Text style={styles.stockText}>
                  Đã đạt tối đa ({item.stock} {item.unit})
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function CartScreen() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(headerY, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(headerO, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedItems = items.filter((i) => selectedIds.includes(i.productId));
  const selectedTotal = selectedItems.reduce(
    (s, i) => s + i.price * i.quantity,
    0,
  );
  const selectedCount = selectedIds.length;
  const freeShip = selectedTotal >= 200000;
  const shippingFee = freeShip ? 0 : 25000;
  const grandTotal = selectedTotal + shippingFee;
  const progressPct = Math.min((selectedTotal / 200000) * 100, 100);

  const toggleSelect = (id: number) =>
    setSelectedIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const toggleAll = () =>
    setSelectedIds(isAllSelected ? [] : items.map((i) => i.productId));

  const handleRemove = (productId: number, name: string) =>
    Alert.alert("Xóa sản phẩm", `Bỏ "${name}" khỏi giỏ hàng?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          removeFromCart(productId);
          setSelectedIds((p) => p.filter((x) => x !== productId));
        },
      },
    ]);

  const handleClear = () =>
    Alert.alert("Xóa giỏ hàng", "Xóa toàn bộ sản phẩm?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa hết",
        style: "destructive",
        onPress: () => {
          clearCart();
          setSelectedIds([]);
        },
      },
    ]);

  const handleDeleteSelected = () => {
    if (!selectedCount) return;
    Alert.alert("Xóa đã chọn", `Xóa ${selectedCount} sản phẩm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          selectedIds.forEach((id) => removeFromCart(id));
          setSelectedIds([]);
        },
      },
    ]);
  };

  const handleCheckout = async () => {
    if (!selectedCount) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất 1 sản phẩm");
      return;
    }
    if (!isAuthenticated) {
      router.push("/auth/login" as any);
      return;
    }
    try {
      await AsyncStorage.setItem(
        "checkoutItems",
        JSON.stringify(selectedItems),
      );
    } catch (e) {
      console.error("Lỗi lưu checkoutItems:", e);
    }
    router.push("/checkout" as any);
  };

  // ── EMPTY STATE (ĐÃ NÂNG CẤP) ────────────────────────────────────────────
  // ── KIỂM TRA ĐĂNG NHẬP ────────────────────────────────────────────────────
  // Nếu chưa đăng nhập → Hiển thị empty cart với message đăng nhập
  if (!isAuthenticated) {
    return <EmptyCartScreen router={router} requireLogin={true} />;
  }

  // ── EMPTY STATE (GIỎ HÀNG TRỐNG) ──────────────────────────────────────────
  if (items.length === 0) {
    return <EmptyCartScreen router={router} requireLogin={false} />;
  }

  // ── MAIN ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={["#1a7a3c", "#2ecc71"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGrad}
      >
        <View
          style={[
            styles.decoBubble,
            { width: 160, height: 160, top: -50, right: -30, opacity: 0.15 },
          ]}
        />
        <View
          style={[
            styles.decoBubble,
            { width: 70, height: 70, bottom: 6, left: 16, opacity: 0.1 },
          ]}
        />
        <Animated.View
          style={[
            styles.headerContent,
            { opacity: headerO, transform: [{ translateY: headerY }] },
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Giỏ hàng</Text>
            <View style={styles.headerCountPill}>
              <Text style={styles.headerCountTxt}>{items.length} sản phẩm</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {selectedCount > 0 && (
              <TouchableOpacity
                onPress={handleDeleteSelected}
                style={styles.headerDelBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={14} color="#FFB3A3" />
                <Text style={styles.headerDelTxt}>Xóa ({selectedCount})</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleClear}
              style={styles.headerMoreBtn}
              activeOpacity={0.7}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={18}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ── SELECT ALL ── */}
        <View style={styles.selectBar}>
          <TouchableOpacity
            style={styles.selectLeft}
            onPress={toggleAll}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                isAllSelected ? ["#1a7a3c", "#2ecc71"] : ["#E2EEE6", "#E2EEE6"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cbGrad}
            >
              {isAllSelected && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </LinearGradient>
            <Text style={styles.selectTxt}>
              {isAllSelected
                ? "Bỏ chọn tất cả"
                : `Chọn tất cả (${items.length})`}
            </Text>
          </TouchableOpacity>
          {selectedCount > 0 && (
            <View style={styles.selectedCountBadge}>
              <Text style={styles.selectedCountTxt}>
                ✓ {selectedCount} đã chọn
              </Text>
            </View>
          )}
        </View>

        {/* ── ITEMS ── */}
        <View style={styles.itemsWrap}>
          {items.map((item, idx) => (
            <CartItemCard
              key={item.productId}
              item={item}
              index={idx}
              isSelected={selectedIds.includes(item.productId)}
              onToggle={toggleSelect}
              onUpdateQty={updateQuantity}
              onRemove={handleRemove}
              onNavigate={(id: number) => router.push(`/product/${id}` as any)}
            />
          ))}
        </View>

        {/* ── FREE SHIP PROGRESS ── */}
        {!freeShip && selectedTotal > 0 && (
          <View style={styles.freeShipCard}>
            <View style={styles.freeShipTop}>
              <View style={styles.freeShipIconBox}>
                <Text style={{ fontSize: 20 }}>🚚</Text>
              </View>
              <Text style={styles.freeShipMsg}>
                Mua thêm{" "}
                <Text style={styles.freeShipHL}>
                  {(200000 - selectedTotal).toLocaleString("vi-VN")}đ
                </Text>{" "}
                để miễn phí ship!
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#1a7a3c", "#2ecc71"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.progressFill,
                  { width: `${progressPct}%` as any },
                ]}
              />
              <View
                style={[styles.progressDot, { left: `${progressPct}%` as any }]}
              />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>0đ</Text>
              <Text
                style={[
                  styles.progressLabel,
                  { color: C.emerald, fontWeight: "700" },
                ]}
              >
                200.000đ
              </Text>
            </View>
          </View>
        )}

        {freeShip && (
          <View style={styles.freeShipWon}>
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.freeShipWonGrad}
            >
              <Text style={{ fontSize: 20 }}>🎉</Text>
              <Text style={styles.freeShipWonTxt}>
                Bạn được miễn phí vận chuyển!
              </Text>
              <View style={styles.freeShipCheck}>
                <Ionicons name="checkmark" size={14} color={C.emerald} />
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ── ORDER SUMMARY ── */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHead}>
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryHeadIcon}
            >
              <Ionicons name="receipt-outline" size={16} color="#fff" />
            </LinearGradient>
            <Text style={styles.summaryHeadTxt}>Chi tiết đơn hàng</Text>
          </View>

          <View style={styles.dottedLine} />

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Tạm tính ({selectedItems.reduce((s, i) => s + i.quantity, 0)}{" "}
                sp)
              </Text>
              <Text style={styles.summaryVal}>
                {selectedTotal.toLocaleString("vi-VN")}đ
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                {freeShip && (
                  <LinearGradient
                    colors={["#1a7a3c", "#2ecc71"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.freePill}
                  >
                    <Text style={styles.freePillTxt}>FREE</Text>
                  </LinearGradient>
                )}
              </View>
              <Text
                style={[styles.summaryVal, freeShip && { color: C.emerald }]}
              >
                {freeShip
                  ? "Miễn phí"
                  : `+${shippingFee.toLocaleString("vi-VN")}đ`}
              </Text>
            </View>
          </View>

          <LinearGradient
            colors={["#1a7a3c", "#2ecc71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.totalBlock}
          >
            <View style={styles.totalRow}>
              <View>
                <Text style={[styles.totalLabel, { color: "#fff" }]}>
                  Tổng cộng
                </Text>
                <Text
                  style={[styles.totalVAT, { color: "rgba(255,255,255,0.75)" }]}
                >
                  Đã bao gồm VAT
                </Text>
              </View>
              <Text style={[styles.totalVal, { color: "#fff" }]}>
                {grandTotal.toLocaleString("vi-VN")}đ
              </Text>
            </View>
          </LinearGradient>
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>

      {/* ── BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomHandle} />
        <View style={styles.bottomInner}>
          <View style={styles.bottomInfo}>
            {selectedCount > 0 ? (
              <>
                <Text style={styles.bottomHint}>
                  {selectedCount} sản phẩm đã chọn
                </Text>
                <Text style={styles.bottomTotal}>
                  {grandTotal.toLocaleString("vi-VN")}đ
                </Text>
              </>
            ) : (
              <Text style={styles.bottomPlaceholder}>Chọn sản phẩm để mua</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleCheckout}
            disabled={selectedCount === 0}
            activeOpacity={0.88}
            style={{ flex: 1, maxWidth: 200 }}
          >
            <LinearGradient
              colors={
                selectedCount > 0
                  ? ["#1a7a3c", "#2ecc71"]
                  : ["#D0D8D2", "#C4CEC6"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkoutBtn}
            >
              <Text
                style={[
                  styles.checkoutTxt,
                  selectedCount === 0 && { color: "#A0A8A2" },
                ]}
              >
                {!isAuthenticated
                  ? "Đăng nhập"
                  : selectedCount > 0
                    ? `Đặt hàng (${selectedCount})`
                    : "Đặt hàng"}
              </Text>
              <View
                style={[
                  styles.checkoutArrow,
                  selectedCount === 0 && { backgroundColor: "#B8C2BA" },
                ]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={selectedCount > 0 ? C.emerald : "#888"}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Empty Cart Screen (tách riêng để gọn) ──────────────────────────────────
function EmptyCartScreen({
  router,
  requireLogin = false,
}: {
  router: any;
  requireLogin?: boolean;
}) {
  // Entrance animations
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(32)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const btnSlide = useRef(new Animated.Value(40)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.spring(textSlide, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(btnOpacity, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
        Animated.spring(btnSlide, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.07,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1.0,
          duration: 1400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View style={styles.emptyRoot}>
      <StatusBar barStyle="light-content" />

      {/* Hero gradient */}
      <LinearGradient
        colors={["#1a7a3c", "#2ecc71"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.emptyGradBg}
      >
        <View
          style={[
            styles.decoBubble,
            { width: 260, height: 260, top: -90, right: -80, opacity: 0.13 },
          ]}
        />
        <View
          style={[
            styles.decoBubble,
            { width: 130, height: 130, top: 50, left: -40, opacity: 0.1 },
          ]}
        />
        <View
          style={[
            styles.decoBubble,
            { width: 70, height: 70, bottom: 20, right: 50, opacity: 0.08 },
          ]}
        />

        {/* Floating fruits */}
        <View style={styles.emptyFruitsRow}>
          {FRUITS.map((f) => (
            <FloatingFruit key={f.emoji} {...f} />
          ))}
        </View>

        {/* Icon */}
        <Animated.View
          style={[
            styles.emptyIconWrap,
            {
              opacity: iconOpacity,
              transform: [{ scale: Animated.multiply(iconScale, pulse) }],
            },
          ]}
        >
          <View style={styles.emptyIconGlowOuter} />
          <LinearGradient
            colors={["rgba(255,255,255,0.18)", "rgba(255,255,255,0.06)"]}
            style={styles.emptyIconGlass}
          >
            <Text style={styles.emptyIconEmoji}>
              {requireLogin ? "🔒" : "🛒"}
            </Text>
          </LinearGradient>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyBadgeTxt}>0</Text>
          </View>
        </Animated.View>

        {/* Wave bottom */}
        <View style={styles.emptyWaveWrap}>
          <View style={styles.emptyWave} />
        </View>
      </LinearGradient>

      {/* Body */}
      <View style={styles.emptyBody}>
        {/* Title + desc */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textSlide }],
            alignItems: "center",
          }}
        >
          {requireLogin ? (
            <>
              <Text style={styles.emptyTitle}>Vui lòng đăng nhập!</Text>
              <Text style={styles.emptyDesc}>
                Đăng nhập để xem giỏ hàng{"\n"}và đặt mua trái cây tươi ngon 🍃
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyTitle}>Giỏ hàng trống!</Text>
              <Text style={styles.emptyDesc}>
                Hãy chọn những loại trái cây{"\n"}tươi ngon nhất cho gia đình
                bạn 🍃
              </Text>
            </>
          )}
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.emptyPillsRow, { opacity: textOpacity }]}>
          {[
            { icon: "flash-outline", label: "Giao nhanh" },
            { icon: "shield-checkmark-outline", label: "Đảm bảo" },
            { icon: "leaf-outline", label: "Tươi ngon" },
          ].map((p) => (
            <View key={p.label} style={styles.emptyPill}>
              <Ionicons name={p.icon as any} size={13} color={C.emerald} />
              <Text style={styles.emptyPillTxt}>{p.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View
          style={[
            styles.emptyBtnWrap,
            { opacity: btnOpacity, transform: [{ translateY: btnSlide }] },
          ]}
        >
          {requireLogin ? (
            // Nút Đăng nhập nếu chưa đăng nhập
            <>
              <TouchableOpacity
                onPress={() => router.push("/auth/login" as any)}
                activeOpacity={0.87}
              >
                <LinearGradient
                  colors={["#1a7a3c", "#2ecc71"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <View style={styles.emptyBtnIconBox}>
                    <Ionicons
                      name="log-in-outline"
                      size={16}
                      color={C.emerald}
                    />
                  </View>
                  <Text style={styles.emptyBtnTxt}>Đăng nhập ngay</Text>
                  <View style={styles.emptyArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/auth/register" as any)}
                style={styles.emptySecondaryBtn}
              >
                <Ionicons name="person-add-outline" size={14} color={C.muted} />
                <Text style={styles.emptySecondaryTxt}>Tạo tài khoản mới</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Nút Khám phá nếu đã đăng nhập nhưng giỏ trống
            <>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/products" as any)}
                activeOpacity={0.87}
              >
                <LinearGradient
                  colors={["#1a7a3c", "#2ecc71"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <View style={styles.emptyBtnIconBox}>
                    <Ionicons name="leaf" size={16} color={C.emerald} />
                  </View>
                  <Text style={styles.emptyBtnTxt}>Khám phá sản phẩm</Text>
                  <View style={styles.emptyArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(tabs)" as any)}
                style={styles.emptySecondaryBtn}
              >
                <Ionicons name="home-outline" size={14} color={C.muted} />
                <Text style={styles.emptySecondaryTxt}>Về trang chủ</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.push("/(tabs)" as any)}
            style={styles.emptySecondaryBtn}
          >
            <Ionicons name="home-outline" size={14} color={C.muted} />
            <Text style={styles.emptySecondaryTxt}>Về trang chủ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 130 },
  decoBubble: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#fff",
  },

  // ── EMPTY ──────────────────────────────────────────────────────────────────
  emptyRoot: { flex: 1, backgroundColor: "#f0f9f3" },
  emptyGradBg: {
    height: 290,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 65,
    overflow: "hidden",
  },
  emptyFruitsRow: {
    position: "absolute",
    top: Platform.OS === "ios" ? 68 : 48,
    left: 0,
    right: 0,
    height: 80,
  },
  // Icon
  emptyIconWrap: { alignItems: "center", justifyContent: "center" },
  emptyIconGlowOuter: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 36,
    backgroundColor: "#fff",
    opacity: 0.1,
  },
  emptyIconGlass: {
    width: 108,
    height: 108,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
  },
  emptyIconEmoji: { fontSize: 54 },
  emptyBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.coral,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
  },
  emptyBadgeTxt: { color: "#fff", fontSize: 13, fontWeight: "900" },
  // Wave
  emptyWaveWrap: { position: "absolute", bottom: 0, left: 0, right: 0 },
  emptyWave: {
    height: 55,
    backgroundColor: "#f0f9f3",
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
    marginHorizontal: -20,
  },
  // Body
  emptyBody: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 8,
    gap: 20,
  },
  emptyTitle: {
    fontSize: 27,
    fontWeight: "900",
    color: C.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center",
    lineHeight: 23,
  },
  // Pills
  emptyPillsRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  emptyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.limeXLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyPillTxt: { fontSize: 12, color: C.emerald, fontWeight: "600" },
  // CTA
  emptyBtnWrap: {
    width: "100%",
    alignItems: "center",
    gap: 14,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 10,
    width: width - 56,
    shadowColor: C.emerald,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyBtnIconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyBtnTxt: {
    flex: 1,
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.1,
  },
  emptyArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptySecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
  },
  emptySecondaryTxt: { fontSize: 13, color: C.muted, fontWeight: "500" },

  // ── HEADER ──
  headerGrad: {
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 22,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
  },
  headerCountPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerCountTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerDelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,90,54,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,90,54,0.3)",
  },
  headerDelTxt: { fontSize: 12, fontWeight: "700", color: "#FFB3A3" },
  headerMoreBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // ── SELECT BAR ──
  selectBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: C.emerald,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  selectLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectTxt: { fontSize: 14, fontWeight: "700", color: C.text },
  selectedCountBadge: {
    backgroundColor: C.limeXLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectedCountTxt: { fontSize: 12, fontWeight: "700", color: C.emerald },

  // ── CHECKBOX ──
  cbWrap: { padding: 2 },
  cbGrad: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── ITEMS ──
  itemsWrap: { marginHorizontal: 16, gap: 12, marginBottom: 14 },

  // ── CARD ──
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardActive: {
    borderColor: C.lime,
    shadowColor: C.emerald,
    shadowOpacity: 0.15,
  },
  cardTopStrip: { height: 3 },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 10,
  },

  imgShell: {
    width: 82,
    height: 82,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.border,
  },
  imgShellActive: { borderColor: C.lime },
  productImg: { width: "100%", height: "100%", resizeMode: "cover" },
  imgFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: C.limeXLight,
    alignItems: "center",
    justifyContent: "center",
  },
  imgGloss: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "55%",
    height: "45%",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderBottomRightRadius: 18,
  },

  cardBody: { flex: 1, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  productName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    flex: 1,
    marginRight: 6,
    letterSpacing: -0.2,
  },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },

  pricePillRow: { marginBottom: 10 },
  pricePill: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pricePillText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.2,
  },
  pricePillUnit: { fontSize: 11, fontWeight: "400", opacity: 0.85 },

  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.limeXLight,
    borderRadius: 14,
    padding: 3,
    gap: 2,
  },
  qtyBtnCircle: {
    width: 30,
    height: 30,
    borderRadius: 11,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.emerald,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  qtyBtnOff: { opacity: 0.45, shadowOpacity: 0 },
  qtyValuePill: {
    width: 34,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValueText: { fontSize: 15, fontWeight: "900", color: C.text },
  subtotalBadge: {
    backgroundColor: C.limeXLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  subtotalText: { fontSize: 14, fontWeight: "900", color: C.price },
  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  stockText: { fontSize: 10, color: C.amber, fontWeight: "600" },

  // ── FREE SHIP ──
  freeShipCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  freeShipTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  freeShipIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.limeXLight,
    alignItems: "center",
    justifyContent: "center",
  },
  freeShipMsg: {
    fontSize: 13,
    color: C.text,
    flex: 1,
    lineHeight: 19,
    fontWeight: "500",
  },
  freeShipHL: { color: C.emerald, fontWeight: "900" },
  progressTrack: {
    height: 10,
    backgroundColor: "#E4EEE7",
    borderRadius: 5,
    marginBottom: 6,
    position: "relative",
    overflow: "visible",
  },
  progressFill: { height: "100%", borderRadius: 5 },
  progressDot: {
    position: "absolute",
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.emerald,
    borderWidth: 3,
    borderColor: C.white,
    marginLeft: -9,
    shadowColor: C.emerald,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 10, color: C.muted, fontWeight: "600" },

  freeShipWon: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    overflow: "hidden",
  },
  freeShipWonGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  freeShipWonTxt: { flex: 1, fontSize: 14, fontWeight: "800", color: "#fff" },
  freeShipCheck: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── SUMMARY ──
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.white,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 18,
    paddingBottom: 14,
  },
  summaryHeadIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryHeadTxt: { fontSize: 16, fontWeight: "800", color: C.text },
  dottedLine: {
    marginHorizontal: 18,
    marginBottom: 14,
    height: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderStyle: "dashed",
  },
  summaryRows: { paddingHorizontal: 18, paddingBottom: 14 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: { fontSize: 14, color: C.muted, fontWeight: "500" },
  summaryVal: { fontSize: 14, fontWeight: "700", color: C.text },
  freePill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  freePillTxt: {
    fontSize: 10,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 0.8,
  },
  totalBlock: { padding: 18 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  totalVAT: { fontSize: 11, color: C.muted, marginTop: 2 },
  totalVal: {
    fontSize: 28,
    fontWeight: "900",
    color: C.coral,
    letterSpacing: -1,
  },

  // ── BOTTOM BAR ──
  bottomBar: {
    height: 100,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(240,250,244,0.97)",
    borderTopWidth: 1,
    borderTopColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
  bottomHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#C8D8CC",
    alignSelf: "center",
    marginTop: 8,
  },
  bottomInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 18,
  },
  bottomInfo: { flex: 1 },
  bottomHint: {
    fontSize: 11,
    color: C.muted,
    marginBottom: 2,
    fontWeight: "500",
  },
  bottomTotal: {
    fontSize: 24,
    fontWeight: "900",
    color: C.text,
    letterSpacing: -0.8,
  },
  bottomPlaceholder: { fontSize: 13, color: C.muted, fontWeight: "500" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 22,
    paddingRight: 8,
    paddingVertical: 15,
    borderRadius: 20,
    shadowColor: C.emerald,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  checkoutTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  checkoutArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
});
