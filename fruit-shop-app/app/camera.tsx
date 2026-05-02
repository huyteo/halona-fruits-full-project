import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import axiosClient from "../api/axiosClient";
import Colors from "../constants/Colors";

const { width } = Dimensions.get("window");

interface TopResult {
  name_vi: string;
  name_en: string;
  confidence: number;
}

interface PredictResult {
  success: boolean;
  fruit: string | null;
  fruit_en: string | null;
  confidence: number;
  is_fruit: boolean;
  message: string;
  top3: TopResult[];
}

// Emoji theo tên trái cây
const FRUIT_EMOJI: Record<string, string> = {
  Táo: "🍎",
  Chuối: "🍌",
  Nho: "🍇",
  Kiwi: "🥝",
  Xoài: "🥭",
  Cam: "🍊",
  "Đu đủ": "🫒",
  Lê: "🍐",
  Dứa: "🍍",
  Lựu: "🫐",
  "Dưa hấu": "🍉",
};

export default function CameraScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Animations
  const resultAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation cho loading
  useEffect(() => {
    if (loading) {
      // Scan line animation
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      scanLoop.start();

      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.start();
      return () => {
        scanLoop.stop();
        pulseLoop.stop();
      };
    }
  }, [loading]);

  // Result slide-up animation
  useEffect(() => {
    if (result && !loading) {
      resultAnim.setValue(0);
      Animated.spring(resultAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [result, loading]);

  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Thông báo", "Cần quyền truy cập camera");
        return;
      }
    }
    const pickerResult = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });

    if (!pickerResult.canceled) {
      const uri = pickerResult.assets[0].uri;
      setImageUri(uri);
      setResult(null);
      await recognize(uri);
    }
  };

  const recognize = async (uri: string) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: "fruit.jpg",
        type: "image/jpeg",
      } as any);

      const { data } = await axiosClient.post(
        "/image-recognition/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data);
    } catch {
      Alert.alert("Lỗi", "Không thể nhận diện. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const emoji = result?.fruit ? FRUIT_EMOJI[result.fruit] || "🍎" : "🍎";

  const scanTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <LinearGradient
        colors={["#1a7a3c", "#2ecc71"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Nhận diện trái cây</Text>
          <Text style={styles.headerSub}>AI-Powered Recognition</Text>
        </View>
        <View style={styles.headerBadge}>
          <Ionicons name="leaf" size={16} color="#fff" />
          <Text style={styles.headerBadgeText}>AI</Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Tip ── */}
        <View style={styles.tipCard}>
          <LinearGradient
            colors={["#e8f5e9", "#f1f8e9"]}
            style={styles.tipGradient}
          >
            <View style={styles.tipIconBox}>
              <Ionicons name="scan-outline" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.tipText}>
              Chụp hoặc chọn ảnh trái cây để AI nhận diện tên và độ chính xác
            </Text>
          </LinearGradient>
        </View>

        {/* ── Image Preview ── */}
        <Animated.View
          style={[
            styles.imageCard,
            loading && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          {/* Corner decorations */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <View style={styles.placeholderCircle}>
                <Ionicons name="camera-outline" size={48} color="#ccc" />
              </View>
              <Text style={styles.placeholderTitle}>Chưa có ảnh</Text>
              <Text style={styles.placeholderSub}>
                Chụp hoặc chọn từ thư viện
              </Text>
            </View>
          )}

          {/* Scan line animation */}
          {loading && (
            <View style={styles.scanOverlay}>
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanTranslateY }] },
                ]}
              />
              <View style={styles.scanCenter}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.scanText}>Đang phân tích...</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* ── Action Buttons ── */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={styles.btnCamera}
            onPress={() => pickImage(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnGradient}
            >
              <Ionicons name="camera" size={22} color="#fff" />
              <Text style={styles.btnCameraText}>Chụp ảnh</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnGallery}
            onPress={() => pickImage(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={22} color={Colors.primary} />
            <Text style={styles.btnGalleryText}>Thư viện</Text>
          </TouchableOpacity>
        </View>

        {/* ── Result ── */}
        {result && !loading && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                opacity: resultAnim,
                transform: [
                  {
                    translateY: resultAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {result.is_fruit ? (
              <>
                {/* Main result */}
                <LinearGradient
                  colors={["#e8f5e9", "#f1f8e9"]}
                  style={styles.resultMainBox}
                >
                  <Text style={styles.resultEmoji}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fruitName}>{result.fruit}</Text>
                    <Text style={styles.fruitEn}>{result.fruit_en}</Text>
                  </View>
                  <View style={styles.confidenceCircle}>
                    <Text style={styles.confidenceNum}>
                      {result.confidence.toFixed(0)}
                    </Text>
                    <Text style={styles.confidencePercent}>%</Text>
                  </View>
                </LinearGradient>

                {/* Status */}
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.statusText}>Nhận diện thành công</Text>
                  </View>
                  <View style={styles.statusItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text style={styles.statusText}>Độ chính xác cao</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Top 3 */}
                <Text style={styles.top3Label}>Kết quả khác có thể</Text>
                {result.top3.slice(1).map((item, i) => {
                  const itemEmoji = FRUIT_EMOJI[item.name_vi] || "🍎";
                  return (
                    <View key={i} style={styles.top3Row}>
                      <Text style={styles.top3Emoji}>{itemEmoji}</Text>
                      <Text style={styles.top3Name}>{item.name_vi}</Text>
                      <View style={styles.bar}>
                        <LinearGradient
                          colors={["#1a7a3c", "#2ecc71"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.barFill,
                            {
                              width: `${Math.max(item.confidence, 2)}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.top3Conf}>
                        {item.confidence.toFixed(1)}%
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <View style={styles.notFound}>
                <View style={styles.notFoundIcon}>
                  <Ionicons name="close-circle" size={48} color="#ff4d4f" />
                </View>
                <Text style={styles.notFoundTitle}>Không nhận diện được</Text>
                <Text style={styles.notFoundText}>{result.message}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    setResult(null);
                    setImageUri(null);
                  }}
                >
                  <Ionicons name="refresh" size={18} color={Colors.primary} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { paddingBottom: 20 },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  headerBadgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  // ── Tip ──
  tipCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
  },
  tipGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tipIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,166,62,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  tipText: { flex: 1, fontSize: 13, color: "#444", lineHeight: 19 },

  // ── Image Card ──
  imageCard: {
    marginHorizontal: 16,
    marginTop: 16,
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  image: { width: "100%", height: "100%", resizeMode: "contain" },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  placeholderCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e8e8e8",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderTitle: { fontSize: 16, fontWeight: "600", color: "#bbb" },
  placeholderSub: { fontSize: 12, color: "#ccc" },

  // Corner decorations
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    zIndex: 10,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },

  // Scan animation
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  scanLine: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: "#2ecc71",
    shadowColor: "#2ecc71",
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  scanText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Buttons ──
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  btnCamera: { flex: 1, borderRadius: 14, overflow: "hidden" },
  btnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  btnCameraText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnGallery: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  btnGalleryText: { color: Colors.primary, fontWeight: "700", fontSize: 16 },

  // ── Result Card ──
  resultCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  resultMainBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  resultEmoji: { fontSize: 48 },
  fruitName: { fontSize: 24, fontWeight: "800", color: "#1a1a1a" },
  fruitEn: { fontSize: 13, color: "#888", marginTop: 2, fontStyle: "italic" },
  confidenceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confidenceNum: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    marginTop: 2,
  },
  confidencePercent: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    marginTop: -2,
  },

  // Status
  statusRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 14,
    paddingHorizontal: 4,
  },
  statusItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 12, color: "#666" },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 14,
    marginHorizontal: 4,
  },

  // Top 3
  top3Label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  top3Row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  top3Emoji: { fontSize: 20 },
  top3Name: { width: 80, fontSize: 13, fontWeight: "500", color: "#555" },
  bar: {
    flex: 1,
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 4 },
  top3Conf: {
    width: 46,
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
    textAlign: "right",
  },

  // Not found
  notFound: { alignItems: "center", padding: 24, gap: 10 },
  notFoundIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff2f0",
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  notFoundText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  retryText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
});
