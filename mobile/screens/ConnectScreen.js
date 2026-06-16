import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { colors, spacing } from "../theme";

const STATUS_CONFIG = {
  connected: { label: "Connected", color: colors.success, dot: "🟢" },
  disconnected: { label: "Disconnected", color: colors.textMuted, dot: "⚪" },
  connecting: { label: "Connection In Progress", color: colors.warning, dot: "🟡" },
};

export default function ConnectScreen() {
  const [connection, setConnection] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchConnection = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;
    const { data, error } = await supabase
      .from("instagram_connections")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (!error) setConnection(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchConnection();

    const channel = supabase
      .channel("ig-connection-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "instagram_connections" },
        (payload) => setConnection(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const handleConnect = async () => {
    if (!username || !password) {
      Alert.alert("Missing fields", "Enter your Instagram username and password.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user.id;

      // Mark as "connecting" immediately
      await supabase
        .from("instagram_connections")
        .update({ status: "connecting", ig_username: username, updated_at: new Date() })
        .eq("user_id", userId);

      // NOTE: In production, credentials should be sent to a secure backend
      // endpoint that establishes the session, never stored client-side in
      // plaintext. For this prototype, we store a reference and let the
      // automation worker handle actual login using its own configured
      // credentials (see automation-worker README).
      const { error } = await supabase
        .from("instagram_connections")
        .update({
          status: "connected",
          ig_username: username,
          last_sync: new Date(),
          updated_at: new Date(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      Alert.alert("Connected", "Your Instagram account is now connected.");
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user.id;
    await supabase
      .from("instagram_connections")
      .update({ status: "disconnected", last_sync: null, updated_at: new Date() })
      .eq("user_id", userId);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const status = connection?.status || "disconnected";
  const config = STATUS_CONFIG[status];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Instagram Connection</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusDot}>{config.dot}</Text>
          <View>
            <Text style={[styles.statusLabel, { color: config.color }]}>
              {config.label}
            </Text>
            {connection?.ig_username && (
              <Text style={styles.statusSub}>@{connection.ig_username}</Text>
            )}
            <Text style={styles.statusSub}>
              Last Sync:{" "}
              {connection?.last_sync
                ? new Date(connection.last_sync).toLocaleString()
                : "Never"}
            </Text>
          </View>
        </View>

        {status !== "connected" ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Instagram Username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              style={styles.input}
              placeholder="Instagram Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.button}
              onPress={handleConnect}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? "Connecting..." : "Connect Instagram"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.dangerButton]}
            onPress={handleDisconnect}
          >
            <Text style={styles.buttonText}>Disconnect</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: 12,
  },
  statusDot: { fontSize: 24 },
  statusLabel: { fontSize: 16, fontWeight: "700" },
  statusSub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  input: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  dangerButton: { backgroundColor: colors.danger },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
