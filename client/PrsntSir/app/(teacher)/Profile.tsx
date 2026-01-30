import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  success: "#4CAF50",
};

const UserDetailsPage = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [userData, setUserData] = useState(null);

  const { user } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, []),
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      console.log("[DEBUG] Loading user data from AsyncStorage...");

      const storedUserData = await AsyncStorage.getItem("userData");
      console.log("Stored user data:", storedUserData);
      const storedToken = await AsyncStorage.getItem("authToken");
      console.log("Stored auth token:", storedToken);
      if (storedUserData && storedToken) {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        console.log("✅ User data loaded:", user.name);
      } else {
        console.log(" No user data found in AsyncStorage");
        Alert.alert("Error", "User data not found. Please login again.");
        navigation?.navigate("Login");
      }
    } catch (error) {
      console.error(" Error loading user data:", error);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => performLogout(),
      },
    ]);
  };

  const performLogout = async () => {
    try {
      setLoggingOut(true);
      console.log("[DEBUG] Starting logout process...");
      await AsyncStorage.removeItem("authToken");
      console.log("✅ Auth token removed");
      await AsyncStorage.removeItem("userData");
      console.log("✅ User data removed");
      await AsyncStorage.removeItem("classesData");
      console.log("✅ Classes data removed");
      await AsyncStorage.clear();
      router.replace("/register/Login");
      console.log("✅ Logout successful");

      Alert.alert("Logged Out", "You have been successfully logged out.", [
        {
          text: "OK",
          onPress: () => {
            // Navigate to login screen
            navigation?.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Logout failed:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
      setLoggingOut(false);
    }
  };

  if (loading) {
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

  if (!userData) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.center}>
            <Text style={styles.errorText}>No user data available</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadUserData}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.danger} />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={24}
                color={COLORS.danger}
              />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatarSection}>
              <Image
                source={{
                  uri: `https://th.bing.com/th/id/R.c3631c652abe1185b1874da24af0b7c7?rik=gNdBCSMtHLUrQQ&pid=ImgRaw&r=0`,
                }}
                style={styles.avatar}
              />
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
              </View>
            </View>

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userData.name}</Text>
              <Text style={styles.userRole}>
                {userData.role?.toUpperCase()}
              </Text>
              <Text style={styles.userEmail}>{userData.email}</Text>
            </View>
          </View>

          {/* User Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            {/* Name */}
            <View style={styles.detailCard}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{userData.name}</Text>
              </View>
            </View>

            {/* Email */}
            <View style={styles.detailCard}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{userData.email}</Text>
              </View>
            </View>

            {/* User ID */}
            <View style={styles.detailCard}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="id-card-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>User ID</Text>
                <Text style={styles.detailValue}>{userData.id}</Text>
              </View>
            </View>

            {/* Role */}
            <View style={styles.detailCard}>
              <View style={styles.detailIconBox}>
                <Ionicons
                  name="briefcase-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Role</Text>
                <Text style={styles.detailValue}>{userData.role}</Text>
              </View>
            </View>
          </View>

          {/* Academic Details Section */}
          {userData.branch && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Academic Information</Text>

              {/* Branch */}
              <View style={styles.detailCard}>
                <View style={styles.detailIconBox}>
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Branch</Text>
                  <Text style={styles.detailValue}>{userData.branch}</Text>
                </View>
              </View>

              {/* Semester */}
              {userData.semester && (
                <View style={styles.detailCard}>
                  <View style={styles.detailIconBox}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Semester</Text>
                    <Text style={styles.detailValue}>
                      Semester {userData.semester}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
          <View style={styles.section}></View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutFullBtn}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.white}
                />
                <Text style={styles.logoutFullBtnText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Footer Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>App Version 1.0.0</Text>
            <Text style={styles.footerText}>© 2024 Attendance System</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default UserDetailsPage;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryBtnText: {
    color: COLORS.text,
    fontWeight: "600",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  logoutBtn: {
    padding: 8,
  },

  // Scroll Content
  scrollContent: {
    paddingVertical: 24,
  },

  // Profile Card
  profileCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarSection: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.grayLight,
  },
  onlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  onlineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.success,
  },
  userInfo: {
    alignItems: "center",
  },
  userName: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Section
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },

  // Detail Card
  detailCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  detailIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
  },

  // Action Card
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.grayLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: "600",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  logoutFullBtn: {
    backgroundColor: COLORS.danger,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutFullBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  footer: {
    alignItems: "center",
    marginBottom: 24,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginVertical: 4,
  },
});
