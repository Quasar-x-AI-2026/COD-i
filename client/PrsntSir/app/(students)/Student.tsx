// import { useAuth } from "@/context/AuthContext";
// import { StyleSheet, Text, View } from "react-native";
// const Student = () => {
//   const { user } = useAuth();
//   return (
//     <View>
//       <Text>{user?.name}</Text>
//     </View>
//   );
// };
// export default Student;
// const styles = StyleSheet.create({});
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import * as Calendar from "expo-calendar";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
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
};

const StudentSchedule = ({ navigation }) => {
  const { user } = useAuth();
  const CLASSES = user.classes;
  const [syncedClasses, setSyncedClasses] = useState([]);
  const [calendarId, setCalendarId] = useState(null);
  const [sound, setSound] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission needed",
            "Calendar access is required to save schedules.",
          );
          return;
        }

        setTimeout(() => {
          initializeCalendar();
        }, 500);
      } catch (error) {
        console.log("Permission error:", error);
        Alert.alert("Error", "Failed to request permissions");
      }
    })();
  }, []);

  const initializeCalendar = async () => {
    try {
      let id;

      if (Platform.OS === "android") {
        const calendars = await Calendar.getCalendarsAsync(
          Calendar.EntityTypes.EVENT,
        );

        console.log("Available calendars count:", calendars.length);
        const writableCalendars = calendars.filter(
          (cal) =>
            cal.accessLevel === "owner" ||
            cal.accessLevel === Calendar.CalendarAccessLevel.OWNER,
        );

        console.log("Writable calendars:", writableCalendars.length);
        if (writableCalendars.length === 0) {
          Alert.alert(
            "No Writable Calendar",
            "Please ensure you have at least one Google account added.",
          );
          return;
        }
        const preferredCalendar =
          writableCalendars.find((cal) => cal.source.type === "com.google") ||
          writableCalendars[0];

        console.log(
          "Preferred calendar:",
          preferredCalendar.title,
          preferredCalendar.source,
        );

        const sourceId = preferredCalendar.source.id;
        console.log("SourceId:", sourceId);

        const existingCalendar = calendars.find(
          (cal) => cal.title === "Class Schedule" && cal.source.id === sourceId,
        );

        if (existingCalendar) {
          id = existingCalendar.id;
          console.log("✅ Using existing calendar:", id);
        } else {
          const googleCalendar = writableCalendars.find(
            (cal) => cal.source.type === "com.google",
          );

          if (googleCalendar) {
            id = googleCalendar.id;
            console.log(
              "✅ Using existing Google Calendar:",
              id,
              googleCalendar.title,
            );
          } else {
            console.log("Creating new calendar with sourceId:", sourceId);
            id = await Calendar.createCalendarAsync({
              title: "Class Schedule",
              name: "ClassSchedule",
              color: COLORS.primary,
              entityType: Calendar.EntityTypes.EVENT,
              sourceId: sourceId,
              isVisible: true,
            });
            console.log("Created calendar:", id);
          }
        }
      } else {
        const defaultCalendarSource = await Calendar.getDefaultCalendarSource();

        if (!defaultCalendarSource) {
          Alert.alert(
            "Setup Required",
            "Please set up a default calendar in your device settings.",
          );
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
      console.log("✅ Calendar initialized successfully:", id);
    } catch (error) {
      console.log("❌ Calendar initialization error:", error);
      Alert.alert("Calendar Error", `Error: ${error.message}`);
    }
  };

  const getDateForTime = (timeString) => {
    const date = new Date();
    const [time, modifier] = timeString.split(" ");
    let [hours, minutes] = time.split(":");

    if (hours === "12") hours = "00";
    if (modifier === "PM") hours = parseInt(hours, 10) + 12;

    date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return date;
  };

  const handleSync = async (classItem) => {
    if (syncedClasses.includes(classItem.id)) {
      Alert.alert("Already Synced", "This class is already in your calendar.");
      return;
    }

    if (!calendarId) {
      Alert.alert("Error", "Calendar not initialized. Please try again.");
      return;
    }

    try {
      const startDate = getDateForTime(classItem.timeString);
      const endDate = new Date(
        startDate.getTime() + classItem.durationMinutes * 60000,
      );

      // Create event with alarms
      const eventId = await Calendar.createEventAsync(calendarId, {
        title: `${classItem.code}: ${classItem.subject}`,
        startDate,
        endDate,
        location: classItem.room,
        notes: `Professor: ${classItem.professor}`,
        alarms: [
          { relativeOffset: -15 }, // 15 minutes before
          { relativeOffset: -5 }, // 5 minutes before (for better reliability)
        ],
      });

      setSyncedClasses([...syncedClasses, classItem.id]);
      Alert.alert(
        "Success!",
        `Class added to calendar with 15-min & 5-min reminders!\n\nEvent ID: ${eventId}`,
      );
    } catch (error) {
      console.log("Sync error:", error);
      Alert.alert("Error", `Sync failed: ${error.message}`);
    }
  };

  const handleAttendanceNavigation = () => {
    if (router) {
      router.push("/(students)/Attendence");
    } else {
      Alert.alert("Navigation", "Attendance page navigation not configured");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Classes</Text>
            <Text style={styles.headerSub}>Sync to Calendar for Alarms</Text>
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
            const isSynced = syncedClasses.includes(item.id);
            return (
              <View key={item.id} style={styles.classCard}>
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {item.timeString.split(" ")[0]}
                  </Text>
                  <Text style={styles.meridiem}>
                    {item.timeString.split(" ")[1]}
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
                    <Text style={styles.codeText}>{item.code}</Text>
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

                  <Text style={styles.subjectText}>{item.subject}</Text>
                  <Text style={styles.detailText}>
                    <Ionicons name="location-outline" size={14} /> {item.room}
                  </Text>
                  <Text style={styles.detailText}>
                    <Ionicons name="person-outline" size={14} />{" "}
                    {item.professor}
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
  settingsBtn: {
    padding: 8,
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
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
});
