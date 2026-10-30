export type UfamIntegrationStatus = {
  source: string;
  baseUrl: string;
  lastStatus: "NEVER_SYNCED" | "RUNNING" | "SUCCESS" | "FAILED";
  lastResource: string | null;
  lastItemsProcessed: number | null;
  lastSyncAt: string | null;
  importedCourses: number;
  discoveredCurriculumVersions: number;
};

export type SyncResult = {
  resource: string;
  itemsProcessed: number;
  completedAt: string;
};

export type GradeBatchResult = { attempted: number; imported: number; failed: number };
