import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

type HeroSlide = {
  title: string;
  tag: string;
  meta: string;
  cta: string;
  price: string;
  image: ImageSourcePropType;
};

const slides: HeroSlide[] = [
  {
    title: 'Free Guy',
    tag: 'Fun Flick',
    meta: 'Movie · Action · Comedy · Sci‑Fi',
    cta: 'Watch Now',
    price: 'Rent or buy',
    image: require('../../assets/posters/prehistoric-planet.jpg'),
  },
  {
    title: 'Violent Night',
    tag: 'Holiday Hit',
    meta: 'Movie · Action · Comedy',
    cta: 'Watch Now',
    price: 'Rent or buy',
    image: require('../../assets/posters/foundation.jpg'),
  },
  {
    title: 'Top Gun: Maverick',
    tag: 'Blockbuster',
    meta: 'Movie · Action · Drama',
    cta: 'Watch in 4K HDR',
    price: 'Rent or buy',
    image: require('../../assets/posters/masters.jpg'),
  },
];

const continueWatching = [
  {
    title: 'Hijack',
    meta: 'Series · Thriller',
    progress: 0.42,
    image: 'https://image.tmdb.org/t/p/w500/8Y43POKjjKDGI9MH89NW0NAzzp8.jpg',
  },
  {
    title: 'Lessons in Chemistry',
    meta: 'Series · Drama',
    progress: 0.35,
    image: 'https://image.tmdb.org/t/p/w500/jOqxKIOC92BVyinYO1Fm73XY7Tc.jpg',
  },
  {
    title: 'Monarch: Legacy',
    meta: 'Series · Action',
    progress: 0.12,
    image: 'https://image.tmdb.org/t/p/w500/4n8QNNdk4BOX9Dslfbz5Dy6j1HK.jpg',
  },
  {
    title: 'Severance',
    meta: 'Series · Mystery',
    progress: 0.55,
    image: 'https://image.tmdb.org/t/p/w500/9X7YweCJw3q8Mcf6GadxReFEksM.jpg',
  },
  {
    title: 'Slow Horses',
    meta: 'Series · Espionage',
    progress: 0.3,
    image: 'https://image.tmdb.org/t/p/w500/zfkPPEsJwM0Sg3Lgr30aiLVHtM7.jpg',
  },
];

const topShows = [
  {
    title: 'Severance',
    meta: 'Series · Mystery',
    image: 'https://image.tmdb.org/t/p/w500/9X7YweCJw3q8Mcf6GadxReFEksM.jpg',
  },
  {
    title: 'Shrinking',
    meta: 'Series · Comedy',
    image: 'https://image.tmdb.org/t/p/w500/7ImnZ2p4GaPz2XuYpG1ccC1MFBp.jpg',
  },
  {
    title: 'Silo',
    meta: 'Series · Thriller',
    image: 'https://image.tmdb.org/t/p/w500/zfkPPEsJwM0Sg3Lgr30aiLVHtM7.jpg',
  },
  {
    title: 'For All Mankind',
    meta: 'Series · Sci‑Fi',
    image: 'https://image.tmdb.org/t/p/w500/5yeFwoeS0nOTmy4pQ6Yo4FRAjQK.jpg',
  },
  {
    title: 'Invasion',
    meta: 'Series · Sci‑Fi',
    image: 'https://image.tmdb.org/t/p/w500/4F2QwCOYHJJjecSvdOjStuVLk9t.jpg',
  },
];

const topMovies = [
  {
    title: 'Argylle',
    meta: 'Movie · Action',
    image: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
  },
  {
    title: 'CODA',
    meta: 'Movie · Drama',
    image: 'https://image.tmdb.org/t/p/w500/4n8QNNdk4BOX9Dslfbz5Dy6j1HK.jpg',
  },
  {
    title: 'Spirited',
    meta: 'Movie · Comedy',
    image: 'https://image.tmdb.org/t/p/w500/7ImnZ2p4GaPz2XuYpG1ccC1MFBp.jpg',
  },
  {
    title: 'Greyhound',
    meta: 'Movie · War · Action',
    image: 'https://image.tmdb.org/t/p/w500/kjMbDciooTbJPofVXgAoFjfX8Of.jpg',
  },
  {
    title: 'Napoleon',
    meta: 'Movie · Drama',
    image: 'https://image.tmdb.org/t/p/w500/jE5o7y9K6pZtWNNMEw3IdpHuncR.jpg',
  },
];

