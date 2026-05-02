import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../contexts/useAuth";

const { width } = Dimensions.get("window");
const STORAGE_KEY = "halona_addresses";

const C = {
  emerald: "#00875A",
  lime: "#52C476",
  limeXLight: "#EDFBF3",
  coral: "#FF5A36",
  bg: "#F0FAF4",
  white: "#FFFFFF",
  text: "#0D1F14",
  muted: "#88A899",
  border: "#C8E8D5",
  red: "#e04949",
};

interface District {
  name: string;
  wards: string[];
}
interface Province {
  name: string;
  districts: District[];
}

const vietnamData: Province[] = [
  {
    name: "TP. Hồ Chí Minh",
    districts: [
      {
        name: "Quận 1",
        wards: [
          "Phường Bến Nghé",
          "Phường Bến Thành",
          "Phường Cầu Kho",
          "Phường Đa Kao",
          "Phường Nguyễn Thái Bình",
          "Phường Phạm Ngũ Lão",
          "Phường Tân Định",
        ],
      },
      {
        name: "Quận 3",
        wards: [
          "Phường 1",
          "Phường 2",
          "Phường 3",
          "Phường 4",
          "Phường 5",
          "Phường 9",
          "Phường 10",
          "Phường 11",
          "Phường 12",
          "Phường Võ Thị Sáu",
        ],
      },
      {
        name: "Quận 7",
        wards: [
          "Phường Bình Thuận",
          "Phường Phú Mỹ",
          "Phường Phú Thuận",
          "Phường Tân Hưng",
          "Phường Tân Kiểng",
          "Phường Tân Phong",
          "Phường Tân Phú",
        ],
      },
      {
        name: "Quận Bình Thạnh",
        wards: [
          "Phường 1",
          "Phường 2",
          "Phường 3",
          "Phường 5",
          "Phường 6",
          "Phường 7",
          "Phường 11",
          "Phường 12",
          "Phường 13",
          "Phường 14",
        ],
      },
      {
        name: "Quận Gò Vấp",
        wards: [
          "Phường 1",
          "Phường 3",
          "Phường 4",
          "Phường 5",
          "Phường 6",
          "Phường 7",
          "Phường 9",
          "Phường 10",
          "Phường 11",
          "Phường 12",
        ],
      },
      {
        name: "Quận Tân Bình",
        wards: [
          "Phường 1",
          "Phường 2",
          "Phường 3",
          "Phường 4",
          "Phường 5",
          "Phường 6",
          "Phường 7",
          "Phường 8",
          "Phường 9",
          "Phường 10",
        ],
      },
      {
        name: "Thủ Đức",
        wards: [
          "Phường Linh Trung",
          "Phường Linh Xuân",
          "Phường Linh Chiểu",
          "Phường Linh Đông",
          "Phường Trường Thọ",
          "Phường Hiệp Bình Chánh",
          "Phường Hiệp Bình Phước",
        ],
      },
    ],
  },
  {
    name: "Hà Nội",
    districts: [
      {
        name: "Quận Ba Đình",
        wards: [
          "Phường Cống Vị",
          "Phường Điện Biên",
          "Phường Đội Cấn",
          "Phường Giảng Võ",
          "Phường Kim Mã",
          "Phường Liễu Giai",
          "Phường Ngọc Hà",
        ],
      },
      {
        name: "Quận Hoàn Kiếm",
        wards: [
          "Phường Chương Dương",
          "Phường Cửa Đông",
          "Phường Cửa Nam",
          "Phường Đồng Xuân",
          "Phường Hàng Bạc",
          "Phường Hàng Bài",
          "Phường Hàng Bồ",
        ],
      },
      {
        name: "Quận Đống Đa",
        wards: [
          "Phường Cát Linh",
          "Phường Hàng Bột",
          "Phường Khâm Thiên",
          "Phường Kim Liên",
          "Phường Láng Hạ",
          "Phường Láng Thượng",
          "Phường Nam Đồng",
        ],
      },
      {
        name: "Quận Cầu Giấy",
        wards: [
          "Phường Dịch Vọng",
          "Phường Dịch Vọng Hậu",
          "Phường Mai Dịch",
          "Phường Nghĩa Đô",
          "Phường Quan Hoa",
          "Phường Trung Hòa",
          "Phường Yên Hòa",
        ],
      },
    ],
  },
  {
    name: "Đà Nẵng",
    districts: [
      {
        name: "Quận Hải Châu",
        wards: [
          "Phường Bình Hiên",
          "Phường Bình Thuận",
          "Phường Hải Châu I",
          "Phường Hải Châu II",
          "Phường Hòa Cường Bắc",
          "Phường Hòa Cường Nam",
        ],
      },
      {
        name: "Quận Thanh Khê",
        wards: [
          "Phường An Khê",
          "Phường Chính Gián",
          "Phường Hòa Khê",
          "Phường Tam Thuận",
          "Phường Tân Chính",
          "Phường Thanh Khê Đông",
        ],
      },
      {
        name: "Quận Sơn Trà",
        wards: [
          "Phường An Hải Bắc",
          "Phường An Hải Đông",
          "Phường An Hải Tây",
          "Phường Mân Thái",
          "Phường Phước Mỹ",
        ],
      },
      {
        name: "Quận Ngũ Hành Sơn",
        wards: [
          "Phường Hòa Hải",
          "Phường Hòa Quý",
          "Phường Khuê Mỹ",
          "Phường Mỹ An",
        ],
      },
      {
        name: "Quận Liên Chiểu",
        wards: [
          "Phường Hòa Hiệp Bắc",
          "Phường Hòa Hiệp Nam",
          "Phường Hòa Khánh Bắc",
          "Phường Hòa Khánh Nam",
          "Phường Hòa Minh",
        ],
      },
      {
        name: "Quận Cẩm Lệ",
        wards: [
          "Phường Hòa An",
          "Phường Hòa Phát",
          "Phường Hòa Thọ Đông",
          "Phường Hòa Thọ Tây",
          "Phường Hòa Xuân",
          "Phường Khuê Trung",
        ],
      },
    ],
  },
  {
    name: "Nghệ An",
    districts: [
      {
        name: "TP. Vinh",
        wards: [
          "Phường Bến Thủy",
          "Phường Cửa Nam",
          "Phường Đội Cung",
          "Phường Đông Vĩnh",
          "Phường Hà Huy Tập",
          "Phường Hồng Sơn",
          "Phường Lê Lợi",
          "Phường Quang Trung",
        ],
      },
      {
        name: "Huyện Nghĩa Đàn",
        wards: [
          "Xã Nghĩa An",
          "Xã Nghĩa Bình",
          "Xã Nghĩa Đức",
          "Xã Nghĩa Khánh",
          "Thị trấn Nghĩa Đàn",
        ],
      },
      {
        name: "Huyện Quỳnh Lưu",
        wards: [
          "Xã Quỳnh Bá",
          "Xã Quỳnh Bảng",
          "Xã Quỳnh Châu",
          "Xã Quỳnh Đôi",
          "Thị trấn Cầu Giát",
        ],
      },
    ],
  },
  {
    name: "Gia Lai",
    districts: [
      {
        name: "TP. Pleiku",
        wards: [
          "Phường Chi Lăng",
          "Phường Diên Hồng",
          "Phường Đống Đa",
          "Phường Hoa Lư",
          "Phường Ia Kring",
          "Phường Tây Sơn",
          "Phường Yên Đỗ",
        ],
      },
    ],
  },
  {
    name: "Bình Dương",
    districts: [
      {
        name: "TP. Thủ Dầu Một",
        wards: [
          "Phường Chánh Mỹ",
          "Phường Chánh Nghĩa",
          "Phường Định Hòa",
          "Phường Hiệp An",
          "Phường Phú Cường",
          "Phường Phú Hòa",
        ],
      },
      {
        name: "TP. Dĩ An",
        wards: [
          "Phường An Bình",
          "Phường Bình An",
          "Phường Dĩ An",
          "Phường Đông Hòa",
          "Phường Tân Bình",
        ],
      },
    ],
  },
  {
    name: "Cần Thơ",
    districts: [
      {
        name: "Quận Ninh Kiều",
        wards: [
          "Phường An Bình",
          "Phường An Hòa",
          "Phường An Khánh",
          "Phường Cái Khế",
          "Phường Hưng Lợi",
          "Phường Tân An",
          "Phường Xuân Khánh",
        ],
      },
    ],
  },
];

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

