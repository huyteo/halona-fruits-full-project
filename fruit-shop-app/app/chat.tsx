import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../contexts/useAuth";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  image?: string;
  createdAt?: string;
}

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null); // ✅ THÊM
  const flatListRef = useRef<FlatList>(null);

  // Animation values
  const typingAnim = useRef(new Animated.Value(0)).current;
  const attachMenuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadHistory();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (loading) {
      startTypingAnimation();
    }
  }, [loading]);

  const requestPermissions = async () => {
    const { status: cameraStatus } =
      await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== "granted" || galleryStatus !== "granted") {
      Alert.alert(
        "Cần quyền truy cập",
        "Vui lòng cấp quyền camera và thư viện ảnh",
      );
    }
  };

  const startTypingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(typingAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(typingAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const toggleAttachMenu = () => {
    setShowAttachMenu(!showAttachMenu);
    Animated.spring(attachMenuAnim, {
      toValue: showAttachMenu ? 0 : 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setShowAttachMenu(false);
        await uploadAndSendImage(asset.uri);
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setShowAttachMenu(false);
        await uploadAndSendImage(asset.uri);
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const uploadAndSendImage = async (uri: string) => {
    const tempId = Date.now();
    const userMsg: Message = {
      role: "user",
      content: "📷 Đang tải ảnh lên...",
      image: uri,
      id: tempId,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const formData = new FormData();
      formData.append("file", {
        uri: uri,
        type: "image/jpeg",
        name: `chat-image-${Date.now()}.jpg`,
      } as any);

      const uploadRes = await axiosClient.post("/upload/single", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000,
      });

      const imageUrl = uploadRes.data.url;
      const fullImageUrl = `http://192.168.100.31:3000${imageUrl}`;

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId
            ? {
                ...msg,
                image: fullImageUrl,
                content: "📷 Đã gửi ảnh",
              }
            : msg,
        ),
      );

      const res = await axiosClient.post("/chat/message", {
        message: "Tôi gửi ảnh này, bạn có thể xem và tư vấn cho tôi không?",
        imageUrl: imageUrl,
      });

      const aiMsg: Message = {
        role: "assistant",
        content: res.data.aiResponse,
        id: Date.now() + 1,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.error("❌ Upload error:", err);
      const error = err as any;
      console.error("Error details:", error.response?.data || error.message);

      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));

      const errorMsg: Message = {
        role: "assistant",
        content: "⚠️ Xin lỗi, không thể gửi ảnh. Vui lòng thử lại.",
        id: Date.now() + 1,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await axiosClient.get("/chat/history");
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      role: "user",
      content: input,
      id: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    let retries = 2;
    while (retries > 0) {
      try {
        const res = await axiosClient.post("/chat/message", { message: input });

        const aiMsg: Message = {
          role: "assistant",
          content: res.data.aiResponse,
          id: Date.now() + 1,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        break;
      } catch (err) {
        retries--;
        console.error(`Lỗi (còn ${retries} lần thử):`, err);

        if (retries === 0) {
          const errorMsg: Message = {
            role: "assistant",
            content: "⚠️ Xin lỗi, tôi gặp sự cố. Vui lòng thử lại.",
            id: Date.now() + 1,
          };
          setMessages((prev) => [...prev, errorMsg]);
        } else {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    setLoading(false);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === "user";
    const showAvatar = !isUser;
    const showTime =
      index === messages.length - 1 || messages[index + 1]?.role !== item.role;

    return (
      <View
        style={[styles.messageContainer, isUser && styles.userMessageContainer]}
      >
        {showAvatar && (
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={["#1a7a3c", "#2ecc71"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarEmoji}>🤖</Text>
            </LinearGradient>
          </View>
        )}

        <View style={styles.messageBubbleContainer}>
          {isUser ? (
            <View style={styles.userMessageWrapper}>
              {item.image && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setViewingImage(item.image!)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.messageImageUser}
                    resizeMode="cover"
                    onError={(e) =>
                      console.error("❌ Error:", e.nativeEvent.error)
                    }
                  />
                </TouchableOpacity>
              )}
              {item.content && (
                <LinearGradient
                  colors={["#1a7a3c", "#2ecc71"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.messageBubble, styles.userBubble]}
                >
                  <Text style={styles.userText}>{item.content}</Text>
                </LinearGradient>
              )}
            </View>
          ) : (
            <View style={[styles.messageBubble, styles.aiBubble]}>
              {item.image && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setViewingImage(item.image!)}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.messageImageAI}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.aiText}>{item.content}</Text>
            </View>
          )}

          {showTime && (
            <Text style={[styles.timestamp, isUser && styles.timestampRight]}>
              {formatTime(item.createdAt) || "Vừa xong"}
            </Text>
          )}
        </View>

        {isUser && <View style={styles.avatarSpacer} />}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={["#1a7a3c", "#2ecc71"]}
          style={styles.emptyIconGradient}
        >
          <Ionicons name="chatbubbles" size={40} color="white" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>Xin chào! 👋</Text>
      <Text style={styles.emptySubtitle}>
        Tôi là trợ lý ảo của Halona Fruits.{"\n"}
        Hãy hỏi tôi về trái cây nhé!
      </Text>
      <View style={styles.suggestionContainer}>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput("Trái cây nào giàu vitamin C?")}
        >
          <Text style={styles.suggestionText}>🍊 Giàu vitamin C</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput("Giá táo bao nhiêu?")}
        >
          <Text style={styles.suggestionText}>💰 Giá cả</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionChip}
          onPress={() => setInput("Làm sao để đặt hàng?")}
        >
          <Text style={styles.suggestionText}>🛒 Đặt hàng</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTypingIndicator = () => {
    if (!loading) return null;

    const dot1Scale = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1.3, 1],
    });
    const dot2Scale = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1, 1.3],
    });
    const dot3Scale = typingAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1.3, 1, 1],
    });

    return (
      <View style={styles.typingContainer}>
        <View style={styles.avatarContainer}>
          <LinearGradient colors={["#1a7a3c", "#2ecc71"]} style={styles.avatar}>
            <Text style={styles.avatarEmoji}>🤖</Text>
          </LinearGradient>
        </View>
        <View style={styles.typingBubble}>
          <Animated.View
            style={[styles.typingDot, { transform: [{ scale: dot1Scale }] }]}
          />
          <Animated.View
            style={[styles.typingDot, { transform: [{ scale: dot2Scale }] }]}
          />
          <Animated.View
            style={[styles.typingDot, { transform: [{ scale: dot3Scale }] }]}
          />
        </View>
      </View>
    );
  };

  const renderAttachMenu = () => {
    if (!showAttachMenu) return null;

    const translateY = attachMenuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [100, 0],
    });

    const opacity = attachMenuAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <Modal
        transparent
        visible={showAttachMenu}
        animationType="fade"
        onRequestClose={() => setShowAttachMenu(false)}
      >
        <TouchableOpacity
          style={styles.attachMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowAttachMenu(false)}
        >
          <Animated.View
            style={[
              styles.attachMenuContainer,
              { opacity, transform: [{ translateY }] },
            ]}
          >
            <TouchableOpacity
              style={styles.attachMenuItem}
              onPress={pickImageFromGallery}
            >
              <View
                style={[styles.attachMenuIcon, { backgroundColor: "#8b5cf6" }]}
              >
                <Ionicons name="images" size={24} color="white" />
              </View>
              <Text style={styles.attachMenuText}>Thư viện ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachMenuItem} onPress={takePhoto}>
              <View
                style={[styles.attachMenuIcon, { backgroundColor: "#3b82f6" }]}
              >
                <Ionicons name="camera" size={24} color="white" />
              </View>
              <Text style={styles.attachMenuText}>Chụp ảnh</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ✅ THÊM: Image Viewer Modal
  const renderImageViewer = () => {
    if (!viewingImage) return null;

    return (
      <Modal
        visible={!!viewingImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.imageViewerClose}
            onPress={() => setViewingImage(null)}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          <Image
            source={{ uri: viewingImage }}
            style={styles.imageViewerImage}
            resizeMode="contain"
          />

          <View style={styles.imageViewerHint}>
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={styles.imageViewerHintText}>Nhấn giữ để lưu ảnh</Text>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#1a7a3c", "#2ecc71"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIcon}>🍒</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Chat Tư Vấn</Text>
              <Text style={styles.headerSubtitle}>Halona Fruits Assistant</Text>
            </View>
          </View>
          <View style={styles.onlineIndicator}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderTypingIndicator}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={20}
        windowSize={10}
      />

      {renderAttachMenu()}
      {renderImageViewer()}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={toggleAttachMenu}
            >
              <Ionicons name="add-circle-outline" size={28} color="#6b7280" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={styles.sendButton}
            >
              <LinearGradient
                colors={
                  input.trim() && !loading
                    ? ["#1a7a3c", "#2ecc71"]
                    : ["#e5e7eb", "#d1d5db"]
                }
                style={styles.sendGradient}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={input.trim() && !loading ? "white" : "#9ca3af"}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
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
  headerIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  onlineIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4ade80",
  },
  onlineText: {
    fontSize: 11,
    color: "white",
    fontWeight: "600",
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  userMessageContainer: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarEmoji: {
    fontSize: 18,
  },
  avatarSpacer: {
    width: 44,
  },
  messageBubbleContainer: {
    alignSelf: "flex-start",
    maxWidth: "75%",
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  messageImageUser: {
    width: 220,
    height: undefined,
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 6,
    alignSelf: "flex-end",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    backgroundColor: "#f0f0f0",
  },
  messageImageAI: {
    width: 220,
    height: undefined,
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: "flex-start",
    backgroundColor: "#f0f0f0",
  },
  userMessageWrapper: {
    alignSelf: "flex-end",
    maxWidth: "100%",
  },
  userBubble: {
    borderBottomRightRadius: 4,
    shadowColor: "#1a7a3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: "flex-end",
    padding: 0,
  },
  aiBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignSelf: "flex-start",
  },
  userText: {
    color: "white",
    fontSize: 15,
    lineHeight: 20,
    padding: 12,
  },
  aiText: {
    color: "#1f2937",
    fontSize: 15,
    lineHeight: 22,
  },
  messageImage: {
    width: 250,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  timestamp: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    marginLeft: 8,
  },
  timestampRight: {
    textAlign: "right",
    marginLeft: 0,
    marginRight: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1a7a3c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  suggestionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  suggestionChip: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 13,
    color: "#1a7a3c",
    fontWeight: "600",
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1d5db",
  },
  inputWrapper: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attachButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
    maxHeight: 100,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    marginBottom: 2,
  },
  sendGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  attachMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  attachMenuContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  attachMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 16,
  },
  attachMenuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  attachMenuText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  // ✅ THÊM: Image Viewer Styles
  imageViewerContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "100%",
  },
  imageViewerHint: {
    position: "absolute",
    bottom: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  imageViewerHintText: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },
});
