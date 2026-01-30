import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#C4E45F",
  background: "#FAFAFA",
  text: "#1A1A1A",
  white: "#FFFFFF",
  grayLight: "#F5F5F5",
  grayMedium: "#E0E0E0",
  textSecondary: "#757575",
  danger: "#FF4D4D",
};

const UserPage = () => {
  // Get data from AuthContext
  const { user, classes, isLoading, token, role } = useAuth();

  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceImages, setAttendanceImages] = useState([null, null, null]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [classesData, setClassesData] = useState([]);

  // Load classes data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadClassesData();
    }, [classes]),
  );

  const loadClassesData = () => {
    try {
      console.log("[DEBUG] Loading classes from AuthContext...");
      console.log("Classes available:", classes);
      console.log("User role:", role);

      if (classes && Array.isArray(classes) && classes.length > 0) {
        setClassesData(classes);
        console.log(`✅ Loaded ${classes.length} classes`);
        console.log(
          "First class structure:",
          JSON.stringify(classes[0], null, 2),
        );
      } else {
        console.log("❌ No classes data available or not an array");
        setClassesData([]);
      }
    } catch (error) {
      console.error("❌ Error loading classes:", error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const openClassModal = (classItem) => {
    console.log("Opening modal for class:", classItem);
    setSelectedClass(classItem);
    setAttendanceImages([null, null, null]);
    setModalVisible(true);
  };

  const takePhoto = async (index) => {
    console.log(`[DEBUG] Attempting to open camera for slot ${index + 1}...`);

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission Denied",
        "You must allow camera access in settings.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: false,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const newImages = [...attendanceImages];
      newImages[index] = asset.uri;
      setAttendanceImages(newImages);

      console.log(`\n📸 PHOTO ${index + 1} CAPTURED!`);
      console.log("📁 Local URI:", asset.uri);
    } else {
      console.log("[DEBUG] Camera cancelled by user.");
    }
  };

  const submitAttendance = async () => {
    console.log("\n🔘 [DEBUG] Submit Button Pressed!");

    if (attendanceImages.includes(null)) {
      Alert.alert("Incomplete", "Please take all 3 photos before submitting.");
      return;
    }

    if (!selectedClass) {
      Alert.alert("Error", "No class selected");
      return;
    }

    if (!classesData || classesData.length === 0) {
      Alert.alert("Error", "No classes data available");
      return;
    }

    setSubmitting(true);

    try {
      const sessionId = classesData[0]?.sessionId;

      if (!sessionId) {
        throw new Error("SessionId not found in classes data");
      }

      console.log("[DEBUG] Building FormData...");

      const formData = new FormData();

      // Append all fields as strings
      formData.append("role", role || "TEACHER");
      formData.append("sessionId", String(sessionId));
      formData.append("classCode", String(selectedClass.code));
      formData.append("className", String(selectedClass.name));
      formData.append("location", String(selectedClass.location));
      formData.append("timestamp", new Date().toISOString());

      // Append images with proper format
      attendanceImages.forEach((uri, index) => {
        const filename = uri.split("/").pop() || `photo_${index + 1}.jpg`;

        formData.append("images", {
          uri: uri,
          type: "image/jpeg",
          name: filename,
        });

        console.log(`✅ Photo ${index + 1} added to FormData`);
      });

      console.log("-----------------------------------------");
      console.log("🚀 UPLOADING ATTENDANCE");
      console.log("Endpoint: http://192.168.9.130:3000/professor/mark");
      console.log("📋 Data:");
      console.log(`  • role: ${role || "TEACHER"}`);
      console.log(`  • sessionId: ${sessionId}`);
      console.log(`  • classCode: ${selectedClass.code}`);
      console.log(`  • className: ${selectedClass.name}`);
      console.log(`  • location: ${selectedClass.location}`);
      console.log(`  • photos: 3 image files`);
      console.log("-----------------------------------------");

      const response = await fetch("http://192.168.9.130:3000/professor/mark", {
        method: "POST",
        body: formData,
        // Don't set headers - fetch will handle multipart/form-data
      });

      console.log(`\n📡 Response Status: ${response.status}`);

      // Read response as text first
      const responseText = await response.text();
      console.log("📝 Raw Response Text:", responseText);

      // Try to parse as JSON
      let responseData;
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
          console.log("📦 Parsed JSON:", responseData);
        } catch (e) {
          console.log("⚠️ Response is not JSON");
          responseData = { message: responseText };
        }
      }

      if (response.ok) {
        Alert.alert("✅ Success!", "Attendance submitted successfully.", [
          {
            text: "OK",
            onPress: () => {
              setModalVisible(false);
              setAttendanceImages([null, null, null]);
            },
          },
        ]);
        console.log("✅ Attendance submission successful!");
      } else {
        const errorMsg =
          responseData?.message ||
          responseData?.error ||
          `Server Error: ${response.status}`;
        Alert.alert("❌ Error", errorMsg);
        console.error("❌ Server Error:", errorMsg);
      }
    } catch (error) {
      console.error("❌ ERROR:", error.message);
      Alert.alert("❌ Error", error.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {role?.toUpperCase() || "TEACHER"}
              </Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: `https://i.pravatar.cc/150?u=${user?.email}`,
              }}
              style={styles.avatar}
            />
          </View>
        </View>

        {/* Classes List */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {role === "TEACHER" ? (
            <View>
              <Text style={styles.sectionTitle}>Your Schedule</Text>
              <Text style={styles.subTitle}>
                Tap any class to mark attendance
              </Text>

              {classesData && classesData.length > 0 ? (
                classesData.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.teacherCard,
                      item.status === "Live" && styles.liveCardBorder,
                    ]}
                    onPress={() => openClassModal(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardRow}>
                      <View style={styles.iconBox}>
                        <Text style={styles.iconText}>
                          {item.code?.charAt(0) || "C"}
                        </Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.titleRow}>
                          <Text style={styles.cardTitle}>{item.code}</Text>
                          {item.status === "Live" && (
                            <View style={styles.liveBadge}>
                              <Text style={styles.liveText}>LIVE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.cardSub}>{item.name}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMeta}>
                      <Text style={styles.metaText}>
                        <Ionicons name="time-outline" size={14} /> {item.time}
                      </Text>
                      <Text style={styles.metaText}>
                        <Ionicons name="location-outline" size={14} />{" "}
                        {item.location}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="folder-open-outline"
                    size={48}
                    color={COLORS.grayMedium}
                  />
                  <Text style={styles.emptyText}>No classes assigned</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.sectionTitle}>Upcoming Classes</Text>
              {classesData && classesData.length > 0 ? (
                classesData.map((item) => (
                  <View key={item.id} style={styles.studentCard}>
                    <Text style={styles.studentSubject}>{item.subject}</Text>
                    <Text style={styles.studentDetail}>{item.code}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No classes enrolled</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Modal */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Mark Attendance</Text>
                  {classesData.length > 0 && (
                    <Text style={styles.sessionInfo}>
                      SessionId: {classesData[0]?.sessionId}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeBtn}
                  disabled={submitting}
                >
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.instruction}>
                Capture 3 photos of the class:
              </Text>

              <View style={styles.cameraRow}>
                {attendanceImages.map((img, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.cameraSlot, img && styles.cameraSlotFilled]}
                    onPress={() => takePhoto(index)}
                    disabled={submitting}
                  >
                    {img ? (
                      <Image source={{ uri: img }} style={styles.photo} />
                    ) : (
                      <Ionicons
                        name="camera"
                        size={32}
                        color={COLORS.textSecondary}
                      />
                    )}
                    {img && (
                      <View style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}
                    {!img && <Text style={styles.slotNum}>{index + 1}</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.fullWidthBtn,
                  (attendanceImages.includes(null) || submitting) &&
                    styles.btnDisabled,
                ]}
                onPress={submitAttendance}
                disabled={attendanceImages.includes(null) || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Text style={styles.btnText}>Submit Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default UserPage;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  greeting: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  userName: { fontSize: 22, color: COLORS.text, fontWeight: "800" },
  roleBadge: {
    backgroundColor: COLORS.grayLight,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  roleText: { fontSize: 10, fontWeight: "bold", color: COLORS.primary },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: COLORS.primary,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  scrollContent: { padding: 24, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  subTitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  teacherCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  liveCardBorder: { borderColor: COLORS.primary, borderWidth: 2 },
  cardRow: { flexDirection: "row", marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  iconText: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  cardInfo: { flex: 1, justifyContent: "center" },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  liveBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: { color: COLORS.text, fontSize: 10, fontWeight: "800" },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 12,
  },
  metaText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  emptyState: { alignItems: "center", paddingVertical: 60 },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 16,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  studentSubject: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  studentDetail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  sessionInfo: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  closeBtn: { padding: 8, backgroundColor: COLORS.grayLight, borderRadius: 20 },
  instruction: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  cameraRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    gap: 8,
  },
  cameraSlot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.grayMedium,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.grayLight,
  },
  cameraSlotFilled: {
    borderStyle: "solid",
    borderColor: COLORS.primary,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" },
  checkCircle: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  slotNum: {
    position: "absolute",
    bottom: 8,
    right: 10,
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.textSecondary,
  },
  fullWidthBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: COLORS.grayMedium },
  btnText: { fontSize: 16, fontWeight: "800", color: COLORS.text },
});
