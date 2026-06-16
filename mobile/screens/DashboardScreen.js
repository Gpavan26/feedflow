import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, spacing } from "../theme";

const ACTION_ICONS = {
  like: "❤️",
  follow: "➕",
  search: "🔍",
  view: "👀",
};

export default function DashboardScreen() {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  const fetchData = async (uid) => {
    const { data: settings } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("user_id", uid)
      .single();
    setIsActive(settings?.is_active || false);

    const { data: logData } = await supabase
      .from("automation_logs")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(20);
    setLogs(logData || []);
    setLoading(false);
  };

  useEffect(() => {
    let channel;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user.id;
      setUserId(uid);
      await fetchData(uid);

      channel = supabase
        .channel("dashboard-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "automation_logs", filter: `user_id=eq.${uid}` },
          () => fetchData(uid)
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "automation_settings", filter: `user_id=eq.${uid}` },
          (payload) => setIsActive(payload.new.is_active)
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const toggleAutomation = async (value) => {
    setIsActive(value);
    await supabase
      .from("automation_settings")
      .update({ is_active: value, updated_at: new Date() })
      .eq("user_id", userId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const lastActivity = logs[0]?.created_at;
  const actionsCompleted = logs.length;
  const progress = Math.min(100, Math.round((actionsCompleted / 50) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Automation {isActive ? "Active" : "Paused"}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={toggleAutomation}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{actionsCompleted}</Text>
          <Text style={styles.statLabel}>Actions Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {lastActivity
              ? new Date(lastActivity).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </Text>
          <Text style={styles.statLabel}>Last Activity</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Personalization Progress</Text>
          <Text style={styles.progressPercent}>{progress}%</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No activity yet. Automation will begin once activated.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.logRow}>
            <Text style={styles.logIcon}>
              {ACTION_ICONS[item.action_type] || "•"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.logText}>
                {item.action_type.charAt(0).toUpperCase() +
                  item.action_type.slice(1)}
                {item.category ? ` · ${item.category}` : ""}
              </Text>
              {item.target && (
                <Text style={styles.logTarget}>{item.target}</Text>
              )}
            </View>
            <Text style={styles.logTime}>
              {new Date(item.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: spacing.lg },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
  },
  statValue: { color: colors.text, fontSize: 24, fontWeight: "700" },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  progressSection: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  progressLabel: { color: colors.text, fontSize: 14, fontWeight: "600" },
  progressPercent: { color: colors.primary, fontSize: 14, fontWeight: "700" },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: colors.primary },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.sm,
    marginBottom: 8,
    gap: 12,
  },
  logIcon: { fontSize: 20 },
  logText: { color: colors.text, fontSize: 14, fontWeight: "600" },
  logTarget: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  logTime: { color: colors.textMuted, fontSize: 12 },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: 14,
  },
});
