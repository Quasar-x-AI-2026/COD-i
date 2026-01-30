import { Stack } from "expo-router";

export default function RootLayout() {
  // useEffect(() => {
  //   AsyncStorage.getItem("onboardingCompleted").then((value) => {
  //     if (value === "true") {
  //       router.replace("");
  //     }
  //   });
  // });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index"></Stack.Screen>
    </Stack>
  );
}
