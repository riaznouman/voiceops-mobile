import { baseApi } from "../../services/api";

export type JobStatus =
  | "PENDING"
  | "EN_ROUTE"
  | "ON_SITE"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type JobPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type Job = {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledAt: string;
  customer: { name: string; address: string };
  service: { name: string };
};

type WorkOrderRow = {
  id: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledAt: string | null;
  address: string | null;
  customer: { id: string; name: string; email: string } | null;
  service: { id: string; name: string } | null;
};

function pickRows(resp: unknown): WorkOrderRow[] {
  if (Array.isArray(resp)) return resp as WorkOrderRow[];
  const r = resp as { data?: unknown } | null | undefined;
  if (Array.isArray(r?.data)) return r!.data as WorkOrderRow[];
  const inner = (r?.data as { data?: unknown } | undefined)?.data;
  if (Array.isArray(inner)) return inner as WorkOrderRow[];
  return [];
}

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], void>({
      query: () => "/work-orders",
      transformResponse: (resp: unknown): Job[] =>
        pickRows(resp).map((wo) => ({
          id: wo.id,
          status: wo.status,
          priority: wo.priority,
          scheduledAt: wo.scheduledAt ?? "",
          customer: {
            name: wo.customer?.name ?? "Unknown",
            address: wo.address ?? "",
          },
          service: { name: wo.service?.name ?? "" },
        })),
      providesTags: ["WorkOrder"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetJobsQuery } = jobsApi;
