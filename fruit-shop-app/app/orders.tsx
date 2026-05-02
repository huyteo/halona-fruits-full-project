import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";

const { width } = Dimensions.get("window");

// ─── Design Tokens ──────────────────────────────────────────────────────────
const C = {
  emerald: "#00875A",
  emeraldDark: "#005C3B",
  lime: "#52C476",
  limeLight: "#D4F7E2",
  limeXLight: "#EDFBF3",
  coral: "#FF5A36",
  amber: "#FFB020",
  blue: "#1890ff",
  teal: "#13c2c2",
  bg: "#F0FAF4",
  white: "#FFFFFF",
  text: "#0D1F14",
  muted: "#88A899",
  border: "#C8E8D5",
  price: "#e04949",
};

// ─── Status Config ──────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  {
    color: string;
    bg: string;
    gradientColors: [string, string];
    icon: string;
    label: string;
  }
> = {
  pending: {
    color: "#fa8c16",
    bg: "#fff7e6",
    gradientColors: ["#fa8c16", "#ffc53d"],
    icon: "time-outline",
    label: "Chờ xác nhận",
  },
  confirmed: {
    color: "#1890ff",
    bg: "#e6f7ff",
    gradientColors: ["#1890ff", "#69c0ff"],
    icon: "checkmark-circle-outline",
    label: "Đã xác nhận",
  },
  shipping: {
    color: "#13c2c2",
    bg: "#e6fffb",
    gradientColors: ["#13c2c2", "#5cdbd3"],
    icon: "car-outline",
    label: "Đang giao hàng",
  },
  completed: {
    color: "#52c41a",
    bg: "#f6ffed",
    gradientColors: ["#52c41a", "#95de64"],
    icon: "happy-outline",
    label: "Hoàn thành",
  },
  cancelled: {
    color: "#ff4d4f",
    bg: "#fff2f0",
    gradientColors: ["#ff4d4f", "#ff7875"],
    icon: "close-circle-outline",
    label: "Đã hủy",
  },
};

const paymentLabels: Record<string, string> = {
  cod: "Thanh toán khi nhận hàng (COD)",
  banking: "Chuyển khoản ngân hàng",
};

