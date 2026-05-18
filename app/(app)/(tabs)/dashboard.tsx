import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "../../../src/store";
import {
  useGetTechDashboardQuery,
  TechDashboard,
} from "../../../src/features/dashboard/dashboardApi";

const STATUS_BG: Record<string, string> = {
  PENDING: "#FEF3C7",
  EN_ROUTE: "#DBEAFE",
  ON_SITE: "#E0E7FF",
  IN_PROGRESS: "#EDE9FE",
  COMPLETED: "#D1FAE5",
  CANCELLED: "#FEE2E2",
};

const STATUS_FG: Record<string, string> = {
  PENDING: "#B45309",
  EN_ROUTE: "#1D4ED8",
  ON_SITE: "#4338CA",
  IN_PROGRESS: "#6D28D9",
  COMPLETED: "#047857",
  CANCELLED: "#B91C1C",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHours(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}

export default function DashboardScreen() {
  const userName = useSelector((s: RootState) => s.auth.user?.name);
  const firstName = userName?.split(/\s+/)[0] ?? "";
  const today = new Date();

  const { data, isLoading, isFetching, isError, refetch } =
    useGetTechDashboardQuery();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hi{firstName ? `, ${firstName}` : ""}
        </Text>
        <Text style={styles.date}>{formatLongDate(today)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : isError || !data ? (
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
        ) : (
          <DashboardContent data={data} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DashboardContent({ data }: { data: TechDashboard }) {
  const ns = data.nextStop;
  return (
    <>
      <View style={styles.statsGrid}>
        <StatCard label="Today's Jobs" value={String(data.todayJobs)} />
        <StatCard label="Active" value={String(data.activeJobs)} />
        <StatCard label="Completed today" value={String(data.completedToday)} />
        <StatCard label="Hours this week" value={formatHours(data.hoursThisWeek)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next stop</Text>
        {ns ? (
          <TouchableOpacity
            style={styles.nextCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/jobs/${ns.id}`)}
          >
            <View style={styles.nextHeaderRow}>
              <Text style={styles.nextRef}>{ns.referenceNumber}</Text>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      STATUS_BG[ns.status] ?? STATUS_BG.PENDING,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color: STATUS_FG[ns.status] ?? STATUS_FG.PENDING,
                    },
                  ]}
                >
                  {STATUS_LABEL[ns.status] ?? ns.status}
                </Text>
              </View>
            </View>

            <Text style={styles.nextTime}>{formatTime(ns.scheduledAt)}</Text>
            <Text style={styles.nextCustomer}>{ns.customerName}</Text>
            {!!ns.address && (
              <Text style={styles.nextAddress}>{ns.address}</Text>
            )}

            {!!ns.address && (
              <TouchableOpacity
                style={styles.mapsBtn}
                activeOpacity={0.8}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      ns.address
                    )}`
                  )
                }
              >
                <Text style={styles.mapsBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing scheduled. Enjoy the break.</Text>
          </View>
        )}
      </View>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { flexGrow: 1, paddingBottom: 32 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  greeting: { fontSize: 24, fontWeight: "700", color: "#111827" },
  date: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    minHeight: 84,
  },
  statValue: { fontSize: 28, fontWeight: "700", color: "#111827" },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
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

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  nextCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
  },
  nextHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  nextRef: { fontSize: 14, fontWeight: "700", color: "#111827" },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  nextTime: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  nextCustomer: { fontSize: 16, fontWeight: "600", color: "#111827" },
  nextAddress: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  mapsBtn: {
    marginTop: 12,
    backgroundColor: "#EFF6FF",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    alignItems: "center",
  },
  mapsBtnText: { color: "#1D4ED8", fontSize: 15, fontWeight: "600" },

  emptyCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#6B7280" },
});
