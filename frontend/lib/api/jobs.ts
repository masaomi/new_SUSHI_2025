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
  },

  async getJobScript(
    jobId: number
  ): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hardcodedScript = `#!/usr/bin/env python3
"""
Data Processing Script - Customer Analytics Q3
Job ID: ${jobId}
Author: rdomi
Created: 2024-10-08
"""

import pandas as pd
import numpy as np
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def load_data(file_path):
    """Load customer data from CSV file"""
    logger.info(f"Loading data from {file_path}")
    try:
        df = pd.read_csv(file_path)
        logger.info(f"Successfully loaded {len(df)} records")
        return df
    except Exception as e:
        logger.error(f"Failed to load data: {e}")
        raise

def process_analytics(df):
    """Process customer analytics data"""
    logger.info("Starting analytics processing")
    
    # Calculate customer metrics
    df['total_spent'] = df['purchase_amount'] * df['quantity']
    df['customer_segment'] = pd.cut(df['total_spent'], 
                                   bins=[0, 100, 500, 1000, np.inf], 
                                   labels=['Bronze', 'Silver', 'Gold', 'Platinum'])
    
    # Generate summary statistics
    summary = df.groupby('customer_segment').agg({
        'total_spent': ['count', 'mean', 'sum'],
        'customer_id': 'nunique'
    }).round(2)
    
    logger.info("Analytics processing completed")
    return df, summary

def main():
    """Main execution function"""
    logger.info(f"Starting job {jobId} - Customer Analytics Q3")
    
    try:
        # Load and process data
        data = load_data('/data/customer_data_q3.csv')
        processed_data, summary = process_analytics(data)
        
        # Save results
        output_path = f'/output/analytics_results_{jobId}.csv'
        processed_data.to_csv(output_path, index=False)
        
        logger.info(f"Results saved to {output_path}")
        logger.info("Job completed successfully")
        
    except Exception as e:
        logger.error(f"Job failed: {e}")
        raise

if __name__ == "__main__":
    main()`;
        resolve(hardcodedScript);
      }, 1000);
    });
  },

  async getJobLogs(
    jobId: number
  ): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const hardcodedLogs = `
  2024-10-08 09:15:30,123 - INFO - Starting job ${jobId} - Customer Analytics Q3
2024-10-08 09:15:30,125 - INFO - Initializing data processing pipeline
2024-10-08 09:15:30,126 - INFO - Loading data from /data/customer_data_q3.csv
2024-10-08 09:15:31,456 - INFO - Successfully loaded 15,247 records
2024-10-08 09:15:31,457 - INFO - Data validation passed: 15,247 valid records, 0 invalid records
2024-10-08 09:15:31,458 - INFO - Starting analytics processing
2024-10-08 09:15:31,890 - INFO - Calculating customer metrics for 15,247 customers
2024-10-08 09:15:32,234 - INFO - Customer segmentation complete:
2024-10-08 09:15:32,235 - INFO -   Bronze: 8,123 customers (53.3%)
2024-10-08 09:15:32,236 - INFO -   Silver: 4,567 customers (29.9%)
2024-10-08 09:15:32,237 - INFO -   Gold: 2,234 customers (14.7%)
2024-10-08 09:15:32,238 - INFO -   Platinum: 323 customers (2.1%)
2024-10-08 09:15:32,567 - INFO - Generating summary statistics
2024-10-08 09:15:33,123 - INFO - Summary statistics generated successfully
2024-10-08 09:15:33,456 - INFO - Analytics processing completed
2024-10-08 09:15:33,789 - INFO - Saving processed data to /output/analytics_results_${jobId}.csv
2024-10-08 09:15:34,234 - INFO - Data export completed: 15,247 records written
2024-10-08 09:15:34,567 - INFO - Generating visualization charts
2024-10-08 09:15:35,123 - INFO - Chart generation completed: 5 charts saved
2024-10-08 09:15:35,456 - INFO - Results saved to /output/analytics_results_${jobId}.csv
2024-10-08 09:15:35,789 - INFO - Performance metrics:
2024-10-08 09:15:35,790 - INFO -   Total execution time: 5.667 seconds
2024-10-08 09:15:35,791 - INFO -   Records processed per second: 2,691
2024-10-08 09:15:35,792 - INFO -   Memory usage: 234.5 MB peak
2024-10-08 09:15:35,793 - INFO -   CPU usage: 87% average
2024-10-08 09:15:35,794 - INFO - Job completed successfully
2024-10-08 09:15:35,795 - INFO - Cleanup: temporary files removed
2024-10-08 09:15:35,796 - INFO - Exit code: 0`;
        resolve(hardcodedLogs);
      }, 1000);
    });
  }
};
