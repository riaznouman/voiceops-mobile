import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetInvoiceQuery,
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

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: invoice, isLoading, isError, refetch } = useGetInvoiceQuery(
    id ?? "",
    { skip: !id }
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (isError || !invoice) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load invoice.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.DRAFT;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.refNumber}>{invoice.referenceNumber}</Text>
          <View style={[styles.badge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.badgeText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Customer / Work Order */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Customer</Text>
          <Text style={styles.cardPrimary}>{invoice.customer?.name ?? "—"}</Text>
          {invoice.workOrder?.referenceNumber && (
            <Text style={styles.cardSecondary}>
              Work order: {invoice.workOrder.referenceNumber}
            </Text>
          )}
        </View>

        {/* Dates */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dates</Text>
          <View style={styles.dateRow}>
            <Text style={styles.cardSecondary}>Issued</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.issueDate)}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.cardSecondary}>Due</Text>
            <Text style={styles.dateValue}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Line Items</Text>
          {(invoice.lineItems ?? []).map((item, idx) => (
            <View key={item.id ?? idx} style={styles.lineItemRow}>
              <View style={styles.lineItemLeft}>
                <Text style={styles.lineItemDesc}>{item.description}</Text>
                <Text style={styles.lineItemQty}>
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.lineItemTotal}>
                {formatCurrency(item.quantity * item.unitPrice)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST (10%)</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.gst)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowGrand]}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {!!invoice.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.cardSecondary}>{invoice.notes}</Text>
          </View>
        )}
      </ScrollView>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, color: "#2563EB" },
  headerCenter: { flex: 1, alignItems: "center", gap: 6 },
  refNumber: { fontSize: 16, fontWeight: "700", color: "#111827" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "600" },

  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },

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

  dateRow: { flexDirection: "row", justifyContent: "space-between" },
  dateValue: { fontSize: 13, fontWeight: "600", color: "#374151" },

  lineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  lineItemLeft: { flex: 1, marginRight: 12 },
  lineItemDesc: { fontSize: 14, color: "#111827" },
  lineItemQty: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  lineItemTotal: { fontSize: 14, fontWeight: "600", color: "#111827" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 4,
    paddingTop: 8,
  },
  totalLabel: { fontSize: 14, color: "#6B7280" },
  totalValue: { fontSize: 14, color: "#374151" },
  grandLabel: { fontSize: 16, fontWeight: "700", color: "#111827" },
  grandValue: { fontSize: 16, fontWeight: "700", color: "#111827" },
});
