import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import {
  useGetInvoicesQuery,
  Invoice,
  InvoiceStatus,
} from "../../../src/features/invoices/invoicesApi";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  DRAFT: { label: "Draft", color: "#92400E", bg: "#FEF3C7" },
  SENT: { label: "Sent", color: "#1D4ED8", bg: "#DBEAFE" },
  PAID: { label: "Paid", color: "#047857", bg: "#D1FAE5" },
  CANCELLED: { label: "Cancelled", color: "#B91C1C", bg: "#FEE2E2" },
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `$${(amount ?? 0).toFixed(2)}`;
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.DRAFT;
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.75}
      onPress={() => router.push(`/invoices/${invoice.id}`)}
    >
      <View style={styles.rowLeft}>
        <Text style={styles.rowRef}>{invoice.referenceNumber}</Text>
        <Text style={styles.rowCustomer} numberOfLines={1}>
          {invoice.customer?.name ?? "—"}
        </Text>
        <Text style={styles.rowDate}>{formatDate(invoice.issueDate)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowTotal}>{formatCurrency(invoice.total)}</Text>
        <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[styles.badgeText, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function SkeletonRow() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%", marginTop: 6 }]} />
    </View>
  );
}

export default function InvoicesScreen() {
  const { data, isLoading, isFetching, isError, refetch } =
    useGetInvoicesQuery();

  const invoices: Invoice[] = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
        </View>
        {[1, 2, 3, 4].map((k) => (
          <SkeletonRow key={k} />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load invoices.</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => refetch()}
          activeOpacity={0.8}
        >
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
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
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No invoices yet.</Text>
            <Text style={styles.emptySubtext}>
              Create an invoice from a completed job.
            </Text>
          </View>
        }
        renderItem={({ item }) => <InvoiceRow invoice={item} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, marginRight: 12 },
  rowRef: { fontSize: 14, fontWeight: "600", color: "#111827" },
  rowCustomer: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  rowDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  rowTotal: { fontSize: 15, fontWeight: "700", color: "#111827" },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  separator: { height: 1, backgroundColor: "#F3F4F6" },

  skeleton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    width: "80%",
  },

  emptyState: {
    flex: 1,
    paddingTop: 80,
    alignItems: "center",
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#374151" },
  emptySubtext: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  errorText: {
    fontSize: 15,
    color: "#EF4444",
    marginBottom: 16,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
