import { httpClient } from "./client";
import { JobFullResponse, JobListResponse, JobSubmissionRequest, JobSubmissionResponse } from "../types/job";

export const jobApi = {
  async submitJob(
    jobData: JobSubmissionRequest,
  ): Promise<JobSubmissionResponse> {
    // Mock implementation - replace with actual API call when backend is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: Math.floor(Math.random() * 10000),
          status: "submitted",
          created_at: new Date().toISOString(),
          message: `MOCK RESPONSE`,
        });
        // throw new Error("I'm THROWING");
      }, 2000);
    });

    // Future implementation when backend is ready:
    // return httpClient.request<JobSubmissionResponse>('/api/v1/jobs', {
    //   method: 'POST',
    //   body: JSON.stringify(jobData),
    // });
  },

  async getJob(
    jobId: number
  ): Promise<JobFullResponse>{
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: jobId,
          status: "completed",
          user: "mockuser",
          input_dataset_id: 1,
          next_dataset_id: 2,
          created_at: new Date().toISOString(),
          script_path: "/mock/script/path",
          submit_job_id: 123,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        // throw new Error("I'm THROWING");
      }, 2000);
    });
  },

  async getAllJobs(
    params: { datasetName?: string; user?: string; page?: number; per?: number } = {}
  ): Promise<JobListResponse> {
    const queryString = httpClient.buildQueryString(params);
    const endpoint = `/api/v1/jobs${queryString ? `?${queryString}` : ''}`;
    return httpClient.request<JobListResponse>(endpoint);
  }
};

