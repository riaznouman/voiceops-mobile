import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  useGetJobQuery,
  useUpdateJobStatusMutation,
  useGetJobNotesQuery,
  useAddJobNoteMutation,
  useGetJobPhotosQuery,
  useUploadJobPhotoMutation,
  useGetJobActivityQuery,
  JobStatus,
  JobDetail,
  Note,
  Photo,
  ActivityEntry,
} from "../../../src/features/jobs/jobsApi";
import * as ImagePicker from "expo-image-picker";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - 8) / 3;

const STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  EN_ROUTE: { label: "En Route", color: "#1D4ED8", bg: "#DBEAFE" },
  ON_SITE: { label: "On Site", color: "#4338CA", bg: "#E0E7FF" },
  IN_PROGRESS: { label: "In Progress", color: "#6D28D9", bg: "#EDE9FE" },
  COMPLETED: { label: "Completed", color: "#047857", bg: "#D1FAE5" },
  CANCELLED: { label: "Cancelled", color: "#B91C1C", bg: "#FEE2E2" },
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#9CA3AF",
  NORMAL: "#6B7280",
  HIGH: "#F59E0B",
  URGENT: "#EF4444",
};

const STATUS_TRANSITIONS: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  PENDING: { label: "Start route", next: "EN_ROUTE" },
  EN_ROUTE: { label: "Arrived on site", next: "ON_SITE" },
  ON_SITE: { label: "Start work", next: "IN_PROGRESS" },
  IN_PROGRESS: { label: "Mark complete", next: "COMPLETED" },
};

