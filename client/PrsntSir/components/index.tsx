import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const COLORS = {
  primary: "#C4E45F",
  background: "#F2F2F2",
  text: "#000000",
  white: "#FFFFFF",
  inactiveDot: "#D1D5DB",
};

const OnboardingScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [fontsLoaded] = useFonts({
    openSansBold: require("../assets/fonts/OpenSans-VariableFont_wdth,wght.ttf"),
    openSansSemiBold: require("../assets/fonts/OpenSans-VariableFont_wdth,wght.ttf"),
    openSansRegular: require("../assets/fonts/OpenSans-VariableFont_wdth,wght.ttf"),
  });

  const slides = [
    {
      id: "1",
      title: "Smart Solutions.",
      subtitle: "CV-Powered, No Hardware",
      description: "CV-powered attendance tracking. No hardware needed.",
      extraText: "Simple, Secure & Accurate",
      image: require("../assets/images/image1.png"),
    },
    {
      id: "2",
      title: "Just 4 Pics",
      subtitle: "Secure & Accurate Enrollment",
      description:
        "Capture your biometric data in just 4 photos with our secure enrollment process. No extra devices needed.",
      extraText: "Fast Enrollment Process",
      image: require("../assets/images/image2.png"),
    },
    {
      id: "3",
      title: "No Proxies",
      subtitle: "Verifiable Presence, Always",
      description:
        "Advanced computer vision ensures authenticity and prevents proxy attendance.",
      extraText: "Real-time Verification",
      image: require("../assets/images/image3.png"),
    },
    {
      id: "4",
      title: "Ready to Go",
      subtitle: "Simple, Fast, Reliable",
      description:
        "Join thousands of organizations already using our attendance system. Get started today and experience the future of attendance tracking.",
      extraText: "Begin Your Journey Now",
      isLastSlide: true,
      image: null,
    },
  ];

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({
        x: prevIndex * width,
        animated: true,
      });
    }
  };
  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem("onboardingCompleted", "true");
      router.replace("/(tabs)/Index");
    } catch (error) {
      console.error("Error saving onboarding status:", error);
      router.replace("/UserRegistration/Login");
    }
  };

  if (!fontsLoaded) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <StatusBar barStyle="dark-content" />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slideContainer}>
            <View style={styles.card}>
              <Animated.View
                style={[
                  styles.contentWrapper,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.header}>
                  <Text style={styles.title}>{slide.title}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.subtitle}>{slide.subtitle}</Text>
                </View>

                {!slide.isLastSlide && slide.image && (
                  <View style={styles.imageWrapper}>
                    <Image
                      source={slide.image}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.body}>
                  <Text style={styles.description}>{slide.description}</Text>
                  <Text style={styles.extraText}>{slide.extraText}</Text>
                </View>

                <View style={styles.buttonRow}>
                  {!slide.isLastSlide ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.navButton,
                          styles.backButton,
                          currentIndex === 0 && styles.disabledButton,
                        ]}
                        onPress={handleBack}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft
                          size={20}
                          color={currentIndex === 0 ? "#AAAAAA" : "#FFFFFF"}
                          strokeWidth={2.5}
                        />
                        <Text
                          style={[
                            styles.navButtonText,
                            currentIndex === 0 && { color: "#AAAAAA" },
                            { color: "#FFFFFF" },
                          ]}
                        >
                          Back
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.navButton, styles.nextButton]}
                        onPress={handleNext}
                      >
                        <Text style={styles.navButtonText}>Next</Text>
                        <ChevronRight
                          size={20}
                          color="#000000"
                          strokeWidth={2.5}
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.navButton, styles.backButton]}
                        onPress={handleBack}
                      >
                        <ChevronLeft
                          size={20}
                          color="#FFFFFF"
                          strokeWidth={2.5}
                        />
                        <Text
                          style={[styles.navButtonText, { color: "#FFFFFF" }]}
                        >
                          Back
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.navButton, styles.startButton]}
                        onPress={handleGetStarted}
                      >
                        <Text
                          style={[styles.navButtonText, { color: "#FFFFFF" }]}
                        >
                          Get Started
                        </Text>
                        <ChevronRight
                          size={20}
                          color="#FFFFFF"
                          strokeWidth={2.5}
                        />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </Animated.View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slideContainer: {
    width: width,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "android" ? 20 : 0,
  },
  card: {
    backgroundColor: COLORS.primary,
    width: width - 32,
    height: Platform.OS === "ios" ? height * 0.8 : height * 0.82,
    borderRadius: 36,
    padding: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 10,
  },
  title: {
    fontFamily: "openSansBold",
    fontSize: 45,
    fontWeight: "500",
    color: COLORS.text,
    lineHeight: 52,
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  divider: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.text,
    borderRadius: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "openSansSemiBold",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 0.5,
    lineHeight: 20,
  },
  imageWrapper: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    maxHeight: 240,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.text,
    backgroundColor: COLORS.white,
  },
  body: {
    marginBottom: 20,
  },
  description: {
    fontFamily: "openSansRegular",
    fontSize: 16,
    lineHeight: 24,
    color: "#1A1A1A",
    marginBottom: 16,
    fontWeight: "400",
  },
  extraText: {
    fontFamily: "openSansSemiBold",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    height: 56,
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    gap: 8,
  },
  navButtonText: {
    fontFamily: "openSansSemiBold",
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  backButton: {
    backgroundColor: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  disabledButton: {
    backgroundColor: "#E5E5E5",
    borderColor: "#E5E5E5",
  },
  nextButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.text,
  },
  startButton: {
    backgroundColor: COLORS.text,
  },
  dotsContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    zIndex: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: "#000000",
  },
  inactiveDot: {
    width: 8,
    backgroundColor: COLORS.inactiveDot,
  },
});

export default OnboardingScreen;
