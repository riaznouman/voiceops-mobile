import { baseApi } from "../../services/api";

type LoginRequest = { email: string; password: string };
type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
};

export type UserMe = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  phone: string | null;
  createdAt: string;
};

type UpdateMeRequest = { name?: string; phone?: string };

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/mobile-login",
        method: "POST",
        body: credentials,
      }),
    }),
    getMe: builder.query<UserMe, void>({
      query: () => "/users/me",
      providesTags: ["Auth"],
    }),
    updateMe: builder.mutation<UserMe, UpdateMeRequest>({
      query: (body) => ({
        url: "/users/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Auth"],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useGetMeQuery, useUpdateMeMutation } = authApi;
