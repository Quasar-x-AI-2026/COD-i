import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
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

const TEACHER_DATA = [
  {
    id: "1",
    code: "CS101",
    name: "Intro to Computer Science",
    time: "09:00 AM",
    location: "Room 304",
    students: 42,
    status: "Live",
  },
  {
    id: "2",
    code: "MATH202",
    name: "Advanced Calculus",
    time: "11:30 AM",
    location: "Hall A",
    students: 30,
    status: "Upcoming",
  },
  {
    id: "3",
    code: "PHY105",
    name: "Applied Physics",
    time: "02:00 PM",
    location: "Lab 2",
    students: 28,
    status: "Upcoming",
  },
];

const UserPage = () => {
  const { user, classes } = useAuth();
  const STUDENT_SCHEDULE = classes;

  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceImages, setAttendanceImages] = useState([null, null, null]);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setUserRole("teacher");
      setLoading(false);
    }, 800);
  }, []);

  const openClassModal = (classItem) => {
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
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      const newImages = [...attendanceImages];
      newImages[index] = asset.uri;
      setAttendanceImages(newImages);

      console.log(`\n PHOTO ${index + 1} CAPTURED!`);
      console.log(" Local URI:", asset.uri);

      if (asset.base64) {
        console.log("Base64 Snippet:", asset.base64.substring(0, 30) + "...");
      }
    } else {
      console.log("[DEBUG] Camera cancelled by user.");
    }
  };

  const submitAttendance = async () => {
    console.log("\n [DEBUG] Submit Button Pressed!");
    if (attendanceImages.includes(null)) {
      Alert.alert("Incomplete", "Please take all 3 photos before submitting.");
      console.log(" [ERROR] Validation Failed: Missing photos.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("role", userRole);
      formData.append("classCode", selectedClass.code);
      formData.append("className", selectedClass.name);
      formData.append("location", selectedClass.location);
      formData.append("timestamp", new Date().toISOString());

      attendanceImages.forEach((uri, index) => {
        formData.append(`photo_${index + 1}`, {
          uri: uri,
          type: "image/jpeg",
          name: `attendance_photo_${index + 1}.jpg`,
        });
      });

      console.log("-----------------------------------------");
      console.log("🚀 UPLOADING ATTENDANCE WITH FORMDATA:");
      console.log("Endpoint: https://api.example.com/attendance/submit");
      console.log("FormData entries:");
      console.log(`  - role: ${userRole}`);
      console.log(`  - classCode: ${selectedClass.code}`);
      console.log(`  - className: ${selectedClass.name}`);
      console.log(`  - location: ${selectedClass.location}`);
      console.log(`  - timestamp: ${new Date().toISOString()}`);
      console.log(`  - photo_1: ${attendanceImages[0]?.substring(0, 50)}...`);
      console.log(`  - photo_2: ${attendanceImages[1]?.substring(0, 50)}...`);
      console.log(`  - photo_3: ${attendanceImages[2]?.substring(0, 50)}...`);
      console.log("-----------------------------------------");

      const response = await fetch(
        "https://api.example.com/attendance/submit",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: formData,
        },
      );

      console.log(`Response Status: ${response.status}`);
      const data = await response.json();
      console.log("Response Data:", data);

      if (response.ok) {
        Alert.alert("Success!", "Attendance submitted successfully.", [
          {
            text: "OK",
            onPress: () => {
              setModalVisible(false);
              setAttendanceImages([null, null, null]);
            },
          },
        ]);
      } else {
        Alert.alert("Error", data.message || "Failed to submit attendance.");
      }
    } catch (error) {
      console.error("[ERROR] Submission failed:", error);
      Alert.alert("Error", "Failed to submit attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Dashboard</Text>
            <Text style={styles.userName}>{user?.name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{userRole?.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: "https://th.bing.com/th/id/R.c3631c652abe1185b1874da24af0b7c7?rik=gNdBCSMtHLUrQQ&pid=ImgRaw&r=0",
              }}
              style={styles.avatar}
            />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {userRole === "teacher" && (
            <View>
              <Text style={styles.sectionTitle}>Your Schedule</Text>
              <Text style={styles.subTitle}>
                Tap any class to upload attendance
              </Text>

              {TEACHER_DATA.map((item) => (
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
                      <Text style={styles.iconText}>{item.code.charAt(0)}</Text>
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
                      <Ionicons name="people-outline" size={14} />{" "}
                      {item.students}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {userRole === "student" && (
            <View>
              <Text style={styles.sectionTitle}>Upcoming Classes</Text>
              <View style={styles.timeline}>
                {STUDENT_SCHEDULE.map((item) => {
                  const isLive = item.status === "Live";
                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.timeCol}>
                        <Text
                          style={[
                            styles.timeText,
                            isLive && styles.timeTextActive,
                          ]}
                        >
                          {item.time}
                        </Text>
                        <View
                          style={[styles.line, isLive && styles.lineActive]}
                        />
                      </View>
                      <View
                        style={[
                          styles.studentCard,
                          isLive && styles.studentCardActive,
                        ]}
                      >
                        <View style={styles.studentHeader}>
                          <Text style={styles.studentSubject}>
                            {item.subject}
                          </Text>
                          {isLive && (
                            <View style={styles.nowBadge}>
                              <Text style={styles.nowText}>NOW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.studentDetail}>
                          {item.code} • {item.location}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Attendance Verification</Text>
                  <Text style={styles.modalSub}>
                    {selectedClass?.code} • {selectedClass?.location}
                  </Text>
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
                  attendanceImages.includes(null) && styles.btnDisabled,
                  submitting && styles.btnDisabled,
                ]}
                onPress={submitAttendance}
                disabled={attendanceImages.includes(null) || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.text} />
                ) : (
                  <Text
                    style={[
                      styles.btnText,
                      attendanceImages.includes(null) && styles.btnTextDisabled,
                    ]}
                  >
                    Submit Attendance
                  </Text>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  safeArea: { flex: 1, backgroundColor: COLORS.background },
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleText: { fontSize: 10, fontWeight: "bold", color: COLORS.textSecondary },
  avatarContainer: {
    width: 45,
    height: 45,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
    backgroundColor: COLORS.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: { color: COLORS.primary, fontSize: 10, fontWeight: "800" },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 12,
  },
  metaText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },

  timeline: { marginTop: 10 },
  timelineItem: { flexDirection: "row", marginBottom: 20 },
  timeCol: { width: 70, alignItems: "center" },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  timeTextActive: { color: COLORS.text, fontWeight: "800" },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.grayMedium,
    borderRadius: 1,
  },
  lineActive: { backgroundColor: COLORS.primary },
  studentCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  studentCardActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  studentSubject: { fontSize: 16, fontWeight: "700", color: COLORS.text },
  nowBadge: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nowText: { color: COLORS.primary, fontSize: 10, fontWeight: "800" },
  studentDetail: { fontSize: 13, color: COLORS.textSecondary },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 450,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  closeBtn: { padding: 4, backgroundColor: COLORS.grayLight, borderRadius: 20 },
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
  },
  cameraSlot: {
    width: "30%",
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
    padding: 2,
  },
  slotNum: {
    position: "absolute",
    bottom: 8,
    right: 10,
    fontSize: 12,
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
  btnTextDisabled: { color: COLORS.textSecondary },
});
