import { PlatformPressable, Text } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MyTabBar = ({ state, descriptors, navigation }) => {
  const { routes, index: activeIndex } = state;

  const translateX = useSharedValue(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const tabWidth = containerWidth > 0 ? containerWidth / routes.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      const newPosition = tabWidth * activeIndex;
      translateX.value = withTiming(newPosition, {
        duration: 350,
        easing: Easing.bezier(0.65, 0, 0.35, 1),
      });
    }
  }, [activeIndex, tabWidth, translateX]);

  const animatedHighlighterStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View
      style={styles.container}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.highlighter,
            { width: tabWidth },
            animatedHighlighterStyle,
          ]}
        />
      )}

      {routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = activeIndex === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <PlatformPressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <Text
              style={[styles.label, { color: isFocused ? "#000" : "#fff" }]}
            >
              {label}
            </Text>
          </PlatformPressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    flexDirection: "row",
    bottom: 40,
    width: "85%",
    alignSelf: "center",
    backgroundColor: "#1d1d1dff",
    borderRadius: 50,
    height: 56,
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  highlighter: {
    position: "absolute",
    backgroundColor: "#C4E45F",
    borderRadius: 50,
    height: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
  },
});

export default MyTabBar;
