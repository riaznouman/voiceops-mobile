import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../../src/store";
import { useGetMeQuery } from "../../../src/features/auth/authApi";
import { logout } from "../../../src/features/auth/authSlice";
import { storage } from "../../../src/services/storage";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function titleCase(role: string): string {
  if (!role) return "";
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

type InfoRowProps = {
  label: string;
  value: string;
  hint?: string;
  last?: boolean;
};

function InfoRow({ label, value, hint, last }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoValueRow}>
        <Text style={styles.infoValue}>{value}</Text>
        {hint ? <Text style={styles.infoHint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, isLoading, isError, refetch } = useGetMeQuery();

  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          dispatch(logout());
          await storage.removeToken();
          await storage.removeUser();
        },
      },
    ]);
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load profile.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(data.name)}</Text>
        </View>
        <Text style={styles.name}>{data.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>{titleCase(data.role)}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <InfoRow label="Email" value={data.email} />
        <InfoRow
          label="Phone"
          value={data.phone ?? "Not set"}
          hint={data.phone ? undefined : "Add"}
        />
        <InfoRow
          label="Member since"
          value={formatJoinDate(data.createdAt)}
          last
        />
      </View>

      <TouchableOpacity style={styles.editButton} activeOpacity={0.8}>
        {/* TODO Sprint 2 — wire to edit profile form */}
        <Text style={styles.editButtonText}>Edit profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { paddingHorizontal: 16, paddingVertical: 16, gap: 16 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 15,
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  headerCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 26, fontWeight: "700" },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { color: "#1D4ED8", fontSize: 12, fontWeight: "600" },

  infoSection: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  infoRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: { fontSize: 15, color: "#111827" },
  infoHint: { fontSize: 13, color: "#2563EB", fontWeight: "600" },

  editButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  editButtonText: { color: "#2563EB", fontSize: 15, fontWeight: "600" },
  signOutButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
});
