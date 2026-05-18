import { baseApi } from "../../services/api";

export type NextStop = {
  id: string;
  referenceNumber: string;
  status: string;
  scheduledAt: string;
  customerName: string;
  address: string;
} | null;

export type TechDashboard = {
  todayJobs: number;
  activeJobs: number;
  completedToday: number;
  completedThisWeek: number;
  hoursThisWeek: number;
  nextStop: NextStop;
};

function pickOne<T>(resp: unknown): T {
  const r = resp as { data?: T } | T;
  return ((r as { data?: T }).data ?? r) as T;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTechDashboard: builder.query<TechDashboard, void>({
      query: () => "/technician/dashboard",
      transformResponse: (resp: unknown): TechDashboard => {
        const d = pickOne<Record<string, unknown>>(resp);
        const ns = d.nextStop as Record<string, unknown> | null | undefined;
        return {
          todayJobs: Number(d.todayJobs ?? 0),
          activeJobs: Number(d.activeJobs ?? 0),
          completedToday: Number(d.completedToday ?? 0),
          completedThisWeek: Number(d.completedThisWeek ?? 0),
          hoursThisWeek: Number(d.hoursThisWeek ?? 0),
          nextStop: ns
            ? {
                id: String(ns.id ?? ""),
                referenceNumber: String(
                  ns.referenceNumber ?? ns.ref ?? ns.id ?? ""
                ),
                status: String(ns.status ?? ""),
                scheduledAt: String(ns.scheduledAt ?? ""),
                customerName: String(
                  ns.customerName ??
                    (ns.customer as { name?: string } | undefined)?.name ??
                    ""
                ),
                address: String(ns.address ?? ""),
              }
            : null,
        };
      },
      providesTags: ["TechDashboard"],
    }),
  }),
  overrideExisting: true,
});

export const { useGetTechDashboardQuery } = dashboardApi;
