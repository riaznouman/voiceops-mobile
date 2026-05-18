import { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useGetJobsQuery, Job } from "../../../src/features/jobs/jobsApi";
import { JobCard } from "../../../src/components/jobs/JobCard";

type SectionRow = { type: "section"; label: string };
type JobRow = { type: "job"; job: Job };
type Row = SectionRow | JobRow;

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function bucketFor(scheduledAt: string): "Today" | "Tomorrow" | "Upcoming" {
  const today = startOfDay(new Date());
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const day = startOfDay(new Date(scheduledAt));
  if (day === today) return "Today";
  if (day === tomorrow) return "Tomorrow";
  return "Upcoming";
}

function buildRows(jobs: Job[]): Row[] {
  const sorted = [...jobs].sort(
    (a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  const groups: Record<string, Job[]> = { Today: [], Tomorrow: [], Upcoming: [] };
  for (const j of sorted) groups[bucketFor(j.scheduledAt)].push(j);

  const rows: Row[] = [];
  (["Today", "Tomorrow", "Upcoming"] as const).forEach((label) => {
    if (groups[label].length > 0) {
      rows.push({ type: "section", label });
      groups[label].forEach((job) => rows.push({ type: "job", job }));
    }
  });
  return rows;
}

export default function JobsScreen() {
  const { data, isLoading, isFetching, isError, refetch } = useGetJobsQuery();

  const rows = useMemo(
    () => buildRows(Array.isArray(data) ? data : []),
    [data]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.centered} edges={["top"]}>
        <Text style={styles.errorText}>Could not load jobs.</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Jobs</Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, index) =>
          item.type === "section" ? `s-${item.label}` : `j-${item.job.id}-${index}`
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs yet</Text>
            <Text style={styles.emptySubtext}>
              When a manager assigns you a job it will show up here. Pull down to refresh.
            </Text>
          </View>
        }
        renderItem={({ item }) =>
          item.type === "section" ? (
            <Text style={styles.sectionHeader}>{item.label}</Text>
          ) : (
            <JobCard
              job={item.job}
              onPress={() => router.push(`/jobs/${item.job.id}`)}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexGrow: 1,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
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
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
});
