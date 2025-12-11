import { httpClient } from './client';
import { DatasetFullResponse, DatasetTreeResponse } from '../types/dataset';

export const datasetApi = {
    async getDataset(id: number): Promise<DatasetFullResponse> {
        return httpClient.request<DatasetFullResponse>(`/api/v1/datasets/${id}`);
    },
    async getDatasetTree(id: number): Promise<DatasetTreeResponse> {
        return httpClient.request<DatasetTreeResponse>(`/api/v1/datasets/${id}/tree`);
    },

    // async createDataset(name: string): Promise<CreateDatasetResponse> {
    //     return httpClient.request<CreateDatasetResponse>('/api/v1/datasets', {
    //         method: 'POST',
    //         body: JSON.stringify({ dataset: { name } }),
    //     });
    // },
};