const filterTabs = [
  { key: "all", label: "Tất cả", icon: "grid-outline" },
  { key: "pending", label: "Chờ xác nhận", icon: "time-outline" },
  { key: "confirmed", label: "Đã xác nhận", icon: "checkmark-circle-outline" },
  { key: "shipping", label: "Đang giao", icon: "car-outline" },
  { key: "completed", label: "Hoàn thành", icon: "happy-outline" },
  { key: "cancelled", label: "Đã hủy", icon: "close-circle-outline" },
];

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface OrderItem {
  id: number;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

interface Order {
  id: number;
  totalAmount: number;
  shippingAddress: string;
  shippingPhone: string;
  receiverName: string;
  status: string;
  paymentMethod: string;
  note: string;
  createdAt: string;
  items: OrderItem[];
}

// ─── Progress Steps Component ───────────────────────────────────────────────
function OrderSteps({ status }: { status: string }) {
  const steps = [
    { key: "pending", label: "Chờ\nxác nhận", icon: "time-outline" },
    {
      key: "confirmed",
      label: "Đã\nxác nhận",
      icon: "checkmark-circle-outline",
    },
    { key: "shipping", label: "Đang\ngiao", icon: "car-outline" },
    { key: "completed", label: "Hoàn\nthành", icon: "happy-outline" },
  ];

  const statusOrder = ["pending", "confirmed", "shipping", "completed"];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <View style={styles.stepsContainer}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} style={styles.stepWrapper}>
            <View style={styles.stepTop}>
              {/* Step circle */}
              {isCompleted ? (
                <LinearGradient
                  colors={["#1a7a3c", "#2ecc71"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.stepCircle,
                    isCurrent && styles.stepCircleCurrent,
                  ]}
                >
                  <Ionicons name={step.icon as any} size={14} color="#fff" />
                </LinearGradient>
              ) : (
                <View style={styles.stepCircleInactive}>
                  <Ionicons name={step.icon as any} size={14} color="#ccc" />
                </View>
              )}

              {/* Connector line */}
              {!isLast && (
                <View style={styles.stepLine}>
                  <View
                    style={[
                      styles.stepLineFill,
                      {
                        backgroundColor:
                          index < currentIndex ? C.emerald : "#e0e0e0",
                      },
                    ]}
                  />
                </View>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isCompleted && styles.stepLabelActive,
                isCurrent && styles.stepLabelCurrent,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Order Card Component ───────────────────────────────────────────────────
function OrderCard({ order, index }: { order: Order; index: number }) {
  const config = statusConfig[order.status] || statusConfig.pending;
  const enterAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 50,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: enterAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View style={styles.orderCard}>
        {/* Color strip top */}
        <LinearGradient
          colors={config.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardStrip}
        />

        {/* ── Header ── */}
        <TouchableOpacity
          style={[styles.cardHeader, { backgroundColor: config.bg }]}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <LinearGradient
              colors={config.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orderIconCircle}
            >
              <Ionicons name={config.icon as any} size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.orderId}>Đơn hàng #{order.id}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleString("vi-VN")}
              </Text>
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: config.color + "18" },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: config.color }]}
              />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={C.muted}
              style={{ marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>

        {/* ── Progress Steps (not for cancelled) ── */}
        {order.status !== "cancelled" && (
          <View style={styles.stepsWrapper}>
            <OrderSteps status={order.status} />
          </View>
        )}

        {/* ── Products List ── */}
        <View style={styles.productsList}>
          {order.items.map((item, idx) => (
            <View key={item.id}>
              <View style={styles.productRow}>
                <View style={styles.productLeft}>
                  <View style={styles.productDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.productName}
                    </Text>
                    <Text style={styles.productMeta}>
                      {Number(item.productPrice).toLocaleString("vi-VN")}đ ×{" "}
                      {item.quantity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productSubtotal}>
                  {Number(item.subtotal).toLocaleString("vi-VN")}đ
                </Text>
              </View>
              {idx < order.items.length - 1 && (
                <View style={styles.productDivider} />
              )}
            </View>
          ))}
        </View>

        {/* ── Expanded: Shipping Info ── */}
        {expanded && (
          <View style={styles.shippingInfo}>
            <View style={styles.shippingRow}>
              <Ionicons name="person-outline" size={14} color={C.muted} />
              <Text style={styles.shippingLabel}>Giao đến:</Text>
              <Text style={styles.shippingValue}>
                {order.receiverName} - {order.shippingPhone}
              </Text>
            </View>
            <View style={styles.shippingRow}>
              <Ionicons name="location-outline" size={14} color={C.muted} />
              <Text style={styles.shippingLabel}>Địa chỉ:</Text>
              <Text style={styles.shippingValue} numberOfLines={2}>
                {order.shippingAddress}
              </Text>
            </View>
            <View style={styles.shippingRow}>
              <Ionicons name="card-outline" size={14} color={C.muted} />
              <Text style={styles.shippingLabel}>Thanh toán:</Text>
              <Text style={styles.shippingValue}>
                {paymentLabels[order.paymentMethod] || order.paymentMethod}
              </Text>
            </View>
            {order.note ? (
              <View style={styles.shippingRow}>
                <Ionicons name="chatbubble-outline" size={14} color={C.muted} />
                <Text style={styles.shippingLabel}>Ghi chú:</Text>
                <Text style={[styles.shippingValue, { fontStyle: "italic" }]}>
                  {order.note}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Total Footer ── */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.itemCount}>
              {order.items.reduce((s, i) => s + i.quantity, 0)} sản phẩm
            </Text>
          </View>
          <Text style={styles.totalValue}>
            {Number(order.totalAmount).toLocaleString("vi-VN")}đ
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const headerO = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    fetchOrders();
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

  const fetchOrders = async () => {
    try {
      const response = await axiosClient.get("/orders/my-orders");
      setOrders(response.data);
    } catch (error) {
      console.error("Lỗi tải đơn hàng:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await axiosClient.get("/orders/my-orders");
      setOrders(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // ── LOADING ──
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.emerald} />
        <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  // ── EMPTY ──
  if (orders.length === 0) {
    return (
      <View style={styles.emptyRoot}>
        <LinearGradient
          colors={["#1a7a3c", "#2ecc71"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyGradBg}
        >
          <View
            style={[
              styles.decoBubble,
              { width: 200, height: 200, top: -50, right: -50, opacity: 0.12 },
            ]}
          />
          <View
            style={[
              styles.decoBubble,
              { width: 80, height: 80, bottom: 0, left: 20, opacity: 0.1 },
            ]}
          />

          {/* Back button */}
          <TouchableOpacity
            style={styles.emptyBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.emptyBody}>
          <View style={styles.emptyIconWrap}>
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIconGrad}
            >
              <Text style={{ fontSize: 54 }}>📋</Text>
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
          <Text style={styles.emptyDesc}>
            Bạn chưa đặt đơn hàng nào.{"\n"}Hãy khám phá sản phẩm tươi ngon nhé!
            🍃
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/products" as any)}
            activeOpacity={0.88}
            style={styles.emptyBtnWrap}
          >
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyBtn}
            >
              <Ionicons name="leaf-outline" size={18} color="#fff" />
              <Text style={styles.emptyBtnTxt}>Mua sắm ngay</Text>
              <View style={styles.emptyArrow}>
                <Ionicons name="arrow-forward" size={14} color={C.emerald} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── MAIN ──
  return (
    <View style={styles.root}>
      {/* ── Gradient Header ── */}
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Đơn hàng</Text>
              <Text style={styles.headerSubtitle}>của tôi</Text>
            </View>
          </View>
          <View style={styles.headerCountPill}>
            <Text style={styles.headerCountTxt}>{orders.length} đơn</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            const count =
              tab.key === "all"
                ? orders.length
                : orders.filter((o) => o.status === tab.key).length;

            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
                style={styles.filterChipWrap}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#1a7a3c", "#2ecc71"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.filterChipActive}
                  >
                    <Ionicons name={tab.icon as any} size={14} color="#fff" />
                    <Text style={styles.filterChipTextActive}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={styles.filterCountActive}>
                        <Text style={styles.filterCountTextActive}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                ) : (
                  <View style={styles.filterChip}>
                    <Ionicons
                      name={tab.icon as any}
                      size={14}
                      color={C.muted}
                    />
                    <Text style={styles.filterChipText}>{tab.label}</Text>
                    {count > 0 && (
                      <View style={styles.filterCount}>
                        <Text style={styles.filterCountText}>{count}</Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Orders List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.emerald}
            colors={[C.emerald]}
          />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.noResultContainer}>
            <View style={styles.noResultIcon}>
              <Ionicons name="search-outline" size={32} color={C.muted} />
            </View>
            <Text style={styles.noResultTitle}>Không có đơn hàng</Text>
            <Text style={styles.noResultDesc}>
              Không tìm thấy đơn hàng nào với trạng thái này
            </Text>
            <TouchableOpacity
              style={styles.noResultBtn}
              onPress={() => setFilter("all")}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={C.emerald} />
              <Text style={styles.noResultBtnText}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  decoBubble: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#fff",
  },

  // ── CENTER / LOADING ──
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: C.muted,
    fontWeight: "500",
  },

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
    marginTop: -2,
  },
  headerCountPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerCountTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── FILTER TABS ──
  filterContainer: {
    backgroundColor: C.white,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChipWrap: {},
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  filterChipActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    shadowColor: C.emerald,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.muted,
  },
  filterChipTextActive: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  filterCount: {
    backgroundColor: "#f0f0f0",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
  },
  filterCountActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountTextActive: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },

  // ── ORDERS LIST ──
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  ordersList: {
    gap: 16,
  },

  // ── ORDER CARD ──
  orderCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  cardStrip: {
    height: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },
  orderDate: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── STEPS ──
  stepsWrapper: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepWrapper: {
    flex: 1,
    alignItems: "center",
  },
  stepTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "center",
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepCircleCurrent: {
    shadowColor: C.emerald,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stepCircleInactive: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    zIndex: 1,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#e0e0e0",
    marginHorizontal: -2,
  },
  stepLineFill: {
    height: "100%",
  },
  stepLabel: {
    fontSize: 9,
    color: "#bbb",
    textAlign: "center",
    marginTop: 5,
    fontWeight: "500",
    lineHeight: 12,
  },
  stepLabelActive: {
    color: C.muted,
  },
  stepLabelCurrent: {
    color: C.emerald,
    fontWeight: "700",
  },

  // ── PRODUCTS ──
  productsList: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  productLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  productDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.emerald,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },
  productMeta: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  productSubtotal: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginLeft: 8,
  },
  productDivider: {
    height: 1,
    backgroundColor: "#f3f3f3",
    marginLeft: 18,
  },

  // ── SHIPPING INFO (expandable) ──
  shippingInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fafffe",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 8,
  },
  shippingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  shippingLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "500",
  },
  shippingValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: "600",
    flex: 1,
  },

  // ── FOOTER ──
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  totalLabel: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "500",
  },
  itemCount: {
    fontSize: 11,
    color: "#bbb",
    marginTop: 1,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: C.price,
    letterSpacing: -0.5,
  },

  // ── NO RESULT ──
  noResultContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  noResultIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.limeXLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  noResultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  noResultDesc: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
  },
  noResultBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: C.limeXLight,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
  },
  noResultBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.emerald,
  },

  // ── EMPTY STATE ──
  emptyRoot: { flex: 1, backgroundColor: C.bg },
  emptyGradBg: {
    height: 200,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  emptyBackBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 54 : 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  emptyBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 40,
    zIndex: 2,
  },
  emptyIconWrap: { marginBottom: 28 },
  emptyIconGrad: {
    width: 120,
    height: 120,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.emerald,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: C.text,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptyDesc: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 32,
  },
  emptyBtnWrap: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: C.emerald,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 28,
    paddingRight: 10,
    paddingVertical: 16,
  },
  emptyBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "800", flex: 1 },
  emptyArrow: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
});
