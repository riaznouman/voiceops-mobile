import { baseApi } from "../../services/api";

type LoginRequest = { email: string; password: string };
type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/mobile-login",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation } = authApi;
