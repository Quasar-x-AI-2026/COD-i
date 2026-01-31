import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  button: "#05f909",
  primary: "#C4E45F",
  background: "#FAFAFA",
  text: "#1A1A1A",
  white: "#FFFFFF",
  grayLight: "#F5F5F5",
  grayMedium: "#E0E0E0",
  textSecondary: "#757575",
  success: "#4CAF50",
  danger: "#FF4D4D",
};

const StudentSchedule = ({ navigation }) => {
  const { user, classes } = useAuth();
  console.log("Classes from context:", classes);
  console.log("User object:", user);
  const CLASSES = classes && Array.isArray(classes) ? classes : [];

  const [syncedClasses, setSyncedClasses] = useState([]);
  const [calendarId, setCalendarId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    console.log("[DEBUG] StudentSchedule mounted");
    console.log("User object:", user);
    console.log("Classes from context:", classes);
    console.log("Classes array:", CLASSES);
    console.log("Classes count:", CLASSES.length);
    if (!user || !user.id) {
      console.warn(" User not loaded yet");
      setError("User data not loaded. Please login again.");
      setLoading(false);
      return;
    }

    if (CLASSES.length === 0) {
      console.warn(" No classes found for this user");
      setLoading(false);
      return;
    }
    initializePermissions();
  }, [user, classes]);

  const initializePermissions = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[DEBUG] Requesting calendar permissions...");

      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== "granted") {
        console.warn(" Calendar permission denied");
        setError("Calendar permission is required to sync classes.");
        setLoading(false);
        return;
      }

      console.log(" Calendar permission granted");

      setTimeout(() => {
        initializeCalendar();
      }, 500);
    } catch (error) {
      console.error(" Permission error:", error);
      setError("Failed to request calendar permissions.");
      setLoading(false);
    }
  };

  const initializeCalendar = async () => {
    try {
      console.log("[DEBUG] Initializing calendar...");

      let id;

      if (Platform.OS === "android") {
        const calendars = await Calendar.getCalendarsAsync(
          Calendar.EntityTypes.EVENT,
        );

        console.log("Available calendars:", calendars.length);

        const writableCalendars = calendars.filter(
          (cal) =>
            cal.accessLevel === "owner" ||
            cal.accessLevel === Calendar.CalendarAccessLevel.OWNER,
        );

        console.log("Writable calendars:", writableCalendars.length);

        if (writableCalendars.length === 0) {
          setError("No writable calendar found. Please add a Google account.");
          setLoading(false);
          return;
        }

        const preferredCalendar =
          writableCalendars.find((cal) => cal.source.type === "com.google") ||
          writableCalendars[0];

        const sourceId = preferredCalendar.source.id;

        const existingCalendar = calendars.find(
          (cal) => cal.title === "Class Schedule" && cal.source.id === sourceId,
        );

        if (existingCalendar) {
          id = existingCalendar.id;
          console.log(" Using existing calendar:", id);
        } else {
          const googleCalendar = writableCalendars.find(
            (cal) => cal.source.type === "com.google",
          );

          if (googleCalendar) {
            id = googleCalendar.id;
            console.log(" Using Google Calendar:", id, googleCalendar.title);
          } else {
            id = await Calendar.createCalendarAsync({
              title: "Class Schedule",
              name: "ClassSchedule",
              color: COLORS.primary,
              entityType: Calendar.EntityTypes.EVENT,
              sourceId: sourceId,
              isVisible: true,
            });
            console.log(" Created new calendar:", id);
          }
        }
      } else {
        // iOS
        const defaultCalendarSource = await Calendar.getDefaultCalendarSource();

        if (!defaultCalendarSource) {
          setError("Please set up a default calendar in device settings.");
          setLoading(false);
          return;
        }

        id = await Calendar.createCalendarAsync({
          title: "Class Schedule",
          color: COLORS.primary,
          entityType: Calendar.EntityTypes.EVENT,
          sourceId: defaultCalendarSource.id,
          source: defaultCalendarSource,
        });
      }

      setCalendarId(id);
      console.log(" Calendar initialized successfully:", id);
      setLoading(false);
    } catch (error) {
      console.error(" Calendar initialization error:", error);
      setError(`Calendar error: ${error.message}`);
      setLoading(false);
    }
  };

  const getDateForTime = (timeString) => {
    try {
      const date = new Date();

      if (!timeString || typeof timeString !== "string") {
        console.warn(" Invalid timeString:", timeString);
        return date;
      }

      const [time, modifier] = timeString.split(" ");

      if (!time) {
        console.warn(" Time part missing:", timeString);
        return date;
      }

      let [hours, minutes] = time.split(":");

      hours = parseInt(hours || "0", 10);
      minutes = parseInt(minutes || "0", 10);

      if (hours === 12) hours = 0;
      if (modifier === "PM") hours = hours + 12;

      date.setHours(hours, minutes, 0, 0);
      return date;
    } catch (error) {
      console.error(" Error parsing time:", timeString, error);
      return new Date();
    }
  };

  const handleSync = async (classItem) => {
    try {
      if (!classItem || !classItem.id) {
        Alert.alert("Error", "Invalid class data");
        return;
      }

      if (syncedClasses.includes(classItem.id)) {
        Alert.alert(
          "Already Synced",
          "This class is already in your calendar.",
        );
        return;
      }

      if (!calendarId) {
        Alert.alert("Error", "Calendar not initialized. Please try again.");
        return;
      }

      console.log("[DEBUG] Syncing class:", classItem.code);

      const startDate = getDateForTime(classItem.timeString);
      const durationMinutes = classItem.durationMinutes || 60;
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
      console.log("Start:", startDate);
      console.log("End:", endDate);
      const eventId = await Calendar.createEventAsync(calendarId, {
        title: `${classItem.code}: ${classItem.subject}`,
        startDate,
        endDate,
        location: classItem.room || "Unknown",
        notes: `Professor: ${classItem.professor || "Unknown"}`,
        alarms: [{ relativeOffset: -15 }, { relativeOffset: -5 }],
      });

      console.log(" Event created:", eventId);

      setSyncedClasses([...syncedClasses, classItem.id]);
      Alert.alert(
        "Success!",
        `${classItem.code} added to calendar with reminders!`,
      );
    } catch (error) {
      console.error(" Sync error:", error);
      Alert.alert("Error", `Failed to sync: ${error.message}`);
    }
  };

  const handleAttendanceNavigation = () => {
    try {
      if (router) {
        router.push("/(students)/Attendence");
      } else {
        Alert.alert("Error", "Navigation not configured");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Error", "Failed to navigate to attendance");
    }
  };

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Initializing calendar...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }
  if (error) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={48} color={COLORS.danger} />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={initializePermissions}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>Not Logged In</Text>
            <Text style={styles.errorMessage}>
              Please login to view your classes
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (CLASSES.length === 0) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>My Classes</Text>
              <Text style={styles.headerSub}>No classes assigned</Text>
            </View>
          </View>
          <View style={styles.centerContainer}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Classes</Text>
            <Text style={styles.emptyMessage}>
              You don't have any classes assigned yet
            </Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Classes</Text>
            <Text style={styles.headerSub}>
              {CLASSES.length} class{CLASSES.length !== 1 ? "es" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.attendanceBtn}
            onPress={handleAttendanceNavigation}
            activeOpacity={0.7}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color={COLORS.button}
            />
            <Text style={styles.attendanceBtnText}>Attendance</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {CLASSES.map((item) => {
            if (!item || !item.id) {
              console.warn("Invalid class item:", item);
              return null;
            }

            const isSynced = syncedClasses.includes(item.id);

            return (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {item.timeString?.split(" ")[0] || "N/A"}
                  </Text>
                  <Text style={styles.meridiem}>
                    {item.timeString?.split(" ")[1] || ""}
                  </Text>
                  <View style={styles.timelineLine} />
                </View>

                <View
                  style={[
                    styles.cardContent,
                    isSynced && styles.cardContentSynced,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.codeText}>{item.code || "N/A"}</Text>
                    {isSynced && (
                      <View style={styles.syncedBadge}>
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color={COLORS.white}
                        />
                        <Text style={styles.syncedText}>SYNCED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.subjectText}>
                    {item.subject || "Unknown Subject"}
                  </Text>

                  <Text style={styles.detailText}>
                    <Ionicons name="location-outline" size={14} />
                    {" " + (item.room || "N/A")}
                  </Text>

                  <Text style={styles.detailText}>
                    <Ionicons name="person-outline" size={14} />
                    {" " + (item.professor || "N/A")}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.syncBtn,
                      isSynced ? styles.syncBtnActive : styles.syncBtnInactive,
                    ]}
                    onPress={() => handleSync(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSynced ? "notifications" : "calendar-outline"}
                      size={18}
                      color={isSynced ? COLORS.white : COLORS.text}
                    />
                    <Text
                      style={[
                        styles.syncBtnText,
                        isSynced && { color: COLORS.white },
                      ]}
                    >
                      {isSynced ? "Reminder Set" : "Add to Calendar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default StudentSchedule;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  header: {
    padding: 24,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  headerTitle: { fontSize: 28, fontWeight: "800", color: COLORS.text },
  headerSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  attendanceBtn: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    gap: 4,
  },
  attendanceBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  scrollContent: { padding: 24, paddingBottom: 50 },
  classCard: { flexDirection: "row", marginBottom: 24 },
  timeContainer: { width: 60, alignItems: "center", paddingTop: 4 },
  timeText: { fontSize: 16, fontWeight: "800", color: COLORS.text },
  meridiem: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.grayMedium,
    marginTop: 8,
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: COLORS.grayMedium,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContentSynced: { borderColor: COLORS.primary, borderWidth: 2 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  codeText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  syncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncedText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },
  subjectText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  detailText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  syncBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  syncBtnInactive: { backgroundColor: COLORS.primary },
  syncBtnActive: { backgroundColor: COLORS.text },
  syncBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.text },

  // Error/Empty states
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 16,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
    marginTop: 16,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
});
