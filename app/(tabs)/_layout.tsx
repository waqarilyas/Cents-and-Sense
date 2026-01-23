import { Tabs } from "expo-router";
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef } from "react";
import { QuickAddModal } from "../../lib/components/QuickAddModal";
import * as Haptics from "expo-haptics";

type IconName = "home" | "home-outline" | "time" | "time-outline";

interface TabIconProps {
  name: IconName;
  focused: boolean;
}

const TabIcon = ({ name, focused }: TabIconProps) => (
  <View style={[
    styles.iconContainer,
    focused && styles.iconContainerActive,
  ]}>
    <Ionicons 
      name={name} 
      size={24} 
      color={focused ? colors.primary : colors.textSecondary} 
    />
  </View>
);

// FAB Component - Floating above tab bar
const FloatingActionButton = ({ onPress }: { onPress: () => void }) => {
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
        style={[
          styles.fab,
          { transform: [{ scale: scaleAnim }] }
        ]}
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

  const handleFabPress = () => {
    if (Platform.OS !== 'web') {
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
          tabBarStyle: {
            position: 'absolute',
            bottom: bottomPadding,
            left: 20,
            right: 20,
            backgroundColor: colors.primaryLight,
            borderRadius: 32,
            height: 60,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
          },
          tabBarItemStyle: {
            height: 60,
            paddingVertical: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "home" : "home-outline"} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: "History",
            tabBarIcon: ({ focused }) => (
              <TabIcon name={focused ? "time" : "time-outline"} focused={focused} />
            ),
          }}
        />
        {/* Hidden screens - accessible via navigation from profile */}
        <Tabs.Screen name="transactions" options={{ href: null }} />
        <Tabs.Screen name="analysis" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="accounts" options={{ href: null }} />
        <Tabs.Screen name="budgets" options={{ href: null }} />
        <Tabs.Screen name="goals" options={{ href: null }} />
        <Tabs.Screen name="categories" options={{ href: null }} />
        <Tabs.Screen name="subscriptions" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="guide" options={{ href: null }} />
        <Tabs.Screen name="add-placeholder" options={{ href: null }} />
      </Tabs>
      
      {/* Floating Action Button - Above Tab Bar */}
      <View style={[styles.fabContainer, { bottom: bottomPadding + 32 }]}>
        <FloatingActionButton onPress={handleFabPress} />
      </View>

      {/* Quick Add Modal */}
      <QuickAddModal 
        visible={quickAddVisible} 
        onClose={() => setQuickAddVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: colors.surface,
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  fabTouchable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
