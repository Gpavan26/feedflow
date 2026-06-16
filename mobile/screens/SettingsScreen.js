import React, { useState, useEffect } from "react";
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

function Row({ label, value, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>
        {label}
      </Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [preferences, setPreferences] = useState({ more: [], less: [] });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user.email);

      const { data: prefs } = await supabase
        .from("preferences")
        .select("*")
        .eq("user_id", userData.user.id);

      setPreferences({
        more: (prefs || []).filter((p) => p.preference_type === "more").map((p) => p.category),
        less: (prefs || []).filter((p) => p.preference_type === "less").map((p) => p.category),
      });
    })();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleEditPreferences = () => {
    navigation.getParent()?.navigate("Preferences");
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and stop all automation. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            Alert.alert("Account deletion requested", "Please contact support to complete deletion.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionLabel}>Profile</Text>
        <View style={styles.card}>
          <Row label="Email" value={email} />
        </View>

        <Text style={styles.sectionLabel}>Content Preferences</Text>
        <View style={styles.card}>
          <Text style={styles.prefText}>
            More: {preferences.more.join(", ") || "None set"}
          </Text>
          <Text style={styles.prefText}>
            Less: {preferences.less.join(", ") || "None set"}
          </Text>
          <Row label="Edit Preferences" onPress={handleEditPreferences} />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Row label="Privacy Policy" onPress={() => {}} />
          <Row label="Sign Out" onPress={handleSignOut} />
          <Row label="Delete Account" onPress={handleDeleteAccount} danger />
        </View>
      </ScrollView>
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
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.text, fontSize: 15 },
  rowValue: { color: colors.textMuted, fontSize: 14 },
  prefText: { color: colors.textMuted, fontSize: 14, marginBottom: 8 },
});
