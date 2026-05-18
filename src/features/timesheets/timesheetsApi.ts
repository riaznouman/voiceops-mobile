import { baseApi } from "../../services/api";

export type Timesheet = {
  id: string;
  userId: string;
  workOrderId: string | null;
  workOrder?: { id: string; referenceNumber: string };
  date: string;
  hoursWorked: number;
  notes: string | null;
  createdAt: string;
};

export type TimesheetListResponse = {
  data: Timesheet[];
  totalHours: number;
};

type RangeArgs = { from?: string; to?: string };

type CreateTimesheetBody = {
  date: string;
  hoursWorked: number;
  notes?: string;
  workOrderId?: string;
};

function pickList(resp: unknown): TimesheetListResponse {
  const r = (resp ?? {}) as Record<string, unknown>;
  const dataField = r.data ?? r.timesheets ?? [];
  const data = Array.isArray(dataField) ? (dataField as Timesheet[]) : [];
  const totalHours = Number(r.totalHours ?? 0);
  return { data, totalHours };
}

export const timesheetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTimesheets: builder.query<TimesheetListResponse, RangeArgs | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.from) params.set("from", args.from);
        if (args?.to) params.set("to", args.to);
        const qs = params.toString();
        return qs ? `/timesheets?${qs}` : "/timesheets";
      },
      transformResponse: pickList,
      providesTags: ["Timesheet"],
    }),
    createTimesheet: builder.mutation<Timesheet, CreateTimesheetBody>({
      query: (body) => ({
        url: "/timesheets",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Timesheet", "TechDashboard"],
    }),
    deleteTimesheet: builder.mutation<{ ok: true }, string>({
      query: (id) => ({
        url: `/timesheets/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Timesheet", "TechDashboard"],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetTimesheetsQuery,
  useCreateTimesheetMutation,
  useDeleteTimesheetMutation,
} = timesheetsApi;
