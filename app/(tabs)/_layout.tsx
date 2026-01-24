import { Tabs, usePathname } from "expo-router";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors, ThemeColors } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, useRef } from "react";
import { QuickAddModal } from "../../lib/components/QuickAddModal";
import * as Haptics from "expo-haptics";

type IconName = "home" | "home-outline" | "time" | "time-outline";

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

const TabIcon = ({
  name,
  focused,
  colors,
  styles,
}: TabIconProps & {
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
    <Ionicons
      name={name}
      size={24}
      color={focused ? colors.primary : colors.textPrimary}
    />
  </View>
);

const TabBarButton = (props: BottomTabBarButtonProps) => {
  const {
    onPress,
    onLongPress,
    onPressIn,
    onPressOut,
    onBlur,
    onFocus,
    accessibilityRole,
    accessibilityState,
    accessibilityLabel,
    testID,
    delayLongPress,
    disabled,
    children,
  } = props;

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress ?? undefined}
      onPressIn={onPressIn ?? undefined}
      onPressOut={onPressOut ?? undefined}
      onBlur={onBlur ?? undefined}
      onFocus={onFocus ?? undefined}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      delayLongPress={delayLongPress ?? undefined}
      disabled={disabled ?? undefined}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      {children}
    </TouchableOpacity>
  );
};

// FAB Component - Floating above tab bar
const FloatingActionButton = ({
  onPress,
  styles,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.fabTouchable}
    >
      <Animated.View
        style={[styles.fab, { transform: [{ scale: scaleAnim }] }]}
      >
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 12);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const pathname = usePathname();
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Only show FAB on main screens (Home and History)
  const showFab = pathname === "/" || pathname === "/history";

  const handleFabPress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setQuickAddVisible(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarShowLabel: false,
          tabBarButton: TabBarButton,
          tabBarStyle: {
            position: "absolute",
            bottom: bottomPadding,
            left: 16,
            right: 16,
            backgroundColor: colors.primaryLight,
            borderRadius: 28,
            height: 64,
            borderTopWidth: 0,
            elevation: 6,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
          },
          tabBarItemStyle: {
            height: 64,
            paddingVertical: 10,
            alignItems: "center",
            justifyContent: "center",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? "home" : "home-outline"}
                focused={focused}
                colors={colors}
                styles={styles}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ focused }) => (
              <TabIcon
                name={focused ? "time" : "time-outline"}
                focused={focused}
                colors={colors}
                styles={styles}
              />
            ),
          }}
        />
      </Tabs>

      {/* Floating Action Button - Above Tab Bar (only on main screens) */}
      {showFab && (
        <View
          pointerEvents="box-none"
          style={[styles.fabContainer, { bottom: bottomPadding + 26 }]}
        >
          <FloatingActionButton onPress={handleFabPress} styles={styles} />
        </View>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    iconContainerActive: {
      backgroundColor: colors.surface,
    },
    fabContainer: {
      position: "absolute",
      left: 0,
      right: 0,
      alignItems: "center",
      zIndex: 100,
    },
    fabTouchable: {
      alignItems: "center",
      justifyContent: "center",
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
  });