// ─── Picker Modal ───────────────────────────────────────────────────────────
function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pk.overlay}>
        <View style={pk.container}>
          <View style={pk.header}>
            <Text style={pk.title}>{title}</Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                setSearch("");
              }}
              style={pk.closeBtn}
            >
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <View style={pk.searchWrap}>
            <Ionicons name="search-outline" size={18} color={C.muted} />
            <TextInput
              style={pk.searchInput}
              placeholder={`Tìm ${title.toLowerCase()}...`}
              placeholderTextColor="#bbb"
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            ) : null}
          </View>
          <ScrollView style={pk.list} showsVerticalScrollIndicator={false}>
            {filtered.map((item) => {
              const active = item === selected;
              return (
                <TouchableOpacity
                  key={item}
                  style={[pk.option, active && pk.optionActive]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                    setSearch("");
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[pk.optionText, active && pk.optionTextActive]}>
                    {item}
                  </Text>
                  {active && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={C.emerald}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
            {filtered.length === 0 && (
              <Text style={pk.empty}>Không tìm thấy kết quả</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function AddressScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formStreet, setFormStreet] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formWard, setFormWard] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerType, setPickerType] = useState<
    "city" | "district" | "ward" | null
  >(null);

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);
  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setAddresses(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAddresses = async (list: Address[]) => {
    setAddresses(list);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    const defaultAddr = list.find((a) => a.isDefault);
    if (defaultAddr && user?.id) {
      const full = [
        defaultAddr.street,
        defaultAddr.ward,
        defaultAddr.district,
        defaultAddr.city,
      ]
        .filter(Boolean)
        .join(", ");
      try {
        await axiosClient.put(`/users/${user.id}`, {
          address: full,
          phone: defaultAddr.phone,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormPhone("");
    setFormStreet("");
    setFormCity("");
    setFormDistrict("");
    setFormWard("");
    setFormDefault(false);
    setEditingId(null);
  };

  const openAddForm = () => {
    resetForm();
    setFormDefault(addresses.length === 0);
    setShowForm(true);
  };

  const openEditForm = (a: Address) => {
    setEditingId(a.id);
    setFormName(a.name);
    setFormPhone(a.phone);
    setFormStreet(a.street);
    setFormCity(a.city);
    setFormDistrict(a.district);
    setFormWard(a.ward);
    setFormDefault(a.isDefault);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return Alert.alert("Lỗi", "Vui lòng nhập họ tên");
    if (!formPhone.trim())
      return Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
    if (!formCity) return Alert.alert("Lỗi", "Vui lòng chọn tỉnh/thành phố");
    if (!formDistrict) return Alert.alert("Lỗi", "Vui lòng chọn quận/huyện");
    if (!formWard) return Alert.alert("Lỗi", "Vui lòng chọn phường/xã");
    if (!formStreet.trim())
      return Alert.alert("Lỗi", "Vui lòng nhập địa chỉ cụ thể");
    setSaving(true);
    try {
      let list: Address[];
      if (editingId) {
        list = addresses.map((a) =>
          a.id === editingId
            ? {
                ...a,
                name: formName.trim(),
                phone: formPhone.trim(),
                street: formStreet.trim(),
                city: formCity,
                district: formDistrict,
                ward: formWard,
                isDefault: formDefault,
              }
            : formDefault
              ? { ...a, isDefault: false }
              : a,
        );
      } else {
        const newA: Address = {
          id: Date.now().toString(),
          name: formName.trim(),
          phone: formPhone.trim(),
          street: formStreet.trim(),
          city: formCity,
          district: formDistrict,
          ward: formWard,
          isDefault: formDefault || addresses.length === 0,
        };
        list = formDefault
          ? [...addresses.map((a) => ({ ...a, isDefault: false })), newA]
          : [...addresses, newA];
      }
      await saveAddresses(list);
      setShowForm(false);
      resetForm();
    } catch (e) {
      Alert.alert("Lỗi", "Không thể lưu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Xóa địa chỉ", "Bạn có chắc muốn xóa?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const u = addresses.filter((a) => a.id !== id);
          if (u.length > 0 && !u.some((a) => a.isDefault))
            u[0].isDefault = true;
          await saveAddresses(u);
        },
      },
    ]);
  };

  const setDefault = async (id: string) => {
    await saveAddresses(
      addresses.map((a) => ({ ...a, isDefault: a.id === id })),
    );
  };

  const cityOptions = vietnamData.map((p) => p.name);
  const districtOptions = (
    vietnamData.find((p) => p.name === formCity)?.districts || []
  ).map((d) => d.name);
  const wardOptions =
    vietnamData
      .find((p) => p.name === formCity)
      ?.districts.find((d) => d.name === formDistrict)?.wards || [];

  const getPickerProps = () => {
    if (pickerType === "city")
      return {
        title: "Tỉnh/Thành phố",
        options: cityOptions,
        selected: formCity,
      };
    if (pickerType === "district")
      return {
        title: "Quận/Huyện",
        options: districtOptions,
        selected: formDistrict,
      };
    if (pickerType === "ward")
      return { title: "Phường/Xã", options: wardOptions, selected: formWard };
    return { title: "", options: [] as string[], selected: "" };
  };

  const handlePickerSelect = (v: string) => {
    if (pickerType === "city") {
      setFormCity(v);
      setFormDistrict("");
      setFormWard("");
    } else if (pickerType === "district") {
      setFormDistrict(v);
      setFormWard("");
    } else if (pickerType === "ward") {
      setFormWard(v);
    }
  };

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.emerald} />
      </View>
    );

  // ── FORM ──
  if (showForm) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={s.root}>
          <View style={s.formHeader}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => {
                setShowForm(false);
                resetForm();
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={s.formHeaderTitle}>
              {editingId ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.formScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Thông tin người nhận */}
            <View style={s.formSection}>
              <View style={s.formSectionHeader}>
                <View style={s.formSectionDot} />
                <Text style={s.formSectionTitle}>Thông tin người nhận</Text>
              </View>
              <View style={s.formCard}>
                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Họ và tên</Text>
                  <View style={s.formInputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color="#aaa"
                      style={s.formInputIcon}
                    />
                    <TextInput
                      style={s.formInput}
                      value={formName}
                      onChangeText={setFormName}
                      placeholder="Nhập họ tên người nhận"
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>
                <View style={s.formDivider} />
                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Số điện thoại</Text>
                  <View style={s.formInputWrap}>
                    <Ionicons
                      name="call-outline"
                      size={18}
                      color="#aaa"
                      style={s.formInputIcon}
                    />
                    <TextInput
                      style={s.formInput}
                      value={formPhone}
                      onChangeText={setFormPhone}
                      placeholder="Nhập số điện thoại"
                      placeholderTextColor="#bbb"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Khu vực */}
            <View style={s.formSection}>
              <View style={s.formSectionHeader}>
                <View style={s.formSectionDot} />
                <Text style={s.formSectionTitle}>Khu vực</Text>
              </View>
              <View style={s.formCard}>
                <TouchableOpacity
                  style={s.pickerRow}
                  onPress={() => setPickerType("city")}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerLabel}>Tỉnh/Thành phố</Text>
                    <Text
                      style={[s.pickerValue, !formCity && s.pickerPlaceholder]}
                    >
                      {formCity || "Chọn tỉnh/thành phố"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
                <View style={s.formDivider} />
                <TouchableOpacity
                  style={[s.pickerRow, !formCity && { opacity: 0.5 }]}
                  onPress={() => formCity && setPickerType("district")}
                  activeOpacity={0.7}
                  disabled={!formCity}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerLabel}>Quận/Huyện</Text>
                    <Text
                      style={[
                        s.pickerValue,
                        !formDistrict && s.pickerPlaceholder,
                      ]}
                    >
                      {formDistrict || "Chọn quận/huyện"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
                <View style={s.formDivider} />
                <TouchableOpacity
                  style={[s.pickerRow, !formDistrict && { opacity: 0.5 }]}
                  onPress={() => formDistrict && setPickerType("ward")}
                  activeOpacity={0.7}
                  disabled={!formDistrict}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.pickerLabel}>Phường/Xã</Text>
                    <Text
                      style={[s.pickerValue, !formWard && s.pickerPlaceholder]}
                    >
                      {formWard || "Chọn phường/xã"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Địa chỉ cụ thể */}
            <View style={s.formSection}>
              <View style={s.formSectionHeader}>
                <View style={s.formSectionDot} />
                <Text style={s.formSectionTitle}>Địa chỉ cụ thể</Text>
              </View>
              <View style={s.formCard}>
                <View style={s.formGroup}>
                  <Text style={s.formLabel}>Tên đường, Toà nhà, Số nhà</Text>
                  <View style={[s.formInputWrap, { alignItems: "flex-start" }]}>
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color="#aaa"
                      style={[s.formInputIcon, { marginTop: 14 }]}
                    />
                    <TextInput
                      style={[
                        s.formInput,
                        { minHeight: 56, textAlignVertical: "top" },
                      ]}
                      value={formStreet}
                      onChangeText={setFormStreet}
                      placeholder="VD: 53 Nguyễn Minh Châu"
                      placeholderTextColor="#bbb"
                      multiline
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Default toggle */}
            <View style={s.defaultRow}>
              <View style={s.defaultLeft}>
                <Ionicons
                  name="bookmark"
                  size={18}
                  color={formDefault ? C.emerald : C.muted}
                />
                <Text style={s.defaultText}>Đặt làm địa chỉ mặc định</Text>
              </View>
              <Switch
                value={formDefault}
                onValueChange={setFormDefault}
                trackColor={{ false: "#e0e0e0", true: "#a5d6a7" }}
                thumbColor={formDefault ? C.emerald : "#f4f3f4"}
              />
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom */}
          <View style={s.formBottom}>
            {editingId && (
              <TouchableOpacity
                style={s.deleteBtn}
                onPress={() => {
                  setShowForm(false);
                  handleDelete(editingId);
                  resetForm();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color={C.red} />
                <Text style={s.deleteBtnText}>Xóa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.saveBtn, { flex: 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#1a7a3c", "#2ecc71"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.saveBtnGrad}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={s.saveBtnText}>HOÀN THÀNH</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <PickerModal
            visible={pickerType !== null}
            {...getPickerProps()}
            onSelect={handlePickerSelect}
            onClose={() => setPickerType(null)}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── LIST ──
  return (
    <View style={s.root}>
      <LinearGradient
        colors={["#1a7a3c", "#2ecc71"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.headerGrad}
      >
        <View
          style={[
            s.decoBubble,
            { width: 140, height: 140, top: -40, right: -20, opacity: 0.12 },
          ]}
        />
        <Animated.View style={[s.headerContent, { opacity: headerAnim }]}>
          <TouchableOpacity
            style={s.headerBackBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Địa chỉ nhận hàng</Text>
            <Text style={s.headerSub}>{addresses.length} địa chỉ đã lưu</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.listScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.searchHint}>
          <Ionicons name="location" size={16} color={C.muted} />
          <Text style={s.searchHintText}>Địa chỉ</Text>
        </View>

        {addresses.length === 0 ? (
          <View style={s.emptyState}>
            <View style={s.emptyIcon}>
              <Ionicons name="location-outline" size={40} color={C.muted} />
            </View>
            <Text style={s.emptyTitle}>Chưa có địa chỉ</Text>
            <Text style={s.emptyDesc}>
              Thêm địa chỉ giao hàng để đặt hàng nhanh hơn
            </Text>
          </View>
        ) : (
          addresses.map((addr) => (
            <TouchableOpacity
              key={addr.id}
              style={[s.addrCard, addr.isDefault && s.addrCardDefault]}
              onPress={() => setDefault(addr.id)}
              activeOpacity={0.7}
            >
              {addr.isDefault && (
                <LinearGradient
                  colors={["#1a7a3c", "#2ecc71"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.addrStrip}
                />
              )}
              <View style={s.addrContent}>
                <View style={s.addrTopRow}>
                  <View style={{ flex: 1 }}>
                    <View style={s.addrNameRow}>
                      <Text style={s.addrName}>{addr.name}</Text>
                      <Text style={s.addrDividerText}>|</Text>
                      <Text style={s.addrPhone}>({addr.phone})</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => openEditForm(addr)}
                    activeOpacity={0.6}
                  >
                    <Text style={s.editLink}>Sửa</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.addrDetail} numberOfLines={1}>
                  {addr.street}
                </Text>
                <Text style={s.addrDetail} numberOfLines={1}>
                  {[addr.ward, addr.district, addr.city]
                    .filter(Boolean)
                    .join(", ")}
                </Text>
                {addr.isDefault && (
                  <View style={s.defaultBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={C.emerald}
                    />
                    <Text style={s.defaultBadgeText}>Mặc định</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity
          style={s.addBtn}
          onPress={openAddForm}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[C.emerald + "15", C.emerald + "08"]}
            style={s.addBtnInner}
          >
            <Ionicons name="add-circle" size={22} color={C.emerald} />
            <Text style={s.addBtnText}>Thêm Địa Chỉ Mới</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Picker Styles ──────────────────────────────────────────────────────────
const pk = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", color: C.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 12 },
  list: { paddingHorizontal: 12 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  optionActive: { backgroundColor: C.limeXLight },
  optionText: { fontSize: 15, color: C.text, fontWeight: "500" },
  optionTextActive: { color: C.emerald, fontWeight: "700" },
  empty: { textAlign: "center", color: C.muted, marginTop: 20, fontSize: 14 },
});

// ─── Main Styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  decoBubble: {
    position: "absolute",
    borderRadius: 9999,
    backgroundColor: "#fff",
  },

  headerGrad: {
    paddingTop: Platform.OS === "ios" ? 54 : 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerBackBtn: {
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
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginTop: 1,
    fontWeight: "500",
  },

  listScroll: { paddingTop: 12, paddingHorizontal: 16 },
  searchHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  searchHintText: { fontSize: 14, color: C.muted, fontWeight: "600" },

  addrCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addrCardDefault: {
    borderColor: C.lime,
    shadowColor: C.emerald,
    shadowOpacity: 0.1,
  },
  addrStrip: { height: 3 },
  addrContent: { padding: 16 },
  addrTopRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  addrNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addrName: { fontSize: 16, fontWeight: "800", color: C.text },
  addrDividerText: { fontSize: 14, color: "#ddd" },
  addrPhone: { fontSize: 14, color: C.muted, fontWeight: "500" },
  editLink: { fontSize: 14, fontWeight: "700", color: C.emerald },
  addrDetail: { fontSize: 14, color: "#666", lineHeight: 20 },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: C.limeXLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: "700", color: C.emerald },

  addBtn: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: C.emerald + "30",
    borderStyle: "dashed",
  },
  addBtnInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: C.emerald },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.limeXLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  emptyDesc: { fontSize: 13, color: C.muted, textAlign: "center" },

  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: C.white,
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
  formHeaderTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  formScroll: { paddingHorizontal: 16, paddingTop: 16 },

  formSection: { marginBottom: 20 },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  formSectionDot: {
    width: 4,
    height: 16,
    borderRadius: 2,
    backgroundColor: C.emerald,
  },
  formSectionTitle: { fontSize: 15, fontWeight: "700", color: C.text },

  formCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  formGroup: { padding: 16 },
  formDivider: { height: 1, backgroundColor: "#f3f3f3", marginLeft: 16 },
  formLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 8,
    fontWeight: "500",
  },
  formInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: "#e8e8e8",
  },
  formInputIcon: { marginRight: 10 },
  formInput: { flex: 1, fontSize: 15, color: C.text, paddingVertical: 12 },

  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  pickerLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
    fontWeight: "500",
  },
  pickerValue: { fontSize: 15, fontWeight: "600", color: C.text },
  pickerPlaceholder: { color: "#bbb", fontWeight: "400" },

  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  defaultLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  defaultText: { fontSize: 14, fontWeight: "600", color: C.text },

  formBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#ffccc7",
    backgroundColor: C.white,
  },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: C.red },
  saveBtn: {},
  saveBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: C.emerald,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
});
