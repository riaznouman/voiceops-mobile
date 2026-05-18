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

export type JobDetail = {
  id: string;
  referenceNumber: string;
  status: JobStatus;
  priority: JobPriority;
  scheduledAt: string;
  address: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  service: { id: string; name: string };
  technicianId?: string;
  technician?: { id: string; name: string };
  customerSignaturePath: string | null;
};

export type Note = {
  id: string;
  content: string;
  author: { name: string };
  createdAt: string;
};

export type Photo = {
  id: string;
  url: string;
  createdAt: string;
};

export type ActivityEntry = {
  id: string;
  actor: { name: string };
  action: string;
  createdAt: string;
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

    getJob: builder.query<JobDetail, string>({
      query: (id) => `/work-orders/${id}`,
      transformResponse: (resp: unknown): JobDetail => {
        const wo = pickOne<Record<string, unknown>>(resp);
        const customer = (wo.customer as Record<string, unknown> | null) ?? {};
        return {
          id: wo.id as string,
          referenceNumber: (wo.referenceNumber ?? wo.ref ?? wo.id) as string,
          status: wo.status as JobStatus,
          priority: wo.priority as JobPriority,
          scheduledAt: (wo.scheduledAt ?? "") as string,
          address: (wo.address ?? "") as string,
          customer: {
            id: (customer.id ?? "") as string,
            name: (customer.name ?? "Unknown") as string,
            phone: (customer.phone ?? customer.phoneNumber ?? "") as string,
            email: (customer.email ?? "") as string,
          },
          service: {
            id: ((wo.service as Record<string, unknown> | null)?.id ?? "") as string,
            name: ((wo.service as Record<string, unknown> | null)?.name ?? "") as string,
          },
          technicianId: wo.technicianId as string | undefined,
          technician: wo.technician as JobDetail["technician"],
          customerSignaturePath:
            (wo.customerSignaturePath as string | null | undefined) ?? null,
        };
      },
      providesTags: (_r, _e, id) => [{ type: "WorkOrder", id }],
    }),

    updateJobStatus: builder.mutation<JobDetail, { id: string; status: JobStatus }>({
      query: ({ id, status }) => ({
        url: `/work-orders/${id}`,
        method: "PATCH",
        body: { status },
      }),
      transformResponse: (resp: unknown): JobDetail => {
        const wo = pickOne<Record<string, unknown>>(resp);
        const customer = (wo.customer as Record<string, unknown> | null) ?? {};
        return {
          id: wo.id as string,
          referenceNumber: (wo.referenceNumber ?? wo.ref ?? wo.id) as string,
          status: wo.status as JobStatus,
          priority: wo.priority as JobPriority,
          scheduledAt: (wo.scheduledAt ?? "") as string,
          address: (wo.address ?? "") as string,
          customer: {
            id: (customer.id ?? "") as string,
            name: (customer.name ?? "Unknown") as string,
            phone: (customer.phone ?? customer.phoneNumber ?? "") as string,
            email: (customer.email ?? "") as string,
          },
          service: {
            id: ((wo.service as Record<string, unknown> | null)?.id ?? "") as string,
            name: ((wo.service as Record<string, unknown> | null)?.name ?? "") as string,
          },
          technicianId: wo.technicianId as string | undefined,
          technician: wo.technician as JobDetail["technician"],
          customerSignaturePath:
            (wo.customerSignaturePath as string | null | undefined) ?? null,
        };
      },
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkOrder", id: arg.id },
        "WorkOrder",
        { type: "WorkOrderActivity", id: arg.id },
      ],
    }),

    getJobNotes: builder.query<Note[], string>({
      query: (id) => `/work-orders/${id}/notes`,
      transformResponse: (resp: unknown): Note[] => pickArray<Note>(resp),
      providesTags: (_r, _e, id) => [{ type: "WorkOrderNote", id }],
    }),

    addJobNote: builder.mutation<Note, { workOrderId: string; content: string }>({
      query: ({ workOrderId, content }) => ({
        url: `/work-orders/${workOrderId}/notes`,
        method: "POST",
        body: { content },
      }),
      transformResponse: (resp: unknown): Note => pickOne<Note>(resp),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkOrderNote", id: arg.workOrderId },
        { type: "WorkOrderActivity", id: arg.workOrderId },
      ],
    }),

    getJobPhotos: builder.query<Photo[], string>({
      query: (id) => `/work-orders/${id}/photos`,
      transformResponse: (resp: unknown): Photo[] => pickArray<Photo>(resp),
      providesTags: (_r, _e, id) => [{ type: "WorkOrderPhoto", id }],
    }),

    uploadJobPhoto: builder.mutation<
      Photo,
      { workOrderId: string; uri: string; name: string; mimeType: string }
    >({
      query: ({ workOrderId, uri, name, mimeType }) => {
        const form = new FormData();
        form.append("photo", { uri, name, type: mimeType } as unknown as Blob);
        return {
          url: `/work-orders/${workOrderId}/photos`,
          method: "POST",
          body: form,
        };
      },
      transformResponse: (resp: unknown): Photo => pickOne<Photo>(resp),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkOrderPhoto", id: arg.workOrderId },
        { type: "WorkOrderActivity", id: arg.workOrderId },
      ],
    }),

    getJobActivity: builder.query<ActivityEntry[], string>({
      query: (id) => `/work-orders/${id}/activity`,
      transformResponse: (resp: unknown): ActivityEntry[] =>
        pickArray<ActivityEntry>(resp),
      providesTags: (_r, _e, id) => [{ type: "WorkOrderActivity", id }],
    }),

    uploadJobSignature: builder.mutation<
      { url: string; signedAt: string },
      { workOrderId: string; uri: string }
    >({
      query: ({ workOrderId, uri }) => {
        const form = new FormData();
        form.append("signature", {
          uri,
          name: `signature_${Date.now()}.png`,
          type: "image/png",
        } as unknown as Blob);
        return {
          url: `/work-orders/${workOrderId}/signature`,
          method: "POST",
          body: form,
        };
      },
      transformResponse: (resp: unknown) =>
        pickOne<{ url: string; signedAt: string }>(resp),
      invalidatesTags: (_r, _e, arg) => [
        { type: "WorkOrder", id: arg.workOrderId },
        { type: "WorkOrderActivity", id: arg.workOrderId },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetJobsQuery,
  useGetJobQuery,
  useUpdateJobStatusMutation,
  useGetJobNotesQuery,
  useAddJobNoteMutation,
  useGetJobPhotosQuery,
  useUploadJobPhotoMutation,
  useGetJobActivityQuery,
  useUploadJobSignatureMutation,
} = jobsApi;
