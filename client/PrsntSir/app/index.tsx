import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
const index = () => {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text>index</Text>
      </View>
    </SafeAreaProvider>
  );
};
export default index;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#5e5c5c",
  },
});
