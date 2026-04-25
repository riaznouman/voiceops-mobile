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

export const jobsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobs: builder.query<Job[], void>({
      query: () => "/work-orders",
      providesTags: ["WorkOrder"],
    }),
  }),
  overrideExisting: false,
});

export const { useGetJobsQuery } = jobsApi;
