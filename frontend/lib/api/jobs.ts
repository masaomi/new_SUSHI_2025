import { httpClient } from "./client";
import { JobsListResponse, JobSubmissionRequest, JobSubmissionResponse } from "../types/job";

export const jobApi = {
  async submitJob(
    jobData: JobSubmissionRequest,
  ): Promise<JobSubmissionResponse> {
    // Transform frontend request format to backend expected format
    const backendPayload = {
      job: {
        dataset_id: jobData.dataset_id,
        app_name: jobData.app_name,
        next_dataset_name: jobData.next_dataset?.name,
        next_dataset_comment: jobData.next_dataset?.comment,
        parameters: jobData.parameters,
      }
    };

    return httpClient.request<JobSubmissionResponse>('/api/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(backendPayload),
    });
  },

  async getJobsList(
    projectId: number, 
    params: { datasetName?: string; user?: string; status?: string } = {}
  ): Promise<JobsListResponse> {
    return httpClient.request<JobsListResponse>(`/api/v1/projects/${projectId}/jobs`);
  }
};