export default function AppleTVScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1 % slides.length);
  const activeIndexRef = useRef(0);
  const fade = useRef(new Animated.Value(0)).current;
  const touchStartX = useRef<number | null>(null);
  const isAnimating = useRef(false);
  const [showBlur, setShowBlur] = useState(false);

  const goToSlide = useCallback(
    (target: number) => {
      if (target === activeIndexRef.current || isAnimating.current) return;
      const clamped = ((target % slides.length) + slides.length) % slides.length;
      setNextIndex(clamped);
      fade.stopAnimation();
      fade.setValue(0);
      isAnimating.current = true;
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start(() => {
        activeIndexRef.current = clamped;
        setActiveIndex(clamped);
        setNextIndex((clamped + 1) % slides.length);
        fade.setValue(0);
        isAnimating.current = false;
      });
    },
    [fade],
  );

  useEffect(() => {
    const id = setInterval(() => {
      const next = (activeIndexRef.current + 1) % slides.length;
      goToSlide(next);
    }, 7000);

    return () => clearInterval(id);
  }, [goToSlide]);

  const currentSlide = slides[activeIndex];
  const nextSlide = slides[nextIndex];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={16}
        onScroll={(e) => setShowBlur(e.nativeEvent.contentOffset.y > 2)}>
        {showBlur ? <View style={styles.topBlur} /> : null}
        <View
          style={styles.hero}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            touchStartX.current = e.nativeEvent.pageX;
          }}
          onResponderRelease={(e) => {
            if (touchStartX.current == null) return;
            const delta = e.nativeEvent.pageX - touchStartX.current;
            touchStartX.current = null;
            if (delta > 40) {
              goToSlide(activeIndexRef.current - 1);
            } else if (delta < -40) {
              goToSlide(activeIndexRef.current + 1);
            }
          }}>
          <Image source={currentSlide.image} style={styles.heroImage} contentFit="cover" />
          <Animated.View style={[styles.heroImageOverlay, { opacity: fade }]}>
            <Image source={nextSlide.image} style={styles.heroImage} contentFit="cover" />
          </Animated.View>
          <View style={styles.heroOverlay} />

          <View style={[styles.heroHeader, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.heroTitle}>Apple TV</Text>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{currentSlide.tag}</Text>
            </View>
            <Text style={styles.showTitle}>{currentSlide.title}</Text>
            <Text style={styles.meta}>{currentSlide.meta}</Text>
            <Pressable
              onPress={() => {}}
              style={({ pressed }) => [
                styles.cta,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}>
              <Text style={styles.ctaText}>{currentSlide.cta}</Text>
            </Pressable>
            <Text style={styles.price}>{currentSlide.price}</Text>
            <View style={styles.dots}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeIndex === index ? styles.dotActive : styles.dotInactive,
                  ]}>
                  <Pressable style={StyleSheet.absoluteFill} onPress={() => goToSlide(index)} />
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.rails}>
          <Text style={styles.sectionTitle}>Continue Watching</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
            {continueWatching.map((item) => (
              <View key={item.title} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.meta}</Text>
                <View pointerEvents="none" style={styles.progressOverlay}>
                  <View style={styles.progressTrackOverlay}>
                    <View
                      style={[
                        styles.progressFillOverlay,
                        { width: `${Math.round((item.progress ?? 0) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Top Shows</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
            {topShows.map((item) => (
              <View key={item.title} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.meta}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.sectionTitle}>Top Movies</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
            {topMovies.map((item) => (
              <View key={item.title} style={styles.card}>
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>{item.meta}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.joinCard}>
            <Text style={styles.joinTitle}>Join Apple TV+</Text>
            <Text style={styles.joinSubtitle}>£6.99/month. Share with family. New originals weekly.</Text>
            <Pressable
              style={({ pressed }) => [
                styles.joinButton,
                pressed ? { transform: [{ scale: 0.98 }] } : null,
              ]}>
              <Text style={styles.joinButtonText}>Start Free Trial</Text>
            </Pressable>
          </View>
        </View>

      </ScrollView>
      {showBlur ? (
        <View style={[styles.topBlur, { paddingTop: insets.top }]} pointerEvents="none" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#05050a',
  },
  scrollContent: {
    paddingBottom: 140,
  },
  hero: {
    height: 580,
    justifyContent: 'space-between',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,10,0.35)',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  heroTitle: {
    color: '#f5f7fb',
    fontSize: 32,
    fontWeight: '800',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 60,
    paddingHorizontal: 20,
    paddingBottom: 0,
    gap: 10,
  },
  topBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 5,
    backgroundColor: 'rgba(5,5,10,0.55)',
  },
  tag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  tagText: {
    color: '#f4f6f9',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  showTitle: {
    color: '#f8f9fb',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  meta: {
    color: 'rgba(240, 242, 246, 0.88)',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  cta: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#f6f7fb',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  ctaText: {
    fontWeight: '800',
    fontSize: 16,
    color: '#05050a',
  },
  price: {
    color: 'rgba(240, 242, 246, 0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    alignSelf: 'center',
  },
  rails: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionTitle: {
    color: '#f4f6f9',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  railScroll: {
    gap: 12,
    paddingVertical: 8,
    paddingRight: 6,
  },
  card: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardTitle: {
    color: '#f6f7fb',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cardMeta: {
    color: 'rgba(240,242,246,0.75)',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
  },
  progressOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  progressTrackOverlay: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFillOverlay: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#3aa9ff',
  },
  joinCard: {
    marginTop: 10,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  joinTitle: {
    color: '#f6f7fb',
    fontSize: 18,
    fontWeight: '800',
  },
  joinSubtitle: {
    color: 'rgba(240,242,246,0.78)',
    fontSize: 14,
    lineHeight: 20,
  },
  joinButton: {
    marginTop: 4,
    backgroundColor: '#f6f7fb',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  joinButtonText: {
    fontWeight: '800',
    fontSize: 15,
    color: '#05050a',
  },
  rails: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionTitle: {
    color: '#f4f6f9',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  railScroll: {
    gap: 12,
    paddingVertical: 8,
    paddingRight: 6,
  },
  card: {
    width: 150,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  cardTitle: {
    color: '#f6f7fb',
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cardMeta: {
    color: 'rgba(240,242,246,0.75)',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#f6f7fb',
    width: 18,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
