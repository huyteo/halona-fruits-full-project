import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
import axiosClient, { API_URL } from "../../api/axiosClient";
import Colors from "../../constants/Colors";
import { useAuth } from "../../contexts/useAuth";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatar: string;
  role: string;
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Inline editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const res = await axiosClient.get(`/users/${user?.id}`);
      const data = res.data;
      setProfile(data);
      setEditName(data.name || "");
      setEditPhone(data.phone || "");
      setEditAddress(data.address || "");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: string) => {
    if (!profile) return;
    const valueMap: Record<string, string> = {
      name: editName.trim(),
      phone: editPhone.trim(),
      address: editAddress.trim(),
    };
    const value = valueMap[field];
    if (!value) {
      Alert.alert("Lỗi", "Vui lòng nhập giá trị");
      return;
    }

    setSaving(true);
    try {
      await axiosClient.put(`/users/${profile.id}`, { [field]: value });
      setProfile({ ...profile, [field]: value });
      setEditingField(null);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật thông tin");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = (field: string) => {
    if (field === "name") setEditName(profile?.name || "");
    if (field === "phone") setEditPhone(profile?.phone || "");
    if (field === "address") setEditAddress(profile?.address || "");
    setEditingField(null);
  };

  // ====== AVATAR UPLOAD ======
  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Vui lòng cho phép truy cập thư viện ảnh trong Cài đặt.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Vui lòng cho phép truy cập camera trong Cài đặt.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!profile) return;
    setUploadingAvatar(true);

    try {
      // Tạo FormData để upload file
      const formData = new FormData();
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append("file", {
        uri,
        name: filename,
        type,
      } as any);

      // Upload ảnh lên server (giống web: POST /upload/single)
      const uploadRes = await axiosClient.post("/upload/single", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const avatarPath = uploadRes.data.url;

      // Cập nhật avatar cho user
      await axiosClient.put(`/users/${profile.id}`, { avatar: avatarPath });

      setProfile({ ...profile, avatar: avatarPath });
      Alert.alert("Thành công", "Đã cập nhật ảnh đại diện!");
    } catch (error: any) {
      console.error("Upload avatar error:", error);
      Alert.alert("Lỗi", "Không thể cập nhật ảnh đại diện. Vui lòng thử lại.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const showAvatarOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Hủy", "Chụp ảnh mới", "Chọn từ thư viện"],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) takePhoto();
          if (buttonIndex === 2) pickImageFromLibrary();
        },
      );
    } else {
      Alert.alert("Đổi ảnh đại diện", "Chọn nguồn ảnh", [
        { text: "Hủy", style: "cancel" },
        { text: "Chụp ảnh mới", onPress: takePhoto },
        { text: "Chọn từ thư viện", onPress: pickImageFromLibrary },
      ]);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  // ====== NOT LOGGED IN ======
  if (!isAuthenticated) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.guestIconWrap}>
          <Ionicons name="person-outline" size={48} color="#ccc" />
        </View>
        <Text style={styles.guestTitle}>Chào bạn!</Text>
        <Text style={styles.guestText}>
          Đăng nhập để quản lý tài khoản, theo dõi đơn hàng và nhận ưu đãi
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => router.push("/auth/login")}
          activeOpacity={0.8}
        >
          <Ionicons name="log-in-outline" size={18} color="#fff" />
          <Text style={styles.loginBtnText}>Đăng nhập</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/auth/register")}
          style={{ marginTop: 14 }}
        >
          <Text style={styles.registerLink}>
            Chưa có tài khoản?{" "}
            <Text style={{ color: Colors.primary, fontWeight: "700" }}>
              Đăng ký
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ====== INLINE EDIT ROW ======
  const renderEditableRow = (
    field: string,
    icon: string,
    iconColor: string,
    iconBg: string,
    label: string,
    value: string,
    editValue: string,
    setEditValue: (v: string) => void,
    options?: { keyboard?: "default" | "phone-pad"; multiline?: boolean },
  ) => {
    const isEditing = editingField === field;

    return (
      <View style={styles.infoRow}>
        <View style={[styles.infoIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          {isEditing ? (
            <View style={styles.inlineEditWrap}>
              <TextInput
                style={[
                  styles.inlineInput,
                  options?.multiline && {
                    minHeight: 60,
                    textAlignVertical: "top",
                  },
                ]}
                value={editValue}
                onChangeText={setEditValue}
                autoFocus
                multiline={options?.multiline}
                keyboardType={options?.keyboard || "default"}
                placeholder={`Nhập ${label.toLowerCase()}...`}
                placeholderTextColor="#ccc"
              />
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  style={styles.inlineCancelBtn}
                  onPress={() => handleCancelEdit(field)}
                >
                  <Ionicons name="close" size={16} color="#999" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inlineSaveBtn, saving && { opacity: 0.6 }]}
                  onPress={() => handleSaveField(field)}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Text
              style={[styles.infoValue, !value && styles.infoPlaceholder]}
              numberOfLines={2}
            >
              {value || "Chưa cập nhật"}
            </Text>
          )}
        </View>
        {!isEditing && (
          <TouchableOpacity
            style={styles.editIconBtn}
            onPress={() => setEditingField(field)}
          >
            <Ionicons name="create-outline" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* ====== HEADER ====== */}
          <LinearGradient
            colors={["#1a7a3c", "#2ecc71"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerBg}
          >
            <View
              style={[
                styles.decoBubble,
                {
                  width: 260,
                  height: 260,
                  top: -90,
                  right: -80,
                  opacity: 0.13,
                },
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

            <View style={styles.headerContent}>
              {/* ====== AVATAR WITH CAMERA BUTTON ====== */}
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={showAvatarOptions}
                activeOpacity={0.8}
                disabled={uploadingAvatar}
              >
                {profile?.avatar ? (
                  <Image
                    source={{ uri: `${API_URL}${profile.avatar}` }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={{ fontSize: 36 }}>👤</Text>
                  </View>
                )}

                {/* Loading overlay khi đang upload */}
                {uploadingAvatar && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}

                {/* Camera icon button */}
                <View style={styles.cameraButton}>
                  <LinearGradient
                    colors={["#1a7a3c", "#2ecc71"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cameraButtonGrad}
                  >
                    <Ionicons name="camera" size={14} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>

              {/* Hint text */}
              <Text style={styles.avatarHint}>Nhấn vào ảnh để thay đổi</Text>

              <Text style={styles.profileName}>
                {profile?.name || "Chưa cập nhật"}
              </Text>

              <Text style={styles.profileEmail}>{profile?.email}</Text>

              <View style={styles.memberBadge}>
                <Ionicons name="star" size={12} color="#f5a623" />
                <Text style={styles.memberText}>Thành viên</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Spacer for floating card */}
          <View style={{ height: 15 }} />

          {/* ====== THÔNG TIN CÁ NHÂN — INLINE EDIT ====== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
              </View>
            </View>

            <View style={styles.card}>
              {renderEditableRow(
                "name",
                "person-outline",
                Colors.primary,
                "#e8f5e9",
                "Họ và tên",
                profile?.name || "",
                editName,
                setEditName,
              )}
              <View style={styles.infoDivider} />

              {/* Email — read only */}
              <View style={styles.infoRow}>
                <View style={[styles.infoIcon, { backgroundColor: "#e3f2fd" }]}>
                  <Ionicons name="mail-outline" size={18} color="#2196f3" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile?.email}</Text>
                </View>
                <View style={styles.emailVerified}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={Colors.primary}
                  />
                </View>
              </View>
              <View style={styles.infoDivider} />

              {renderEditableRow(
                "phone",
                "call-outline",
                "#ff9800",
                "#fff3e0",
                "Số điện thoại",
                profile?.phone || "",
                editPhone,
                setEditPhone,
                { keyboard: "phone-pad" },
              )}
              <View style={styles.infoDivider} />

              {/* Địa chỉ — nhấn chuyển sang trang địa chỉ */}
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => router.push("/address" as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.infoIcon, { backgroundColor: "#fce4ec" }]}>
                  <Ionicons name="location-outline" size={18} color="#e91e63" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Địa chỉ giao hàng</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      !profile?.address && styles.infoPlaceholder,
                    ]}
                    numberOfLines={2}
                  >
                    {profile?.address || "Chưa cập nhật địa chỉ"}
                  </Text>
                </View>
                <View style={styles.editIconBtn}>
                  <Ionicons name="chevron-forward" size={16} color="#bbb" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ====== TIỆN ÍCH ====== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Tiện ích</Text>
              </View>
            </View>

            <View style={styles.card}>
              {[
                {
                  icon: "receipt-outline",
                  label: "Đơn hàng của tôi",
                  color: "#4caf50",
                  bg: "#e8f5e9",
                  badge: null,
                  onPress: () => router.push("/orders" as any),
                },
                {
                  icon: "heart-outline",
                  label: "Sản phẩm yêu thích",
                  color: "#e91e63",
                  bg: "#fce4ec",
                  badge: null,
                  onPress: () =>
                    Alert.alert("Thông báo", "Tính năng đang phát triển"),
                },
                {
                  icon: "chatbubble-outline",
                  label: "Chat tư vấn",
                  color: "#2196f3",
                  bg: "#e3f2fd",
                  badge: "AI",
                  onPress: () => router.push("/chat"),
                },
                {
                  icon: "camera-outline",
                  label: "Nhận diện trái cây",
                  color: "#9c27b0",
                  bg: "#f3e5f5",
                  badge: "AI",
                  onPress: () => router.push("/camera" as any),
                },
              ].map((item, i) => (
                <View key={i}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={item.onPress}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.menuIcon, { backgroundColor: item.bg }]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.color}
                      />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.badge && (
                      <View style={styles.aiBadge}>
                        <Text style={styles.aiBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={18} color="#ddd" />
                  </TouchableOpacity>
                  {i < 3 && <View style={styles.infoDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* ====== KHÁC ====== */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionBar} />
                <Text style={styles.sectionTitle}>Khác</Text>
              </View>
            </View>

            <View style={styles.card}>
              {[
                {
                  icon: "shield-checkmark-outline",
                  label: "Chính sách bảo mật",
                  color: "#009688",
                  bg: "#e0f2f1",
                },
                {
                  icon: "document-text-outline",
                  label: "Điều khoản sử dụng",
                  color: "#607d8b",
                  bg: "#eceff1",
                },
                {
                  icon: "help-circle-outline",
                  label: "Trung tâm hỗ trợ",
                  color: "#ff9800",
                  bg: "#fff3e0",
                },
                {
                  icon: "star-outline",
                  label: "Đánh giá ứng dụng",
                  color: "#ffc107",
                  bg: "#fffde7",
                },
              ].map((item, i) => (
                <View key={i}>
                  <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
                    <View
                      style={[styles.menuIcon, { backgroundColor: item.bg }]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.color}
                      />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#ddd" />
                  </TouchableOpacity>
                  {i < 3 && <View style={styles.infoDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* ====== LOGOUT ====== */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#e04949" />
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Halona Fruits v1.0.0</Text>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
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
  decoBubble: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#fff",
  },

  // Guest
  guestContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 40,
  },
  guestIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f6ffed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#333",
    marginBottom: 8,
  },
  guestText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 28,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 14,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  registerLink: { fontSize: 14, color: "#999" },

  // Header
  headerBg: {
    paddingTop: 54,
    paddingBottom: 30,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerContent: {
    alignItems: "center",
  },

  // ====== AVATAR ======
  avatarWrap: {
    position: "relative",
    marginBottom: 6,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 45,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  cameraButton: {
    position: "absolute",
    bottom: 0,
    right: -2,
    zIndex: 10,
  },
  cameraButtonGrad: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  avatarHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 10,
    fontWeight: "500",
  },

  profileName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 12,
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  memberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  // Section
  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHeader: { marginBottom: 10, paddingHorizontal: 4 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#333" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#aaa", marginBottom: 3 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#333" },
  infoPlaceholder: { color: "#ccc", fontWeight: "400", fontStyle: "italic" },
  infoDivider: { height: 1, backgroundColor: "#f5f5f5", marginLeft: 70 },
  emailVerified: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f6ffed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  // Edit icon button
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#f8f8f8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },

  // Inline edit
  inlineEditWrap: {
    marginTop: 4,
  },
  inlineInput: {
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#333",
    borderWidth: 1.5,
    borderColor: Colors.primary,
    marginBottom: 8,
  },
  inlineActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  inlineCancelBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
  inlineSaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu row
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#444" },
  aiBadge: {
    backgroundColor: "#f3e5f5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  aiBadgeText: { fontSize: 10, fontWeight: "700", color: "#9c27b0" },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#ffccc7",
    backgroundColor: "#fff",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#e04949" },

  version: { textAlign: "center", color: "#ccc", fontSize: 12, marginTop: 16 },
});
