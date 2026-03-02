import { JobMinimal } from '@/lib/types/job';

export const mockJobs: (JobMinimal & { project_id: number })[] = [
  {
    id: 101,
    status: "COMPLETED",
    user: "alice",
    dataset: { id: 1, name: "RNA-seq Analysis Dataset" },
    time: { start_time: "2024-01-15T10:35:00Z", end_time: "2024-01-15T12:45:00Z" },
    created_at: "2024-01-15T10:30:00Z",
    project_id: 1001,
  },
  {
    id: 102,
    status: "RUNNING",
    user: "alice",
    dataset: { id: 2, name: "Quality Control Report" },
    time: { start_time: "2024-01-16T14:25:00Z" },
    created_at: "2024-01-16T14:20:00Z",
    project_id: 1001,
  },
  {
    id: 103,
    status: "PENDING",
    user: "bob",
    dataset: { id: 3, name: "Differential Expression" },
    time: { start_time: "2024-01-17T09:20:00Z" },
    created_at: "2024-01-17T09:15:00Z",
    project_id: 1001,
  },
  {
    id: 104,
    status: "FAILED",
    user: "charlie",
    dataset: { id: 4, name: "Pathway Analysis" },
    time: { start_time: "2024-01-18T16:50:00Z", end_time: "2024-01-18T17:30:00Z" },
    created_at: "2024-01-18T16:45:00Z",
    project_id: 1001,
  },
  {
    id: 105,
    status: "COMPLETED",
    user: "diana",
    dataset: { id: 5, name: "Proteomics Dataset" },
    time: { start_time: "2024-01-19T11:35:00Z", end_time: "2024-01-19T14:20:00Z" },
    created_at: "2024-01-19T11:30:00Z",
    project_id: 1001,
  },
];

export const mockJobsResponse = {
  jobs: mockJobs,
  total_count: mockJobs.length,
  page: 1,
  per: 50,
  project_id: 1001,
};