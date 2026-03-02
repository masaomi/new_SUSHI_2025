interface StepNavigationProps {
  onBack: () => void;
  onNext: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export default function StepNavigation({
  onBack,
  onNext,
  isFirstStep,
  isLastStep,
}: StepNavigationProps) {
  return (
    <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
      <div>
        {!isFirstStep && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            ← Back
          </button>
        )}
      </div>
      <button
        type={isLastStep ? 'submit' : 'button'}
        onClick={isLastStep ? undefined : onNext}
        className="px-6 py-2 text-sm font-medium text-white bg-brand-600 rounded-md hover:bg-brand-700 transition-colors"
      >
        {isLastStep ? 'Continue to Review →' : 'Next →'}
      </button>
    </div>
  );
}
