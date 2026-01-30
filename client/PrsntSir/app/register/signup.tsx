import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
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
  background: "#fafafaa8",
  card: "#FFFFFF",
  text: "#000000",
  textSecondary: "#666666",
  border: "#E0E0E0",
  danger: "#FF4D4D",
  inputBg: "#FFFFFF",
  shadow: "rgba(0, 0, 0, 0.1)",
};

const BRANCHES = ["CSE", "ECE", "EE", "ME", "CE"];
const SEMESTERS = ["1", "2", "3", "4", "5", "6", "7", "8"];

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

const signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    password: "",
    branch: "",
    semester: "",
    frontFace: null,
    rightFace: null,
    leftFace: null,
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoTaken, setPhotoTaken] = useState({
    frontFace: false,
    rightFace: false,
    leftFace: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed for photos",
        );
      }
    })();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.rollNumber.trim()) newErrors.rollNumber = "Roll required";
    if (!formData.email.trim()) newErrors.email = "Email required";
    if (!formData.password.trim()) newErrors.password = "Password required";
    if (formData.password && formData.password.length < 6)
      newErrors.password = "Min 6 characters";
    if (!formData.branch) newErrors.branch = "Required";
    if (!formData.semester) newErrors.semester = "Required";
    if (!formData.frontFace) newErrors.frontFace = "Required";
    if (!formData.rightFace) newErrors.rightFace = "Required";
    if (!formData.leftFace) newErrors.leftFace = "Required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async (photoType) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled) {
        setFormData({ ...formData, [photoType]: result.assets[0].uri });
        setPhotoTaken({ ...photoTaken, [photoType]: true });
        if (errors[photoType]) setErrors({ ...errors, [photoType]: "" });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fill all fields correctly");
      return;
    }

    setLoading(true);

    try {
      // Create FormData for multipart/form-data upload
      const submitData = new FormData();

      // Add text fields
      submitData.append("name", formData.name);
      submitData.append("rollNumber", formData.rollNumber);
      submitData.append("email", formData.email);
      submitData.append("password", formData.password);
      submitData.append("branch", formData.branch);
      submitData.append("semester", formData.semester);

      // Add image files with proper format for React Native
      submitData.append("frontFace", {
        uri: formData.frontFace,
        type: "image/jpeg",
        name: "frontFace.jpg",
      });

      submitData.append("rightFace", {
        uri: formData.rightFace,
        type: "image/jpeg",
        name: "rightFace.jpg",
      });

      submitData.append("leftFace", {
        uri: formData.leftFace,
        type: "image/jpeg",
        name: "leftFace.jpg",
      });

      console.log("=== SENDING FORMDATA ===");

      const response = await fetch(
        "http://192.168.9.130:3000/student/register",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: submitData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Server Error");
      }

      const result = await response.json();
      console.log("=== SUCCESS ===", result);

      Alert.alert(
        "Registration Successful",
        `ID: ${result.id}\nWelcome ${formData.name}!`,
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({
                name: "",
                rollNumber: "",
                email: "",
                password: "",
                branch: "",
                semester: "",
                frontFace: null,
                rightFace: null,
                leftFace: null,
              });
              setPhotoTaken({
                frontFace: false,
                rightFace: false,
                leftFace: false,
              });
              router.push("/register/Login");
            },
          },
        ],
      );
    } catch (error) {
      console.error("Registration error:", error);
      Alert.alert("Error", error.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) setErrors({ ...errors, [field]: "" });
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
                    name="person-add"
                    size={48}
                    color={COLORS.primary}
                  />
                </View>
              </View>
              <Text style={styles.headerText}>Create Account</Text>
              <Text style={styles.subHeaderText}>
                Register to start attendance tracking
              </Text>
            </View>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <CustomInput
                placeholder="Full Name"
                iconName="person"
                value={formData.name}
                onChangeText={(text) => handleInputChange("name", text)}
                error={errors.name}
              />

              <CustomInput
                placeholder="Roll Number"
                iconName="barcode"
                value={formData.rollNumber}
                onChangeText={(text) =>
                  handleInputChange("rollNumber", text.toUpperCase())
                }
                error={errors.rollNumber}
              />

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
            </View>
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Academic Details</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Branch</Text>
                <View style={styles.chipGrid}>
                  {BRANCHES.map((branch) => (
                    <TouchableOpacity
                      key={branch}
                      style={[
                        styles.chip,
                        formData.branch === branch && styles.chipActive,
                      ]}
                      onPress={() => handleInputChange("branch", branch)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.branch === branch && styles.chipTextActive,
                        ]}
                      >
                        {branch}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.branch && (
                  <Text style={styles.errorText}>{errors.branch}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Semester</Text>
                <View style={styles.chipGrid}>
                  {SEMESTERS.map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        styles.chip,
                        styles.chipSmall,
                        formData.semester === sem && styles.chipActive,
                      ]}
                      onPress={() => handleInputChange("semester", sem)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.semester === sem && styles.chipTextActive,
                        ]}
                      >
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.semester && (
                  <Text style={styles.errorText}>{errors.semester}</Text>
                )}
              </View>
            </View>

            {/* Face Data Card */}
            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>Face Recognition</Text>
              <Text style={styles.sectionSubtitle}>
                Capture 3 angles for attendance verification
              </Text>

              {[
                { key: "frontFace", label: "Front Face", icon: "camera" },
                { key: "rightFace", label: "Right Profile", icon: "camera" },
                { key: "leftFace", label: "Left Profile", icon: "camera" },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.photoButton,
                    errors[item.key] && styles.photoButtonError,
                  ]}
                  onPress={() => pickImage(item.key)}
                  activeOpacity={0.85}
                >
                  <View style={styles.photoButtonContent}>
                    <View style={styles.photoIconBox}>
                      <Ionicons
                        name={item.icon}
                        size={24}
                        color={COLORS.background}
                      />
                    </View>
                    <View style={styles.photoTextBox}>
                      <Text style={styles.photoLabelText}>{item.label}</Text>
                      <Text style={styles.photoHint}>
                        {formData[item.key]
                          ? "Photo captured"
                          : "Tap to capture"}
                      </Text>
                    </View>
                  </View>

                  {formData[item.key] ? (
                    <View style={styles.thumbnailBox}>
                      <Image
                        source={{ uri: formData[item.key] }}
                        style={styles.thumbnail}
                      />
                    </View>
                  ) : (
                    <View style={styles.thumbnailPlaceholder}>
                      <Ionicons
                        name="add-circle"
                        size={32}
                        color={COLORS.primary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              ))}

              {errors.frontFace && (
                <Text style={styles.errorText}>{errors.frontFace}</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? "Processing..." : "Complete Registration"}
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
            <View style={styles.footerCard}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => router.push("/register/Login")}>
                <Text style={styles.footerLink}>Sign in here</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default signup;

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
    paddingTop: 30,
    paddingBottom: 40,
  },

  headerContainer: {
    marginBottom: 35,
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
    marginBottom: 12,
  },
  subHeaderText: {
    fontSize: 15,
    color: COLORS.textSecondary,
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

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
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

  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  chipSmall: {
    paddingHorizontal: 12,
    minWidth: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
  },
  chipTextActive: {
    color: COLORS.text,
    fontWeight: "800",
  },

  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  photoButtonError: {
    borderColor: COLORS.danger,
  },
  photoButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  photoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  photoTextBox: {
    flex: 1,
  },
  photoLabelText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  photoHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  thumbnailBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },

  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
    marginBottom: 20,
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
    marginBottom: 8,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "800",
  },
});
