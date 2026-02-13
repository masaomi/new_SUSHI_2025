"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FormFieldComponent } from "@/lib/utils/form-renderer";
import Breadcrumbs from "@/lib/ui/Breadcrumbs";
import {
  useDatasetBase,
  useApplicationFormSchema,
  useApplicationForm,
} from "@/lib/hooks";
import { datasetApi } from "@/lib/api";
import RunApplicationPageSkeleton from "./RunApplicationPageSkeleton";

export default function RunApplicationPage() {
  // ============================================
  // URL PARAMS
  // ============================================
  const params = useParams<{
    projectNumber: string;
    datasetId: string;
    appName: string;
  }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const projectNumber = Number(params.projectNumber);
  const datasetId = Number(params.datasetId);
  const appName = params.appName;
  const isResubmit = searchParams.get("resubmit") === "true";

  // ============================================
  // DATA FETCHING
  // ============================================
  const {
    dataset,
    isLoading: isDatasetLoading,
    error: datasetError,
    notFound: datasetNotFound,
  } = useDatasetBase(datasetId);

  const {
    data: formConfigData,
    isLoading: isFormConfigLoading,
    error: formConfigError,
  } = useApplicationFormSchema(appName);

  const { data: resubmitData, isLoading: isResubmitLoading } = useQuery({
    queryKey: ["resubmit-data", datasetId],
    queryFn: () => datasetApi.getResubmitData(datasetId),
    enabled: isResubmit,
    staleTime: Infinity,
  });

  const formConfig = formConfigData?.application;

  // ============================================
  // FORM HOOK
  // ============================================
  const {
    nextDatasetData,
    formValues,
    fieldConfig,
    handleInputChange,
    handleFieldChange,
    handleFieldBlur,
    handleKeyDown,
  } = useApplicationForm({
    appName,
    datasetName: dataset?.name,
    formFields: formConfig?.form_fields,
    resubmitParams: resubmitData?.parameters,
    isResubmit,
  });

  // ============================================
  // SUBMIT HANDLER
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataset) return;

    const jobData = {
      projectNumber,
      datasetId,
      appName,
      nextDataset: {
        name: nextDatasetData.datasetName,
        comment: nextDatasetData.datasetComment || undefined,
      },
      parameters: formValues,
    };

    try {
      localStorage.setItem("sushi_job_submission_data", JSON.stringify(jobData));
      router.push(
        `/projects/${projectNumber}/datasets/${datasetId}/run-application/${appName}/confirm`
      );
    } catch (error) {
      console.error("Failed to store job data:", error);
      alert("Failed to save job data. Please try again.");
    }
  };

  // ============================================
  // EARLY RETURNS
  // ============================================
  if (isDatasetLoading || isFormConfigLoading || (isResubmit && isResubmitLoading)) {
    return <RunApplicationPageSkeleton />;
  }

  if (datasetError || formConfigError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">
            Failed to load dataset
          </div>
          <p className="text-gray-500 mb-4">
            There was an error loading the dataset information.
          </p>
          <Link
            href={`/projects/${projectNumber}/datasets`}
            className="text-blue-600 hover:underline"
          >
            ← Back to Datasets
          </Link>
        </div>
      </div>
    );
  }

  if (datasetNotFound || !dataset) {
    return (
      <div className="container mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Dataset Not Found</h1>
        <p className="text-gray-700 mb-6">
          Dataset {datasetId} was not found in project {projectNumber}.
        </p>
        <Link
          href={`/projects/${projectNumber}/datasets`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Datasets
        </Link>
      </div>
    );
  }

  // Check if app is available (currently just logs)
  const isAppAvailable = dataset.applications?.some((category) =>
    category.apps.some((app) => app.class_name === appName)
  );
  if (!isAppAvailable) {
    console.log("This Application cannot run on this dataset");
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="container mx-auto px-6 py-8">
      <Breadcrumbs
        items={[
          { label: `Project ${projectNumber}`, href: `/projects/${projectNumber}` },
          { label: "Datasets", href: `/projects/${projectNumber}/datasets` },
          { label: dataset.name, href: `/projects/${projectNumber}/datasets/${datasetId}` },
          { label: `Run ${appName}`, active: true },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Run Application: {appName}</h1>
          <p className="text-gray-600 mt-1">Dataset: {dataset.name}</p>
          <p className="text-gray-600 mt-1">
            Description: {formConfig?.description || "Loading application description..."}
          </p>
        </div>
        <Link
          href={`/projects/${projectNumber}/datasets/${datasetId}`}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          ← Back to Dataset
        </Link>
      </div>

      <div className="space-y-6">
        {/* NextDataset Section */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">NextDataset</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="datasetName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="datasetName"
                  name="datasetName"
                  value={nextDatasetData.datasetName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`${appName}_${dataset.name}_${new Date().toISOString().slice(0, 10)}`}
                />
              </div>
              <div>
                <label
                  htmlFor="datasetComment"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Comment
                </label>
                <input
                  type="text"
                  id="datasetComment"
                  name="datasetComment"
                  value={nextDatasetData.datasetComment}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional comment for the resulting dataset..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Parameters Section */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6">Parameters</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                {fieldConfig.map((field) => (
                  <FormFieldComponent
                    key={field.name}
                    field={field}
                    value={formValues[field.name]}
                    onChange={handleFieldChange}
                    onBlur={handleFieldBlur}
                    onKeyDown={handleKeyDown}
                  />
                ))}
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Continue to Review →
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
