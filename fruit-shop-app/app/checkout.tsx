import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient, { API_URL } from "../api/axiosClient";
import Colors from "../constants/Colors";
import { useAuth } from "../contexts/useAuth";
import { useCart } from "../contexts/useCart";

const { width } = Dimensions.get("window");

interface CheckoutItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  thumbnail?: string;
  unit?: string;
}

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // ✅ Thêm params để kiểm tra buyNow flag
  const { user } = useAuth();
  const { removeFromCart } = useCart();

  // Form state
  const [receiverName, setReceiverName] = useState(user?.name || "");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [note, setNote] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Animations
  const successAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ✅ Load checkout items từ AsyncStorage
  useEffect(() => {
    loadCheckoutItems();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (orderSuccess) {
      Animated.spring(successAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [orderSuccess]);

  const loadCheckoutItems = async () => {
    try {
      const data = await AsyncStorage.getItem("checkoutItems");
      if (data) {
        const parsed = JSON.parse(data);
        setItems(parsed);
      }
    } catch (e) {
      console.error("Lỗi đọc checkoutItems:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!receiverName.trim())
      newErrors.receiverName = "Vui lòng nhập tên người nhận";
    if (!shippingPhone.trim())
      newErrors.shippingPhone = "Vui lòng nhập số điện thoại";
    else if (!/^(0[3-9])\d{8}$/.test(shippingPhone.trim()))
      newErrors.shippingPhone = "Số điện thoại không hợp lệ";
    if (!shippingAddress.trim())
      newErrors.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const orderData = {
        receiverName: receiverName.trim(),
        shippingPhone: shippingPhone.trim(),
        shippingAddress: shippingAddress.trim(),
        paymentMethod,
        note: note.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const response = await axiosClient.post("/orders", orderData);
      setOrderId(response.data.id);
      setOrderSuccess(true);

      // ✅ FIX: Xử lý khác nhau giữa "Mua ngay" vs "Thanh toán từ giỏ hàng"
      if (params.buyNow === "true") {
        // Chỉ xóa checkoutItems, GIỮ NGUYÊN cart
        await AsyncStorage.removeItem("checkoutItems");
      } else {
        // Xóa items khỏi cart VÀ checkoutItems (flow thanh toán từ giỏ hàng)
        items.forEach((item) => removeFromCart(item.productId));
        await AsyncStorage.removeItem("checkoutItems");
      }
    } catch (error: any) {
      Alert.alert(
        "Đặt hàng thất bại",
        error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================== LOADING ====================
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ==================== SUCCESS SCREEN ====================
  if (orderSuccess) {
    const scaleAnim = successAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successContent,
            { transform: [{ scale: scaleAnim }], opacity: successAnim },
          ]}
        >
          <View style={styles.successIconWrapper}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
          </View>

          <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
          <Text style={styles.successSubtitle}>
            Mã đơn hàng: <Text style={styles.successOrderId}>#{orderId}</Text>
          </Text>
          <Text style={styles.successDesc}>
            Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm nhất. Cảm ơn bạn đã mua
            sắm tại Halona Fruits! 🍒
          </Text>

          <TouchableOpacity
            style={styles.successBtnPrimary}
            onPress={() => router.replace("/orders" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt-outline" size={20} color="#fff" />
            <Text style={styles.successBtnPrimaryText}>Xem đơn hàng</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.successBtnSecondary}
            onPress={() => router.replace("/(tabs)" as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="home-outline" size={20} color={Colors.primary} />
            <Text style={styles.successBtnSecondaryText}>Về trang chủ</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ==================== EMPTY CART ====================
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="cart-outline" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>Chưa có sản phẩm</Text>
        <Text style={styles.emptyDesc}>
          Giỏ hàng trống, hãy thêm sản phẩm trước khi đặt hàng.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ==================== CHECKOUT FORM ====================
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* ====== SHIPPING INFO SECTION ====== */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="location" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
              </View>

              <View style={styles.card}>
                {/* Tên người nhận */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Tên người nhận <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.receiverName && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color="#aaa"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={receiverName}
                      onChangeText={(text) => {
                        setReceiverName(text);
                        if (errors.receiverName)
                          setErrors((e) => ({ ...e, receiverName: "" }));
                      }}
                      placeholder="Nhập tên người nhận"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                  {errors.receiverName ? (
                    <Text style={styles.errorText}>{errors.receiverName}</Text>
                  ) : null}
                </View>

                {/* Số điện thoại */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Số điện thoại <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.shippingPhone && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#aaa"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={shippingPhone}
                      onChangeText={(text) => {
                        setShippingPhone(text);
                        if (errors.shippingPhone)
                          setErrors((e) => ({ ...e, shippingPhone: "" }));
                      }}
                      placeholder="0901234567"
                      placeholderTextColor="#bbb"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  {errors.shippingPhone ? (
                    <Text style={styles.errorText}>{errors.shippingPhone}</Text>
                  ) : null}
                </View>

                {/* Địa chỉ */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Địa chỉ giao hàng <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.inputWrapperMultiline,
                      errors.shippingAddress && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name="map-outline"
                      size={18}
                      color="#aaa"
                      style={[styles.inputIcon, { marginTop: 14 }]}
                    />
                    <TextInput
                      style={styles.inputMultiline}
                      value={shippingAddress}
                      onChangeText={(text) => {
                        setShippingAddress(text);
                        if (errors.shippingAddress)
                          setErrors((e) => ({ ...e, shippingAddress: "" }));
                      }}
                      placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                      placeholderTextColor="#bbb"
                      multiline
                      numberOfLines={2}
                      textAlignVertical="top"
                    />
                  </View>
                  {errors.shippingAddress ? (
                    <Text style={styles.errorText}>
                      {errors.shippingAddress}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>

            {/* ====== PAYMENT METHOD SECTION ====== */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="wallet" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
              </View>

              <View style={styles.card}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "cod" && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMethod("cod")}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      paymentMethod === "cod" && styles.radioOuterActive,
                    ]}
                  >
                    {paymentMethod === "cod" && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.paymentIconBox,
                      paymentMethod === "cod" && styles.paymentIconBoxActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="cash-multiple"
                      size={22}
                      color={paymentMethod === "cod" ? Colors.primary : "#888"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.paymentLabel,
                        paymentMethod === "cod" && styles.paymentLabelActive,
                      ]}
                    >
                      Thanh toán khi nhận hàng
                    </Text>
                    <Text style={styles.paymentDesc}>
                      Thanh toán bằng tiền mặt (COD)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    paymentMethod === "banking" && styles.paymentOptionActive,
                  ]}
                  onPress={() => setPaymentMethod("banking")}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      paymentMethod === "banking" && styles.radioOuterActive,
                    ]}
                  >
                    {paymentMethod === "banking" && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View
                    style={[
                      styles.paymentIconBox,
                      paymentMethod === "banking" &&
                        styles.paymentIconBoxActive,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="bank-transfer"
                      size={22}
                      color={
                        paymentMethod === "banking" ? Colors.primary : "#888"
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.paymentLabel,
                        paymentMethod === "banking" &&
                          styles.paymentLabelActive,
                      ]}
                    >
                      Chuyển khoản ngân hàng
                    </Text>
                    <Text style={styles.paymentDesc}>
                      Chuyển khoản qua tài khoản ngân hàng
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* ====== NOTE SECTION ====== */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <Text style={styles.sectionTitle}>Ghi chú</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.inputWrapperMultiline}>
                  <Feather
                    name="edit-3"
                    size={16}
                    color="#aaa"
                    style={[styles.inputIcon, { marginTop: 14 }]}
                  />
                  <TextInput
                    style={styles.inputMultiline}
                    value={note}
                    onChangeText={setNote}
                    placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
                    placeholderTextColor="#bbb"
                    multiline
                    numberOfLines={2}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            {/* ====== ORDER SUMMARY SECTION ====== */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrapper}>
                  <Ionicons name="receipt" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Đơn hàng của bạn</Text>
                <View style={styles.itemCountBadge}>
                  <Text style={styles.itemCountText}>
                    {items.length} sản phẩm
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                {items.map((item, index) => (
                  <View key={item.productId}>
                    <View style={styles.orderItem}>
                      {item.thumbnail ? (
                        <Image
                          source={{ uri: `${API_URL}${item.thumbnail}` }}
                          style={styles.orderItemImage}
                        />
                      ) : (
                        <View style={styles.orderItemImagePlaceholder}>
                          <Text style={{ fontSize: 24 }}>🍊</Text>
                        </View>
                      )}
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.orderItemQty}>
                          {Number(item.price).toLocaleString("vi-VN")}đ ×{" "}
                          {item.quantity}
                          {item.unit ? ` ${item.unit}` : ""}
                        </Text>
                      </View>
                      <Text style={styles.orderItemTotal}>
                        {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                      </Text>
                    </View>
                    {index < items.length - 1 && (
                      <View style={styles.itemDivider} />
                    )}
                  </View>
                ))}

                {/* Summary */}
                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tạm tính</Text>
                  <Text style={styles.summaryValue}>
                    {totalAmount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Phí giao hàng</Text>
                  <View style={styles.freeShipBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={Colors.success}
                    />
                    <Text style={styles.freeShipText}>Miễn phí</Text>
                  </View>
                </View>

                <View style={styles.totalDivider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Tổng cộng</Text>
                  <Text style={styles.totalValue}>
                    {totalAmount.toLocaleString("vi-VN")}đ
                  </Text>
                </View>
              </View>
            </View>

            {/* Spacer for bottom button */}
            <View style={{ height: 100 }} />
          </Animated.View>
        </ScrollView>

        {/* ====== BOTTOM BAR ====== */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomTotalLabel}>Tổng cộng</Text>
            <Text style={styles.bottomTotalValue}>
              {totalAmount.toLocaleString("vi-VN")}đ
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Đặt hàng</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f7f9",
  },

  // ====== LOADING ======
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f6f7f9",
  },

  // ====== HEADER ======
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },

  // ====== SCROLL ======
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },

  // ====== SECTION ======
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    flex: 1,
  },

  // ====== CARD ======
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  // ====== INPUT ======
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  required: {
    color: Colors.error,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    paddingHorizontal: 12,
  },
  inputWrapperMultiline: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    paddingHorizontal: 12,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: "#fff5f5",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
  },
  inputMultiline: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 14,
    minHeight: 60,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginLeft: 4,
  },

  // ====== PAYMENT ======
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
    backgroundColor: "#f8f9fa",
    marginBottom: 10,
  },
  paymentOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "#f0faf2",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  radioOuterActive: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  paymentIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  paymentIconBoxActive: {
    backgroundColor: "#e0f2e4",
  },
  paymentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  paymentLabelActive: {
    color: Colors.primaryDark,
  },
  paymentDesc: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },

  // ====== ORDER ITEMS ======
  itemCountBadge: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  orderItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
  },
  orderItemImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#f0faf2",
    alignItems: "center",
    justifyContent: "center",
  },
  orderItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    lineHeight: 20,
  },
  orderItemQty: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  orderItemTotal: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.price,
    marginLeft: 8,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#f3f3f3",
  },

  // ====== SUMMARY ======
  summaryDivider: {
    height: 1,
    backgroundColor: "#e8e8e8",
    marginVertical: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#888",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  freeShipBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  freeShipText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.success,
  },
  totalDivider: {
    height: 1.5,
    backgroundColor: Colors.primary,
    opacity: 0.2,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.price,
  },

  // ====== BOTTOM BAR ======
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 12,
    color: "#999",
  },
  bottomTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.price,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  // ====== SUCCESS ======
  successContainer: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successContent: {
    alignItems: "center",
  },
  successIconWrapper: {
    marginBottom: 24,
  },
  successIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  successOrderId: {
    fontWeight: "700",
    color: Colors.primary,
  },
  successDesc: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  successBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    width: "100%",
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  successBtnPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  successBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0faf2",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    gap: 8,
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  successBtnSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
  },

  // ====== EMPTY ======
  emptyContainer: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e8f5e9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
