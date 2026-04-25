import { baseApi } from "../../services/api";

export type JobStatus =
  | "assigned"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "draft";

export type JobPriority = "low" | "normal" | "high" | "urgent";

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
