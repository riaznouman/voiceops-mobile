import { baseApi } from "../../services/api";

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";

export type InvoiceLineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type Invoice = {
  id: string;
  referenceNumber: string;
  status: InvoiceStatus;
  workOrderId: string;
  customerId: string;
  customer?: { id: string; name: string };
  workOrder?: { id: string; referenceNumber: string };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  gst: number;
  total: number;
  notes?: string;
  issueDate: string;
  dueDate: string;
  createdAt: string;
};

export type CreateInvoicePayload = {
  workOrderId: string;
  customerId: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes?: string;
  issueDate: string;
  dueDate: string;
};

function pickOne<T>(resp: unknown): T {
  const r = resp as { data?: T } | T;
  return ((r as { data?: T }).data ?? r) as T;
}

function pickArray<T>(resp: unknown): T[] {
  if (Array.isArray(resp)) return resp as T[];
  const r = resp as { data?: unknown } | null;
  if (Array.isArray((r as { data?: unknown })?.data)) return (r as { data: T[] }).data;
  return [];
}

export const invoicesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query<Invoice[], void>({
      query: () => "/invoices?technicianId=me",
      transformResponse: (resp: unknown): Invoice[] => pickArray<Invoice>(resp),
      providesTags: ["Invoice"],
    }),

    getInvoice: builder.query<Invoice, string>({
      query: (id) => `/invoices/${id}`,
      transformResponse: (resp: unknown): Invoice => pickOne<Invoice>(resp),
      providesTags: (_r, _e, id) => [{ type: "Invoice", id }],
    }),

    createInvoice: builder.mutation<Invoice, CreateInvoicePayload>({
      query: (body) => ({
        url: "/invoices",
        method: "POST",
        body,
      }),
      transformResponse: (resp: unknown): Invoice => pickOne<Invoice>(resp),
      invalidatesTags: ["Invoice"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
} = invoicesApi;
