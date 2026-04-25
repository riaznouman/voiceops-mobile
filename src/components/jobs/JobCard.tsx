import { View, Text, StyleSheet, Pressable } from "react-native";
import type { Job, JobStatus, JobPriority } from "../../features/jobs/jobsApi";

type JobCardProps = {
  job: Job;
  onPress?: () => void;
};

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  assigned: { label: "Assigned", color: "#B45309", bg: "#FEF3C7" },
  en_route: { label: "En Route", color: "#1D4ED8", bg: "#DBEAFE" },
  in_progress: { label: "In Progress", color: "#6D28D9", bg: "#EDE9FE" },
  completed: { label: "Completed", color: "#047857", bg: "#D1FAE5" },
  cancelled: { label: "Cancelled", color: "#B91C1C", bg: "#FEE2E2" },
  draft: { label: "Draft", color: "#374151", bg: "#F3F4F6" },
};

const PRIORITY_COLOR: Record<JobPriority, string> = {
  low: "#9CA3AF",
  normal: "#6B7280",
  high: "#F59E0B",
  urgent: "#EF4444",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function JobCard({ job, onPress }: JobCardProps) {
  const status = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.draft;
  const priorityColor = PRIORITY_COLOR[job.priority] ?? PRIORITY_COLOR.normal;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(job.scheduledAt)}</Text>
        <View style={styles.priorityRow}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.priorityText}>{job.priority}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{job.customer.name}</Text>
      <Text style={styles.address} numberOfLines={1}>
        {job.customer.address}
      </Text>
      <Text style={styles.service}>{job.service.name}</Text>

      <View style={[styles.badge, { backgroundColor: status.bg }]}>
        <Text style={[styles.badgeText, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  service: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
