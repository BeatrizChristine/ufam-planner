import { apiFetch } from "./api-client";
import type { GradeBatchResult, SyncResult, UfamIntegrationStatus } from "@/types/integration";

export const ufamIntegrationApi = {
  status(signal?: AbortSignal) {
    return apiFetch<UfamIntegrationStatus>("/integrations/ufam/status", { signal });
  },

  syncCourses(levelId: number) {
    return apiFetch<SyncResult>(`/integrations/ufam/sync/courses?levelId=${levelId}`, {
      method: "POST",
    });
  },
  syncGradeBatch(limit = 3) {
    return apiFetch<GradeBatchResult>(`/integrations/ufam/sync/disciplines?limit=${limit}`, { method: "POST" });
  },
};
