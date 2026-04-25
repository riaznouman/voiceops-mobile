import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../src/store";
import { useGetJobsQuery, Job } from "../../../src/features/jobs/jobsApi";

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function isToday(iso: string): boolean {
  return startOfDay(new Date(iso)) === startOfDay(new Date());
}

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardScreen() {
  const userName = useSelector((s: RootState) => s.auth.user?.name);
  const firstName = userName?.split(/\s+/)[0] ?? "";
  const today = new Date();

  const { data, isLoading, isError, refetch } = useGetJobsQuery();
  const jobs: Job[] = data ?? [];

  const todayCount = jobs.filter((j) => isToday(j.scheduledAt)).length;
  const inProgressCount = jobs.filter((j) => j.status === "IN_PROGRESS").length;
  const completedTodayCount = jobs.filter(
    (j) => j.status === "COMPLETED" && isToday(j.scheduledAt)
  ).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good morning{firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.date}>{formatLongDate(today)}</Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard label="Today" value={todayCount} />
        <StatCard label="In Progress" value={inProgressCount} />
        <StatCard label="Completed today" value={completedTodayCount} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Could not load dashboard.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#111827" },
  date: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    alignItems: "flex-start",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});
