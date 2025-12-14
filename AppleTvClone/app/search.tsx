import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 18);

  return (
    <View style={styles.screen}>
      <View style={styles.content} />

      <View style={[styles.searchBarContainer, { paddingBottom: bottomInset }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.homeButton,
            pressed ? { transform: [{ scale: 0.97 }] } : null,
          ]}>
          <IconSymbol name="house.fill" size={26} color="#f4f7fb" />
        </Pressable>

        <View style={styles.searchPill}>
          <IconSymbol name="magnifyingglass" size={26} color="#cfd2d9" />
          <Text style={styles.searchPlaceholder}>Shows, Movies and More</Text>
          <IconSymbol name="mic.fill" size={24} color="#cfd2d9" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05050a',
  },
  content: {
    flex: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  homeButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 20, 22, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  searchPill: {
    flex: 1,
    height: 58,
    borderRadius: 30,
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  searchPlaceholder: {
    flex: 1,
    color: '#cfd2d9',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
