# projects/[projectNumber]/datasets

## projects/[projectNumber]/page.test.tsx
- page title with project number
- renders DataSets menu card with correct link
- renders Import DataSet menu card with correct link
- renders Check Jobs menu card with correct link
- renders gStore menu card with correct link
- renders all four menu cards
- renders menu card icons

## projects/[projectNumber]/datasets/page.test.tsx
- renders loading skeleton initially
- displays datasets in table after loading
- displays error state when API fails
- displays page title with project number
- shows dataset metadata in table columns
- allows selecting datasets with checkboxes
- has view toggle buttons and Download All button
- shows pagination info has per-page selector with options

## projects/[projectNumber]/datasets/[datasetId]/page.test.tsx

- renders loading skeleton initially
- displays error state when API fails
- displays dataset name and breadcrumbs after loading
- displays dataset action buttons
- shows expandable input when Comment button clicked
- displays samples section
- displays runnable applications section
- navigates to edit samples page when Edit Samples clicked
- navigates to jobs page when Jobs button clicked

## projects/[projectNumber]/datasets/[datasetId]/run-application/[appName]/page.test.tsx
- renders loading skeleton initially
- displays error state when API fails
- displays dataset name and breadcrumbs after loading
- displays dataset action buttons
- shows expandable input when Comment button clicked
- displays samples section
- displays runnable applications section
- navigates to edit samples page when Edit Samples clicked
- navigates to jobs page when Jobs button clicked

## projects/[projectNumber]/datasets/[datasetId]/run-application/[appName]/confirm/page.test.tsx
- renders loading skeleton initially
- displays error when no job data in localStorage
- displays error when job data does not match URL params
- displays page title and application info after loading
- displays breadcrumbs
- displays result dataset section
- displays application parameters section
- displays submit and mock run buttons
- displays back to edit button
- calls router.back when back button is clicked
- displays error when dataset API fails
- shows empty parameters message when no parameters


# projects/[projectNumber]/jobs
## projects/[projectNumber]/jobs/page.test.tsx
- renders loading skeleton initially
- displays error state when API fails
- displays page title and back button after loading
- displays jobs table with correct headers
- displays jobs data in table rows
- displays dataset links for jobs with datasets
- displays Show Script and Show Logs buttons for each job
- displays Filters
- displays pagination controls
- shows empty state when no jobs match filters

## jobs/[jobid]/script/page.test.tsx [TODO]
## jobs/[jobid]/logs/page.test.tsx [TODO]

# files
## files/[...path]/page.test.tsx
- renders loading skeleton initially
- displays page title after loading
- displays table headers
- displays folder items
- displays last modified dates
- displays item count
- navigates to folder on click
- displays error state when API fails
- displays empty state when no files
## files/[...path]/page.test.tsx
- renders loading skeleton initially
- displays breadcrumbs
- displays table headers
- displays parent directory row
- displays folder and file items
- displays item count
- navigates to subfolder on click
- navigates to parent on .. click
- displays error state when API fails
- displays empty state when folder is empty
- displays file sizes correctly
- has breadcrumb link to Files root


