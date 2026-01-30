import { AuthProvider } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";

export default function RootLayout() {
  const [isLoading, setisLoading] = useState(true);
  const [onboardCompleted, setOnboardCompleted] = useState<boolean>(false);
  useEffect(() => {
    const fetchFromAsync = async () => {
      const onboard = await AsyncStorage.getItem("onboardingCompleted1");
      if (onboard === null) {
        setOnboardCompleted(false);
      } else {
        setOnboardCompleted(JSON.parse(onboard));
      }
    };
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {!onboardCompleted ? (
          <Stack.Screen name="index"></Stack.Screen>
        ) : (
          <Stack.Screen name="register/signup"></Stack.Screen>
        )}
      </Stack>
    </AuthProvider>
  );
}
