import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    icon: "📸",
    title: "Connect Your Instagram",
    description:
      "Securely link your Instagram account to get started with FeedFlow.",
  },
  {
    icon: "🎯",
    title: "Choose What You Love",
    description:
      "Select topics you want to see more of — and ones you'd rather avoid.",
  },
  {
    icon: "⚡",
    title: "Activate Personalization",
    description:
      "Turn on automation and let FeedFlow work in the background for you.",
  },
  {
    icon: "📈",
    title: "Improve Over Time",
    description:
      "Your feed gets more relevant every day, with full transparency into what's happening.",
  },
];

export default function OnboardingScreen({ navigation, onDone }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      onDone();
      navigation.replace("Auth");
    }
  };

  const skip = () => {
    onDone();
    navigation.replace("Auth");
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.skip} onPress={skip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>
          {index === SLIDES.length - 1 ? "Get Started" : "Next"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  skip: { alignSelf: "flex-end", padding: spacing.lg },
  skipText: { color: colors.textMuted, fontSize: 16 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  icon: { fontSize: 72, marginBottom: spacing.lg },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: colors.primary, width: 24 },
  button: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
