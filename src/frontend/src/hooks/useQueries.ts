import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Bill,
  BillKey,
  Client,
  DashboardMetrics,
  ImportRequest,
  Payment,
  Project,
  ProjectAnalyticsData,
  UserProfile,
  UserRole,
} from "../backend";
import { useActor } from "./useActor";

// Optimized stale times for better performance and reduced backend calls
const STALE_TIME_FREQUENT = 30000; // 30 seconds for frequently changing data
const STALE_TIME_STABLE = 120000; // 2 minutes for stable data
const STALE_TIME_VERY_STABLE = 300000; // 5 minutes for very stable data

// Projects Queries
export function useGetAllProjects() {
  const { actor, isFetching } = useActor();

  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProjects();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
    retry: 2,
  });
}

export function useAddProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: Project) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addProject(project);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useUpdateProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      project,
      password,
    }: { project: Project; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateProject(project, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useDeleteProject() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteProject(id, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

// Bills Queries
export function useGetAllBills() {
  const { actor, isFetching } = useActor();

  return useQuery<Bill[]>({
    queryKey: ["bills"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllBills();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_FREQUENT,
    retry: 2,
  });
}

export function useAddBill() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: Bill) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addBill(bill);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useUpdateBill() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bill,
      password,
    }: { bill: Bill; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateBill(bill, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useDeleteBill() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      billNumber,
      password,
    }: {
      projectId: string;
      billNumber: string;
      password: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteBill(projectId, billNumber, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useBulkDeleteBills() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      password,
      billKeys,
    }: { password: string; billKeys: BillKey[] }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.bulkDeleteBillsWithPassword(password, billKeys);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

// Payments Queries
export function useGetAllPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_FREQUENT,
    retry: 2,
  });
}

export function useAddPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: Payment) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addPayment(payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useUpdatePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      payment,
      password,
    }: { payment: Payment; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updatePayment(payment, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useDeletePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deletePayment(id, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useBulkDeletePayments() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      password,
      ids,
    }: { password: string; ids: string[] }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.bulkDeletePayments(password, ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

// Clients Queries
export function useGetAllClients() {
  const { actor, isFetching } = useActor();

  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllClients();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_VERY_STABLE,
    retry: 2,
  });
}

export function useAddClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Client) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addClient(client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      client,
      password,
    }: { client: Client; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateClient(client, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteClient() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteClient(id, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

// Dashboard Queries
export function useGetDashboardMetrics() {
  const { actor, isFetching } = useActor();

  return useQuery<DashboardMetrics>({
    queryKey: ["dashboardMetrics"],
    queryFn: async () => {
      if (!actor)
        return {
          totalBills: 0,
          totalPayments: 0,
          outstanding: 0,
          totalGst: 0,
        };
      return actor.getDashboardMetrics();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_FREQUENT,
    retry: 2,
  });
}

// Analytics Queries
export function useGetProjectWiseAnalyticsData(sortBy = "outstanding") {
  const { actor, isFetching } = useActor();

  return useQuery<ProjectAnalyticsData[]>({
    queryKey: ["analyticsData", sortBy],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getProjectWiseAnalyticsData(sortBy);
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
    retry: 2,
  });
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: STALE_TIME_VERY_STABLE,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ["currentUserRole"],
    queryFn: async () => {
      if (!actor) return "guest" as UserRole;
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_VERY_STABLE,
    retry: 2,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Users Management Queries
export function useListUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<[Principal, UserProfile][]>({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUsers();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
    retry: 2,
  });
}

export function useAddUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addUser(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userPrincipal,
      profile,
    }: {
      userPrincipal: Principal;
      profile: UserProfile;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateUser(userPrincipal, profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUsers() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      password,
      principalIds,
    }: { password: string; principalIds: string[] }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteUsers(password, principalIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

// Seri AI Queries
export function useGetGreetingMessage() {
  const { actor, isFetching } = useActor();

  return useQuery<string>({
    queryKey: ["greetingMessage"],
    queryFn: async () => {
      if (!actor) return "";
      return actor.getGreetingMessage(null);
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_VERY_STABLE,
    retry: 2,
  });
}

export function useGetAllProjectNames() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["projectNames"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllProjectNames();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
    retry: 2,
  });
}

export function useGetProjectSummary(projectId: string | null) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["projectSummary", projectId],
    queryFn: async () => {
      if (!actor || !projectId) return null;
      return actor.getProjectSummary(projectId);
    },
    enabled: !!actor && !isFetching && !!projectId,
    staleTime: STALE_TIME_FREQUENT,
    retry: 2,
  });
}

// Import Data
export function useImportData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      request,
      password,
    }: { request: ImportRequest; password: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.importData(request, password);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useGetCompletedProjectIds() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["completedProjectIds"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCompletedProjectIds();
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
  });
}

export function useToggleProjectCompleted() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleProjectCompleted(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["completedProjectIds"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardMetrics"] });
      queryClient.invalidateQueries({ queryKey: ["analyticsData"] });
    },
  });
}

export function useGetProjectMapLocations() {
  const { actor, isFetching } = useActor();
  return useQuery<Record<string, string>>({
    queryKey: ["projectMapLocations"],
    queryFn: async () => {
      if (!actor) return {};
      const entries = await actor.getProjectMapLocations();
      return Object.fromEntries(entries);
    },
    enabled: !!actor && !isFetching,
    staleTime: STALE_TIME_STABLE,
  });
}

export function useSetProjectMapLocation() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      location,
    }: { projectId: string; location: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.setProjectMapLocation(projectId, location);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projectMapLocations"] });
    },
  });
}
