# Implementation Plan

- [x] 1. Update backend recruitment model and validation


  - Update RecruitmentSources constants to include only the new dropdown values: Indeed, Candidate Reference, Employee Reference, Walk-In
  - Update RecruitmentPipelines constants to include only the new dropdown values: HR Screening, Screening Reject, R1, R1 Reject, R2, R2 Reject, Offered, Onboarded
  - Remove nationality from required fields validation in RequiredFields.create array
  - Update validation logic to use strict validation for dropdown values instead of warnings
  - _Requirements: 2.2, 2.3, 3.2, 3.3, 4.2, 4.3_



- [x] 2. Update frontend recruitment form component

  - Remove nationality field from RecruitmentForm.tsx component including input field, label, validation, and form registration
  - Convert recruitmentSource text input to dropdown select element with the four predefined options
  - Convert recruitmentPipeline text input to dropdown select element with the eight predefined pipeline stages
  - Update form validation to ensure dropdown selections are required



  - Maintain existing form styling and layout for the dropdown elements
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 3.6_




- [x] 3. Update TypeScript interfaces and types
  - Remove nationality field from RecruitmentFormData interface in types file
  - Update any other TypeScript interfaces that reference nationality field for recruitment forms
  - Ensure recruitmentSource and recruitmentPipeline types are properly defined for dropdown values
  - _Requirements: 1.2, 2.3, 3.3_

- [ ]* 4. Add comprehensive form validation tests
  - Write unit tests for dropdown validation in the frontend component
  - Write unit tests for backend validation with new dropdown values
  - Write integration tests for form submission with dropdown selections
  - _Requirements: 2.4, 3.4, 4.2, 4.3_

- [ ]* 5. Add backward compatibility tests
  - Write tests to ensure existing recruitment records with nationality data are handled properly
  - Write tests to verify editing existing records works correctly
  - Write tests for API endpoints handling legacy data
  - _Requirements: 1.3, 2.5, 3.5, 4.4, 4.5_