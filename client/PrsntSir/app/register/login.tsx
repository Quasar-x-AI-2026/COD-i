import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const COLORS = {
  primary: "#C4E45F",
  primaryLight: "#F0F8E8",
  background: "#FFFFFF",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  border: "#E0E0E0",
  danger: "#FF4D4D",
  inputBg: "#FFFFFF",
  shadow: "rgba(0, 0, 0, 0.1)",
};

// API Endpoints
const API_ENDPOINTS = {
  STUDENT: "http://192.168.9.130:3000/student/login",
  TEACHER: "http://192.168.9.130:3000/professor/login",
};

const CustomInput = ({
  placeholder,
  value,
  onChangeText,
  iconName,
  secureTextEntry = false,
  keyboardType = "default",
  isPassword = false,
  isPasswordVisible,
  togglePasswordVisibility,
  error,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{placeholder}</Text>
      <View
        style={[
          styles.inputWrapper,
          isFocused && {
            borderColor: COLORS.primary,
            backgroundColor: COLORS.primaryLight,
          },
          error && { borderColor: COLORS.danger },
        ]}
      >
        <Ionicons
          name={iconName}
          size={20}
          color={isFocused ? COLORS.primary : COLORS.textSecondary}
          style={{ marginRight: 12 }}
        />

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#BDBDBD"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword ? !isPasswordVisible : secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={
            keyboardType === "email-address" || isPassword ? "none" : "words"
          }
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const RoleToggle = ({ isStudent, onToggle }) => {
  return (
    <View style={styles.toggleContainer}>
      <View style={styles.roleLabelsContainer}>
        <Text
          style={[styles.roleLabel, isStudent && styles.roleActiveLabelLeft]}
        >
          Student
        </Text>
        <Text
          style={[styles.roleLabel, !isStudent && styles.roleActiveLabelRight]}
        >
          Professor
        </Text>
      </View>

      <TouchableOpacity
        style={styles.toggleBackdrop}
        onPress={onToggle}
        activeOpacity={1}
      >
        <View
          style={[styles.toggleSlider, !isStudent && styles.toggleSliderRight]}
        >
          <Ionicons
            name={isStudent ? "person" : "school"}
            size={20}
            color={COLORS.text}
          />
        </View>

        <View style={styles.toggleLabels}>
          <Text
            style={[styles.toggleLabel, isStudent && styles.toggleLabelActive]}
          >
            Student
          </Text>
          <Text
            style={[styles.toggleLabel, !isStudent && styles.toggleLabelActive]}
          >
            Professor
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.endpointInfo}>
        <Ionicons name="cloud-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.endpointText}>
          {isStudent ? "Student API" : "Professor API"}
        </Text>
      </View>
    </View>
  );
};

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "OpenSans-Regular": require("../../assets/fonts/Raleway-VariableFont_wght.ttf"),
  });

  const [isStudent, setIsStudent] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!fontsLoaded) {
    return null;
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Parse teacher response payload
   */
  const parseTeacherResponse = (result) => {
    console.log("[DEBUG] Parsing TEACHER response...");

    if (!result.professor) {
      throw new Error("Professor data not found in response");
    }

    const professor = result.professor;

    if (!professor.id || !professor.email) {
      throw new Error("Missing required professor fields (id, email)");
    }

    const userData = {
      id: professor.id,
      name: professor.name || "Professor",
      email: professor.email,
      role: "TEACHER",
    };

    const classes = result.classes || [];

    console.log("✅ Teacher response parsed successfully");
    console.log(`Professor: ${userData.name}, Classes: ${classes.length}`);

    return { userData, classes, token: result.token };
  };

  /**
   * Parse student response payload
   */
  const parseStudentResponse = (result) => {
    console.log("[DEBUG] Parsing STUDENT response...");

    if (!result.user) {
      throw new Error("User data not found in response");
    }

    const user = result.user;

    if (!user.id || !user.email) {
      throw new Error("Missing required user fields (id, email)");
    }

    const userData = {
      id: user.id,
      name: user.name || "Student",
      email: user.email,
      role: user.role || "student",
      branch: user.branch || "",
      semester: user.semester || 0,
    };

    const classes = user.classes || [];

    console.log("✅ Student response parsed successfully");
    console.log(`Student: ${userData.name}, Classes: ${classes.length}`);

    return { userData, classes, token: result.token };
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill all fields correctly");
      return;
    }

    setLoading(true);

    try {
      // Determine API endpoint and role
      const apiUrl = isStudent ? API_ENDPOINTS.STUDENT : API_ENDPOINTS.TEACHER;
      const roleType = isStudent ? "STUDENT" : "TEACHER";

      console.log("\n=== SENDING LOGIN REQUEST ===");
      console.log(`Role: ${roleType}`);
      console.log(`API: ${apiUrl}`);
      console.log(`Email: ${formData.email}`);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      console.log("=== RESPONSE RECEIVED ===");
      console.log("Status:", response.status);
      console.log("Response keys:", Object.keys(result));

      // ✅ CHECK 1: Response status
      if (!response.ok) {
        throw new Error(result.message || `${roleType} login failed`);
      }

      // ✅ CHECK 2: Response structure
      if (!result || typeof result !== "object") {
        throw new Error("Invalid response format from server");
      }

      // ✅ CHECK 3: Token exists
      if (!result.token) {
        throw new Error("Server did not return authentication token");
      }

      console.log("✅ Login validation passed");

      // Parse response based on role
      let userData, classes, token;

      if (isStudent) {
        const parsed = parseStudentResponse(result);
        userData = parsed.userData;
        classes = parsed.classes;
        token = parsed.token;
      } else {
        const parsed = parseTeacherResponse(result);
        userData = parsed.userData;
        classes = parsed.classes;
        token = parsed.token;
      }

      // ✅ Call login from AuthContext
      // This will:
      // 1. Save to AsyncStorage
      // 2. Update context state
      // 3. Navigation happens in the root layout based on role
      await login(token, userData, classes, userData.role);

      console.log("✅ Login successful!");
      console.log(`User: ${userData.name} (${userData.role})`);

      Alert.alert("Login Successful", `Welcome ${userData.name}!`, [
        {
          text: "OK",
          onPress: () => {
            setFormData({ email: "", password: "" });

            // Navigate based on role
            if (isStudent) {
              router.replace("/(students)/Student");
            } else {
              router.replace("/(teacher)/Classes");
            }
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Login Error:", error.message);
      const roleType = isStudent ? "Student" : "Professor";
      Alert.alert(
        "Login Failed",
        error.message ||
          `Invalid ${roleType.toLowerCase()} credentials. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const navigateToRegister = () => {
    router.push("/register/signup");
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerContainer}>
              <View style={styles.iconCircle}>
                <View style={styles.iconBackground}>
                  <Ionicons
                    name="finger-print"
                    size={48}
                    color={COLORS.primary}
                  />
                </View>
              </View>
              <Text style={styles.headerText}>Welcome Back</Text>
              <Text style={styles.subHeaderText}>
                Sign in to continue attendance
              </Text>
            </View>

            {/* Role Toggle Slider */}
            <RoleToggle
              isStudent={isStudent}
              onToggle={() => setIsStudent(!isStudent)}
            />

            <View style={styles.formCard}>
              <CustomInput
                placeholder="Email Address"
                iconName="mail"
                value={formData.email}
                onChangeText={(text) =>
                  handleInputChange("email", text.toLowerCase())
                }
                keyboardType="email-address"
                error={errors.email}
              />

              <CustomInput
                placeholder="Password"
                iconName="lock-closed"
                value={formData.password}
                onChangeText={(text) => handleInputChange("password", text)}
                isPassword={true}
                isPasswordVisible={isPasswordVisible}
                togglePasswordVisibility={() =>
                  setIsPasswordVisible(!isPasswordVisible)
                }
                error={errors.password}
              />

              <TouchableOpacity
                style={[styles.submitButton, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                activeOpacity={0.85}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading ? "Signing In..." : "Sign In"}
                </Text>

                {!loading && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#000000"
                    style={{ marginLeft: 10 }}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footerCard}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={navigateToRegister}>
                <Text style={styles.footerLink}>Create one now</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: "center",
  },

  headerContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  iconCircle: {
    marginBottom: 28,
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  headerText: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    fontFamily: "OpenSans-Regular",
    marginBottom: 12,
  },
  subHeaderText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontFamily: "OpenSans-Regular",
    textAlign: "center",
  },

  // Toggle Styles
  toggleContainer: {
    marginBottom: 32,
    alignItems: "center",
  },
  roleLabelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    fontFamily: "OpenSans-Regular",
  },
  roleActiveLabelLeft: {
    color: COLORS.primary,
  },
  roleActiveLabelRight: {
    color: COLORS.primary,
  },
  toggleBackdrop: {
    width: "100%",
    height: 60,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    marginBottom: 12,
    position: "relative",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  toggleSlider: {
    position: "absolute",
    width: "50%",
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    left: 6,
    zIndex: 1,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleSliderRight: {
    left: "calc(50% + 3px)",
  },
  toggleLabels: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    zIndex: 0,
  },
  toggleLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    fontFamily: "OpenSans-Regular",
  },
  toggleLabelActive: {
    color: COLORS.text,
    fontWeight: "700",
  },
  endpointInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  endpointText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
    marginLeft: 6,
    fontFamily: "OpenSans-Regular",
  },

  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: 10,
    marginLeft: 4,
    fontFamily: "OpenSans-Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.inputBg,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    height: "100%",
    fontFamily: "OpenSans-Regular",
  },
  eyeIcon: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: "600",
  },

  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    fontFamily: "OpenSans-Regular",
    letterSpacing: 0.3,
  },

  footerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: "OpenSans-Regular",
    marginBottom: 8,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "OpenSans-Regular",
  },
});
