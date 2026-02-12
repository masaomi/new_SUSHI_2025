import { httpClient } from "./client";
import { AppFormResponse, DynamicFormData } from "../types/app-form";

export const applicationApi = {
  async getFormSchema(appName: string): Promise<AppFormResponse> {
    // Mock response for CountQC
    if (appName === 'CountQC') {
      return Promise.resolve({
        application: {
          name: 'CountQC',
          class_name: 'CountQC',
          category: 'QC',
          description: 'Quality control analysis for count data',
          required_columns: ['Name', 'Count'],
          required_params: ['cores', 'ram'],
          modules: ['Tools/QC'],
          form_fields: [
            { name: 'cores', type: 'integer', default_value: 8, description: 'Number of CPU cores' },
            { name: 'ram', type: 'integer', default_value: 32, description: 'RAM in GB' },
            { name: 'scratch', type: 'integer', default_value: 400, description: 'Scratch space in GB' },
            { name: 'partition', type: 'select', default_value: 'normal', options: ['normal', 'high', 'low'], description: 'Cluster partition' },
            { name: 'ref', type: 'select', default_value: 'hg38', options: ['hg38', 'hg19', 'mm10', 'mm39'], description: 'Reference genome' },
            { name: 'paired', type: 'boolean', default_value: true, description: 'Paired-end data' },
            { name: 'strandMode', type: 'select', default_value: 'sense', options: ['sense', 'antisense', 'both'], description: 'Strand mode' },
            { name: 'featureLevel', type: 'select', default_value: 'gene', options: ['gene', 'transcript', 'exon'], description: 'Feature level' },
            { name: 'transcriptTypes', type: 'text', default_value: 'protein_coding,lncRNA', description: 'Transcript types (comma-separated)' },
            { name: 'minReads', type: 'integer', default_value: 10, description: 'Minimum read count' },
            { name: 'normMethod', type: 'select', default_value: 'TMM', options: ['TMM', 'RLE', 'upperquartile', 'none'], description: 'Normalization method' },
            { name: 'runGO', type: 'boolean', default_value: true, description: 'Run GO enrichment analysis' },
            { name: 'backgroundExpression', type: 'integer', default_value: 5, description: 'Background expression threshold' },
          ],
        },
      });
    }

    return httpClient.request<AppFormResponse>(`/api/v1/application_configs/${appName}`, {
      method: 'GET',
    });
  },

  async validateAppConfig(appName: string, currentConfig: DynamicFormData): Promise<AppFormResponse> {
    // Mock validation for CountQC - sets all integer fields to 0 and disables ram
    if (appName === 'CountQC') {
      return Promise.resolve({
        application: {
          name: 'CountQC',
          class_name: 'CountQC',
          category: 'QC',
          description: 'Quality control analysis for count data',
          required_columns: ['Name', 'Count'],
          required_params: ['cores', 'ram'],
          modules: ['Tools/QC'],
          form_fields: [
            { name: 'cores', type: 'integer', default_value: 0, description: 'Number of CPU cores' },
            { name: 'ram', type: 'integer', default_value: 0, description: 'RAM in GB', disabled: true },
            { name: 'scratch', type: 'integer', default_value: 0, description: 'Scratch space in GB' },
            { name: 'partition', type: 'select', default_value: 'normal', options: ['normal', 'high', 'low'], description: 'Cluster partition' },
            { name: 'ref', type: 'select', default_value: 'hg38', options: ['hg38', 'hg19', 'mm10', 'mm39'], description: 'Reference genome' },
            { name: 'paired', type: 'boolean', default_value: true, description: 'Paired-end data' },
            { name: 'strandMode', type: 'select', default_value: 'sense', options: ['sense', 'antisense', 'both'], description: 'Strand mode' },
            { name: 'featureLevel', type: 'select', default_value: 'gene', options: ['gene', 'transcript', 'exon'], description: 'Feature level' },
            { name: 'transcriptTypes', type: 'text', default_value: 'protein_coding,lncRNA', description: 'Transcript types (comma-separated)' },
            { name: 'minReads', type: 'integer', default_value: 0, description: 'Minimum read count' },
            { name: 'normMethod', type: 'select', default_value: 'TMM', options: ['TMM', 'RLE', 'upperquartile', 'none'], description: 'Normalization method' },
            { name: 'runGO', type: 'boolean', default_value: true, description: 'Run GO enrichment analysis' },
            { name: 'backgroundExpression', type: 'integer', default_value: 0, description: 'Background expression threshold' },
          ],
        },
      });
    }

    // For other apps, return the current config unchanged (would call real API)
    return httpClient.request<AppFormResponse>(`/api/v1/application_configs/${appName}/validate`, {
      method: 'POST',
      body: JSON.stringify({ config: currentConfig }),
    });
  },
};

