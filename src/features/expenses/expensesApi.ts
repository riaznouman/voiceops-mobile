import { baseApi } from "../../services/api";

export type Expense = {
  id: string;
  userId: string;
  workOrderId: string | null;
  workOrder?: { id: string; referenceNumber: string };
  date: string;
  description: string;
  amount: number;
  receiptPath: string | null;
  createdAt: string;
};

export type ExpenseListResponse = {
  data: Expense[];
  totalAmount: number;
};

type RangeArgs = { from?: string; to?: string };

type CreateExpenseJsonBody = {
  date: string;
  description: string;
  amount: number;
  workOrderId?: string;
};

type CreateExpenseWithReceipt = CreateExpenseJsonBody & {
  receiptUri: string;
  receiptName?: string;
  receiptType?: string;
};

function pickList(resp: unknown): ExpenseListResponse {
  const r = (resp ?? {}) as Record<string, unknown>;
  const dataField = r.data ?? r.expenses ?? [];
  const data = Array.isArray(dataField) ? (dataField as Expense[]) : [];
  const totalAmount = Number(r.totalAmount ?? 0);
  return { data, totalAmount };
}

export const expensesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getExpenses: builder.query<ExpenseListResponse, RangeArgs | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.from) params.set("from", args.from);
        if (args?.to) params.set("to", args.to);
        const qs = params.toString();
        return qs ? `/expenses?${qs}` : "/expenses";
      },
      transformResponse: pickList,
      providesTags: ["Expense"],
    }),
    createExpense: builder.mutation<Expense, CreateExpenseJsonBody>({
      query: (body) => ({
        url: "/expenses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Expense"],
    }),
    createExpenseWithReceipt: builder.mutation<Expense, CreateExpenseWithReceipt>({
      query: ({ date, description, amount, workOrderId, receiptUri, receiptName, receiptType }) => {
        const form = new FormData();
        form.append("date", date);
        form.append("description", description);
        form.append("amount", String(amount));
        if (workOrderId) form.append("workOrderId", workOrderId);
        form.append("receipt", {
          uri: receiptUri,
          name: receiptName ?? `receipt_${Date.now()}.jpg`,
          type: receiptType ?? "image/jpeg",
        } as unknown as Blob);
        return {
          url: "/expenses",
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: ["Expense"],
    }),
    deleteExpense: builder.mutation<{ ok: true }, string>({
      query: (id) => ({
        url: `/expenses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expense"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useCreateExpenseWithReceiptMutation,
  useDeleteExpenseMutation,
} = expensesApi;
