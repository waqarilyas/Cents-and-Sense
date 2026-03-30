import { Tabs } from "expo-router";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors, ThemeColors } from "../../lib/theme";
import { useMemo } from "react";
import { AppIcon, AppIconName } from "../../lib/icons";

interface TabIconProps {
  name: AppIconName;
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
    <AppIcon
      name={name}
      size="nav"
      variant={focused ? "filled" : "outline"}
      color={focused ? colors.primary : colors.textSecondary}
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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);
  const { colors } = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
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
          backgroundColor: colors.surface,
          borderRadius: 24,
          height: 64,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
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
          tabBarAccessibilityLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="home"
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
          tabBarAccessibilityLabel: "History",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="history"
              focused={focused}
              colors={colors}
              styles={styles}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarAccessibilityLabel: "More",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name="more"
              focused={focused}
              colors={colors}
              styles={styles}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    iconContainerActive: {
      backgroundColor: colors.primaryLight,
    },
  });
