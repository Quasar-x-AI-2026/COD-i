import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const LoginScreen = () => {
  const { login } = useAuth();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    "OpenSans-Regular": require("../../assets/fonts/Raleway-VariableFont_wght.ttf"),
  });

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
    // Clear error when user starts typing
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

  const handleLogin = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill all fields correctly");
      return;
    }

    setLoading(true);

    try {
      console.log("=== SENDING LOGIN REQUEST ===");
      console.log(JSON.stringify(formData, null, 2));

      const response = await fetch("http://192.168.9.130:3000/student/login", {
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

      if (!response.ok) {
        throw new Error(result.message || "Login failed");
      }

      console.log("=== LOGIN SUCCESS ===", result);

      // Storing the token and user ID in AsyncStorage
      await login(result.token, result.user);
      await AsyncStorage.setItem("userData", JSON.stringify(result.user));
      await AsyncStorage.setItem("authToken", result.token);
      await AsyncStorage.setItem("userId", JSON.stringify(result.user.id));

      Alert.alert("Login Successful", `Welcome back !`, [
        {
          text: "OK",
          onPress: () => {
            setFormData({ email: "", password: "" });
            router.push("/(students)/Student");
          },
        },
      ]);
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Login Failed",
        error.message || "Invalid email or password. Please try again.",
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