const TABS = ["Overview", "Notes", "Photos", "Activity"] as const;
type Tab = (typeof TABS)[number];

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [noteText, setNoteText] = useState("");
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const {
    data: job,
    isLoading: jobLoading,
    isError: jobError,
    refetch: refetchJob,
  } = useGetJobQuery(id ?? "", { skip: !id });

  const {
    data: notes = [],
    isLoading: notesLoading,
    refetch: refetchNotes,
  } = useGetJobNotesQuery(id ?? "", { skip: !id });

  const {
    data: photos = [],
    isLoading: photosLoading,
    refetch: refetchPhotos,
  } = useGetJobPhotosQuery(id ?? "", { skip: !id });

  const {
    data: activity = [],
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useGetJobActivityQuery(id ?? "", { skip: !id });

  const [updateStatus, { isLoading: statusUpdating }] = useUpdateJobStatusMutation();
  const [addNote, { isLoading: noteSubmitting }] = useAddJobNoteMutation();
  const [uploadPhoto] = useUploadJobPhotoMutation();

  const isRefreshing =
    !jobLoading && (notesLoading || photosLoading || activityLoading);

  function onRefresh() {
    refetchJob();
    refetchNotes();
    refetchPhotos();
    refetchActivity();
  }

  async function handleStatusTransition(next: JobStatus, label: string) {
    Alert.alert(
      "Confirm",
      `Change status to "${STATUS_CONFIG[next].label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateStatus({ id: id!, status: next }).unwrap();
            } catch {
              Alert.alert("Error", "Could not update status. Please try again.");
            }
          },
        },
      ]
    );
  }

  async function handleCancelJob() {
    Alert.alert(
      "Cancel Job",
      "Are you sure you want to cancel this job?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await updateStatus({ id: id!, status: "CANCELLED" }).unwrap();
            } catch {
              Alert.alert("Error", "Could not cancel job. Please try again.");
            }
          },
        },
      ]
    );
  }

  async function handleAddNote() {
    const content = noteText.trim();
    if (!content) return;
    try {
      await addNote({ workOrderId: id!, content }).unwrap();
      setNoteText("");
    } catch {
      Alert.alert("Error", "Could not add note. Please try again.");
    }
  }

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to your photo library to upload photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setUploadProgress(true);
      try {
        await uploadPhoto({
          workOrderId: id!,
          uri: asset.uri,
          name: asset.fileName ?? `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
        }).unwrap();
      } catch {
        Alert.alert("Error", "Could not upload photo. Please try again.");
      } finally {
        setUploadProgress(false);
      }
    }
  }

  if (jobLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (jobError || !job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load job details.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetchJob()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[job.status];
  const priorityColor = PRIORITY_COLOR[job.priority] ?? PRIORITY_COLOR.NORMAL;
  const transition = STATUS_TRANSITIONS[job.status];
  const canCancel =
    job.status !== "COMPLETED" && job.status !== "CANCELLED";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.refNumber} numberOfLines={1}>
            {job.referenceNumber}
          </Text>
          <View style={styles.headerBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusBadgeText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Segmented tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
            colors={["#2563EB"]}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "Overview" && (
          <OverviewTab
            job={job}
            transition={transition}
            canCancel={canCancel}
            statusUpdating={statusUpdating}
            onTransition={handleStatusTransition}
            onCancel={handleCancelJob}
          />
        )}

        {activeTab === "Notes" && (
          <NotesTab
            notes={notes}
            loading={notesLoading}
            noteText={noteText}
            onNoteChange={setNoteText}
            onSubmit={handleAddNote}
            submitting={noteSubmitting}
          />
        )}

        {activeTab === "Photos" && (
          <PhotosTab
            photos={photos}
            loading={photosLoading}
            uploading={uploadProgress}
            onAddPhoto={handlePickPhoto}
            onPhotoPress={(uri) => setViewerUri(uri)}
          />
        )}

        {activeTab === "Activity" && (
          <ActivityTab activity={activity} loading={activityLoading} />
        )}
      </ScrollView>

      {/* Full-screen photo viewer */}
      <Modal visible={!!viewerUri} transparent animationType="fade">
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerUri(null)}
          >
            <Text style={styles.viewerCloseText}>✕</Text>
          </TouchableOpacity>
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  job,
  transition,
  canCancel,
  statusUpdating,
  onTransition,
  onCancel,
}: {
  job: JobDetail;
  transition: { label: string; next: JobStatus } | undefined;
  canCancel: boolean;
  statusUpdating: boolean;
  onTransition: (next: JobStatus, label: string) => void;
  onCancel: () => void;
}) {

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.address)}`;

  return (
    <View style={styles.section}>
      {/* Customer block */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        <Text style={styles.cardPrimary}>{job.customer.name}</Text>
        {!!job.customer.phone && (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${job.customer.phone}`)}>
            <Text style={styles.linkText}>{job.customer.phone}</Text>
          </TouchableOpacity>
        )}
        {!!job.customer.email && (
          <Text style={styles.cardSecondary}>{job.customer.email}</Text>
        )}
      </View>

      {/* Address block */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Address</Text>
        <Text style={styles.cardPrimary}>{job.address || "—"}</Text>
        {!!job.address && (
          <TouchableOpacity
            style={styles.mapsBtn}
            onPress={() => Linking.openURL(mapsUrl)}
          >
            <Text style={styles.mapsBtnText}>Open in Maps</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Service block */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Service</Text>
        <Text style={styles.cardPrimary}>{job.service.name}</Text>
        <Text style={styles.cardSecondary}>
          Scheduled: {formatDateTime(job.scheduledAt)}
        </Text>
        <Text style={styles.cardSecondary}>Priority: {job.priority}</Text>
      </View>

      {/* Technician block */}
      {job.technician && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Technician</Text>
          <Text style={styles.cardPrimary}>{job.technician.name}</Text>
        </View>
      )}

      {/* Status transition buttons */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Actions</Text>
        {transition && (
          <TouchableOpacity
            style={[styles.primaryBtn, statusUpdating && styles.btnDisabled]}
            onPress={() => onTransition(transition.next, transition.label)}
            disabled={statusUpdating}
          >
            {statusUpdating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>{transition.label}</Text>
            )}
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Cancel job</Text>
          </TouchableOpacity>
        )}
        {job.status === "COMPLETED" && (
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() =>
              router.push(
                `/invoices/new?workOrderId=${job.id}&customerId=${job.customer.id}`
              )
            }
          >
            <Text style={styles.invoiceBtnText}>Create Invoice</Text>
          </TouchableOpacity>
        )}
        {job.status === "COMPLETED" && (
          <Text style={styles.completedNote}>This job is complete.</Text>
        )}
        {job.status === "CANCELLED" && (
          <Text style={styles.cancelledNote}>This job has been cancelled.</Text>
        )}
      </View>
    </View>
  );
}

// ── Notes tab ─────────────────────────────────────────────────────────────────

