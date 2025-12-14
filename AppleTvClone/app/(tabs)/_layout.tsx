import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Tabs, router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          position: 'absolute',
          shadowOpacity: 0,
        },
        tabBarBackground: () => null,
      }}
      sceneContainerStyle={{ backgroundColor: '#05050a' }}
      tabBar={(props) => <PillTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="appletv"
        options={{
          title: 'Apple TV',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="tv.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="rectangle.stack.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const activeColor = '#3aa9ff';
  const inactiveColor = 'rgba(235, 235, 245, 0.82)';
  const pillColor = 'rgba(0, 0, 0, 0.75)';
  const searchBg = 'rgba(0, 0, 0, 0.75)';
  const searchIcon = '#f3f3f7';

  useEffect(() => {
    const currentRoute = state.routes[state.index];
    const layout = tabLayouts[currentRoute.key];
    if (!layout) return;

    Animated.spring(indicatorX, {
      toValue: layout.x,
      useNativeDriver: false,
      bounciness: 8,
      speed: 18,
    }).start();
    Animated.spring(indicatorWidth, {
      toValue: layout.width,
      useNativeDriver: false,
      bounciness: 8,
      speed: 18,
    }).start();
  }, [indicatorWidth, indicatorX, state.index, state.routes, tabLayouts]);

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.tabRow}>
        <View style={[styles.pill, { backgroundColor: pillColor }]}>
          {tabLayouts[state.routes[state.index]?.key] ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activeIndicator,
                {
                  width: indicatorWidth,
                  transform: [{ translateX: indicatorX }],
                },
              ]}
            />
          ) : null}
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                  ? options.title
                  : route.name;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const icon =
              options.tabBarIcon?.({
                color: isFocused ? activeColor : inactiveColor,
                size: 26,
                focused: isFocused,
              }) ?? null;

            return (
              <Pressable
                key={route.key}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  setTabLayouts((prev) => {
                    const current = prev[route.key];
                    if (current && current.x === x && current.width === width) {
                      return prev;
                    }
                    return { ...prev, [route.key]: { x, width } };
                  });
                }}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                style={[styles.tabButton]}>
                <View style={styles.iconWrapper}>{icon}</View>
                <Text style={[styles.tabLabel, { color: isFocused ? activeColor : '#f5f5f7' }]}>
                  {label as string}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/search');
          }}
          style={[styles.searchButton, { backgroundColor: searchBg }]}>
          <IconSymbol name="magnifyingglass" size={24} color={searchIcon} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'transparent',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 24,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 28,
    gap: 2,
  },
  iconWrapper: {
    marginBottom: 0,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
});
