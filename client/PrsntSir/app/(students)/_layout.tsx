import MyTabBar from "@/components/MyTabBar";
import { Tabs } from "expo-router";
export default function Layout() {
  return (
    <Tabs
      tabBar={(props) => <MyTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="Student" />
      <Tabs.Screen name="Attendence" />
      <Tabs.Screen name="Profile" />
    </Tabs>
  );
}