function NotesTab({
  notes,
  loading,
  noteText,
  onNoteChange,
  onSubmit,
  submitting,
}: {
  notes: Note[];
  loading: boolean;
  noteText: string;
  onNoteChange: (t: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <View style={styles.section}>
      {/* Add note */}
      <View style={styles.card}>
        <TextInput
          style={styles.noteInput}
          placeholder="Write a note…"
          placeholderTextColor="#9CA3AF"
          multiline
          value={noteText}
          onChangeText={onNoteChange}
        />
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (!noteText.trim() || submitting) && styles.btnDisabled,
          ]}
          onPress={onSubmit}
          disabled={!noteText.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Notes list */}
      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
      ) : notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No notes yet.</Text>
        </View>
      ) : (
        [...notes]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .map((note) => (
            <View key={note.id} style={styles.noteCard}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteAuthor}>{note.author.name}</Text>
                <Text style={styles.noteTime}>{formatRelative(note.createdAt)}</Text>
              </View>
              <Text style={styles.noteContent}>{note.content}</Text>
            </View>
          ))
      )}
    </View>
  );
}

// ── Photos tab ────────────────────────────────────────────────────────────────

function PhotosTab({
  photos,
  loading,
  uploading,
  onAddPhoto,
  onPhotoPress,
}: {
  photos: Photo[];
  loading: boolean;
  uploading: boolean;
  onAddPhoto: () => void;
  onPhotoPress: (uri: string) => void;
}) {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={[styles.primaryBtn, uploading && styles.btnDisabled]}
        onPress={onAddPhoto}
        disabled={uploading}
      >
        {uploading ? (
          <View style={styles.uploadingRow}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>Uploading…</Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>+ Add Photo</Text>
        )}
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#2563EB" style={{ marginTop: 16 }} />
      ) : photos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No photos yet.</Text>
        </View>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              onPress={() => onPhotoPress(photo.url)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: photo.url }}
                style={styles.photoThumb}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({
  activity,
  loading,
}: {
  activity: ActivityEntry[];
  loading: boolean;
}) {
  if (loading) {
    return <ActivityIndicator color="#2563EB" style={{ marginTop: 24 }} />;
  }
  if (activity.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No activity recorded yet.</Text>
      </View>
    );
  }

  const sorted = [...activity].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <View style={styles.section}>
      {sorted.map((entry, idx) => (
        <View key={entry.id} style={styles.timelineItem}>
          <View style={styles.timelineDotCol}>
            <View style={styles.timelineDot} />
            {idx < sorted.length - 1 && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineAction}>{entry.action}</Text>
            <Text style={styles.timelineMeta}>
              {entry.actor.name} · {formatRelative(entry.createdAt)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
  },
  errorText: { fontSize: 15, color: "#EF4444", marginBottom: 16, textAlign: "center" },
  retryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, color: "#2563EB" },
  headerCenter: { flex: 1, alignItems: "center" },
  refNumber: { fontSize: 16, fontWeight: "700", color: "#111827" },
  headerBadgeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 8 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "600" },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563EB",
  },
  tabText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
  tabTextActive: { color: "#2563EB", fontWeight: "700" },

  // Body
  body: { flex: 1 },
  bodyContent: { paddingBottom: 40 },
  section: { padding: 16, gap: 12 },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  cardPrimary: { fontSize: 15, fontWeight: "600", color: "#111827" },
  cardSecondary: { fontSize: 13, color: "#6B7280" },
  linkText: { fontSize: 14, color: "#2563EB" },

  // Maps button
  mapsBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  mapsBtnText: { color: "#1D4ED8", fontSize: 13, fontWeight: "600" },

  // Primary button
  primaryBtn: {
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },

  // Cancel link
  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelLinkText: { color: "#EF4444", fontSize: 14 },

  // Invoice button
  invoiceBtn: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  invoiceBtnText: { color: "#047857", fontSize: 15, fontWeight: "600" },

  completedNote: { fontSize: 13, color: "#047857", textAlign: "center" },
  cancelledNote: { fontSize: 13, color: "#B91C1C", textAlign: "center" },

  // Notes
  noteInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: "#111827",
    textAlignVertical: "top",
  },
  noteCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 14,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  noteAuthor: { fontSize: 13, fontWeight: "600", color: "#374151" },
  noteTime: { fontSize: 12, color: "#9CA3AF" },
  noteContent: { fontSize: 14, color: "#374151", lineHeight: 20 },

  // Photos
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 12,
  },
  photoThumb: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  uploadingRow: { flexDirection: "row", alignItems: "center" },

  // Activity timeline
  timelineItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  timelineDotCol: {
    width: 24,
    alignItems: "center",
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    marginTop: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#DBEAFE",
    marginTop: 2,
    minHeight: 24,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
    paddingBottom: 20,
  },
  timelineAction: { fontSize: 14, color: "#111827", fontWeight: "500" },
  timelineMeta: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },

  // Empty / viewer
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#9CA3AF" },

  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCloseText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
