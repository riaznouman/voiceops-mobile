import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "../../../src/store";
import { useGetJobsQuery, Job, JobStatus } from "../../../src/features/jobs/jobsApi";
import { JobCard } from "../../../src/components/jobs/JobCard";

const STATUS_LABEL: Record<JobStatus, string> = {
  PENDING: "Pending",
  EN_ROUTE: "En Route",
  ON_SITE: "On Site",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_BG: Record<JobStatus, string> = {
  PENDING: "#FEF3C7",
  EN_ROUTE: "#DBEAFE",
  ON_SITE: "#E0E7FF",
  IN_PROGRESS: "#EDE9FE",
  COMPLETED: "#D1FAE5",
  CANCELLED: "#FEE2E2",
};

const STATUS_FG: Record<JobStatus, string> = {
  PENDING: "#B45309",
  EN_ROUTE: "#1D4ED8",
  ON_SITE: "#4338CA",
  IN_PROGRESS: "#6D28D9",
  COMPLETED: "#047857",
  CANCELLED: "#B91C1C",
};

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

  const currentJob = jobs.find(
    (j) => j.status === "IN_PROGRESS" || j.status === "ON_SITE"
  );

  const now = Date.now();
  const upcoming = jobs
    .filter(
      (j) =>
        (j.status === "PENDING" || j.status === "EN_ROUTE") &&
        new Date(j.scheduledAt).getTime() > now
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    )
    .slice(0, 5);

  const hasNoJobs = !isLoading && !isError && jobs.length === 0;

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
      ) : hasNoJobs ? (
        <View style={styles.noJobsWrap}>
          <Text style={styles.noJobsText}>You have no jobs assigned.</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Job</Text>
            {currentJob ? (
              <View style={styles.currentCard}>
                <View
                  style={[
                    styles.currentBadge,
                    { backgroundColor: STATUS_BG[currentJob.status] },
                  ]}
                >
                  <Text
                    style={[
                      styles.currentBadgeText,
                      { color: STATUS_FG[currentJob.status] },
                    ]}
                  >
                    {STATUS_LABEL[currentJob.status]}
                  </Text>
                </View>
                <Text style={styles.currentCustomer}>
                  {currentJob.customer.name}
                </Text>
                <Text style={styles.currentAddress}>
                  {currentJob.customer.address}
                </Text>
                <Text style={styles.currentService}>
                  {currentJob.service.name}
                </Text>
                <TouchableOpacity
                  style={styles.continueBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    // TODO: navigate to job detail (Sprint 2)
                  }}
                >
                  <Text style={styles.continueText}>Continue</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No active job</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcoming.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Nothing scheduled. Enjoy the break.
                </Text>
              </View>
            ) : (
              upcoming.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onPress={() => {
                    // TODO: navigate to job detail (Sprint 2)
                  }}
                />
              ))
            )}
          </View>
        </>
      )}
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

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  currentCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 16,
  },
  currentBadge: {
    alignSelf: "stretch",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  currentBadgeText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.4 },
  currentCustomer: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  currentAddress: { fontSize: 13, color: "#6B7280", marginBottom: 6 },
  currentService: { fontSize: 14, color: "#374151", marginBottom: 12 },
  continueBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  continueText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  emptyCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#6B7280" },

  noJobsWrap: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
  },
  noJobsText: { fontSize: 15, color: "#6B7280", textAlign: "center" },
});
