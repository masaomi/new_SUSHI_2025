import { httpClient } from './client';
import { UserProjectsResponse } from '../types/project';
import { JobListResponse } from '../types/job';
import { DatasetListResponse } from '../types/dataset';

export const projectApi = {
  async getUserProjects(): Promise<UserProjectsResponse> {
    return httpClient.request<UserProjectsResponse>('/api/v1/projects');
  },

  async getProjectDatasets(
    projectNumber: number, 
    params: { datasetName?: string; user?: string; page?: number; per?: number } = {}
  ): Promise<DatasetListResponse> {
    const queryString = httpClient.buildQueryString(params);
    const endpoint = `/api/v1/projects/${projectNumber}/datasets${queryString ? `?${queryString}` : ''}`;
    return httpClient.request<DatasetListResponse>(endpoint);
  },

  async getProjectJobs(
    projectNumber: number, 
    params: { datasetName?: string; user?: string; page?: number; per?: number } = {}
  ): Promise<JobListResponse> {
    const queryString = httpClient.buildQueryString(params);
    const endpoint = `/api/v1/projects/${projectNumber}/jobs${queryString ? `?${queryString}` : ``}`
    return httpClient.request<JobListResponse>(endpoint);
  }
};
