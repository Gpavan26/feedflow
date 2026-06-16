import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, spacing } from "../theme";

const CATEGORIES = [
  "Technology",
  "Artificial Intelligence",
  "Startups",
  "Business",
  "Finance",
  "Fitness",
  "Health",
  "Education",
  "Travel",
  "Gaming",
  "Fashion",
  "Food",
  "Music",
  "Sports",
  "Art & Design",
];

export default function PreferencesScreen({ navigation }) {
  const [more, setMore] = useState([]);
  const [less, setLess] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggle = (cat, list, setList, otherList, setOtherList) => {
    if (list.includes(cat)) {
      setList(list.filter((c) => c !== cat));
    } else {
      setList([...list, cat]);
      if (otherList.includes(cat)) {
        setOtherList(otherList.filter((c) => c !== cat));
      }
    }
  };

  const handleSave = async () => {
    if (more.length === 0) {
      Alert.alert(
        "Select preferences",
        "Please select at least one category you want to see more of."
      );
      return;
    }
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user.id;

      // Clear existing preferences then insert fresh ones
      await supabase.from("preferences").delete().eq("user_id", userId);

      const rows = [
        ...more.map((category) => ({
          user_id: userId,
          category,
          preference_type: "more",
        })),
        ...less.map((category) => ({
          user_id: userId,
          category,
          preference_type: "less",
        })),
      ];

      const { error } = await supabase.from("preferences").insert(rows);
      if (error) throw error;

      navigation.replace("Main");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Personalize Your Feed</Text>
        <Text style={styles.subtitle}>
          Pick topics you want to see more of
        </Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={`more-${cat}`}
              style={[styles.chip, more.includes(cat) && styles.chipMore]}
              onPress={() => toggle(cat, more, setMore, less, setLess)}
            >
              <Text
                style={[
                  styles.chipText,
                  more.includes(cat) && styles.chipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.subtitle, { marginTop: spacing.xl }]}>
          Pick topics you want to see less of
        </Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={`less-${cat}`}
              style={[styles.chip, less.includes(cat) && styles.chipLess]}
              onPress={() => toggle(cat, less, setLess, more, setMore)}
            >
              <Text
                style={[
                  styles.chipText,
                  less.includes(cat) && styles.chipTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Saving..." : "Continue"}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginRight: 8,
    marginBottom: 8,
  },
  chipMore: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipLess: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: { color: colors.textMuted, fontSize: 14 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  button: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
