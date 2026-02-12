import { useState, useEffect } from 'react';
import { applicationApi } from '@/lib/api';
import { AppFormField, DynamicFormData } from '@/lib/types';
import { initializeFormData } from '@/lib/utils/form-renderer';

interface UseApplicationFormParams {
  appName: string;
  datasetName: string | undefined;
  formFields: AppFormField[] | undefined;
  resubmitParams: Record<string, any> | undefined;
  isResubmit: boolean;
}

interface NextDatasetData {
  datasetName: string;
  datasetComment: string;
}

export function useApplicationForm({
  appName,
  datasetName,
  formFields,
  resubmitParams,
  isResubmit,
}: UseApplicationFormParams) {
  // ============================================
  // STATE
  // ============================================
  const [nextDatasetData, setNextDatasetData] = useState<NextDatasetData>({
    datasetName: 'Loading...',
    datasetComment: '',
  });
  const [formValues, setFormValues] = useState<DynamicFormData>({});
  const [fieldConfig, setFieldConfig] = useState<AppFormField[]>([]);

  // ============================================
  // EFFECTS
  // ============================================

  // Update output dataset name when input dataset loads
  useEffect(() => {
    if (datasetName) {
      const baseName = `${appName}_${datasetName}_${new Date().toISOString().slice(0, 10)}`;
      setNextDatasetData((prev) => ({
        ...prev,
        datasetName: baseName,
      }));
    }
  }, [datasetName, appName]);

  // Initialize form when schema loads (with optional resubmit prepopulation)
  useEffect(() => {
    if (formFields) {
      const initialData = initializeFormData(formFields);

      // If resubmit, merge the previous job's parameters
      if (isResubmit && resubmitParams) {
        Object.keys(resubmitParams).forEach((key) => {
          if (key in initialData) {
            initialData[key] = resubmitParams[key];
          }
        });
      }

      setFormValues(initialData);
      setFieldConfig(formFields);
    }
  }, [formFields, isResubmit, resubmitParams]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNextDatasetData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleFieldBlur = async (fieldName: string) => {
    try {
      const validationResponse = await applicationApi.validateAppConfig(appName, formValues);

      if (validationResponse.application?.form_fields) {
        setFieldConfig(validationResponse.application.form_fields);

        // Update form values with new defaults from validation
        const newValues = { ...formValues };
        validationResponse.application.form_fields.forEach((field) => {
          if (field.default_value !== undefined) {
            newValues[field.name] = field.default_value;
          }
        });
        setFormValues(newValues);
      }
    } catch (error) {
      console.error('Validation error:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      const currentIndex = fieldConfig.findIndex((f) => f.name === fieldName);
      if (currentIndex === -1) return;

      // Find next focusable field (skip sections and disabled fields)
      for (let i = currentIndex + 1; i < fieldConfig.length; i++) {
        const nextField = fieldConfig[i];
        if (nextField.type !== 'section' && !nextField.disabled) {
          const nextElement = document.getElementById(nextField.name);
          if (nextElement) {
            nextElement.focus();
          }
          break;
        }
      }
    }
  };

  // ============================================
  // RETURN
  // ============================================
  return {
    // State
    nextDatasetData,
    formValues,
    fieldConfig,

    // Handlers
    handleInputChange,
    handleFieldChange,
    handleFieldBlur,
    handleKeyDown,
  };
}
