# Requirements Document

## Introduction

This feature involves updating the recruitment panel form to improve data consistency and user experience. The changes include removing the nationality field (which is no longer needed) and converting two text input fields to dropdown selections with predefined values to ensure data standardization and reduce input errors.

## Requirements

### Requirement 1

**User Story:** As an HR administrator, I want the nationality field removed from the recruitment form, so that the form is simplified and focuses on essential recruitment information.

#### Acceptance Criteria

1. WHEN a user opens the recruitment form THEN the nationality field SHALL NOT be visible
2. WHEN a user submits the recruitment form THEN the nationality field SHALL NOT be included in the form data
3. WHEN existing recruitment records are displayed THEN nationality information SHALL still be preserved in the database for historical records
4. WHEN the form validation runs THEN nationality SHALL NOT be required or validated

### Requirement 2

**User Story:** As an HR administrator, I want the Recruitment Source field to be a dropdown with predefined options, so that I can ensure consistent data entry and avoid typos or variations in source names.

#### Acceptance Criteria

1. WHEN a user views the recruitment form THEN the Recruitment Source field SHALL be displayed as a dropdown selection
2. WHEN a user clicks on the Recruitment Source dropdown THEN it SHALL display the options: "Indeed", "Candidate Reference", "Employee Reference", "Walk-In"
3. WHEN a user selects a recruitment source THEN the selected value SHALL be stored in the form data
4. WHEN the form is submitted without selecting a recruitment source THEN validation SHALL show an error message
5. WHEN editing an existing recruitment record THEN the dropdown SHALL show the previously selected value as selected

### Requirement 3

**User Story:** As an HR administrator, I want the Recruitment Pipeline field to be a dropdown with predefined pipeline stages, so that I can track candidates through standardized recruitment stages and maintain consistent pipeline reporting.

#### Acceptance Criteria

1. WHEN a user views the recruitment form THEN the Recruitment Pipeline field SHALL be displayed as a dropdown selection
2. WHEN a user clicks on the Recruitment Pipeline dropdown THEN it SHALL display the options: "HR Screening", "Screening Reject", "R1", "R1 Reject", "R2", "R2 Reject", "Offered", "Onboarded"
3. WHEN a user selects a recruitment pipeline stage THEN the selected value SHALL be stored in the form data
4. WHEN the form is submitted without selecting a pipeline stage THEN validation SHALL show an error message
5. WHEN editing an existing recruitment record THEN the dropdown SHALL show the previously selected pipeline stage as selected
6. WHEN the pipeline options are displayed THEN they SHALL be ordered logically to reflect the recruitment process flow

### Requirement 4

**User Story:** As an HR administrator, I want the backend API to support the updated form structure, so that the form changes work seamlessly with the existing recruitment system.

#### Acceptance Criteria

1. WHEN the backend receives recruitment form data THEN it SHALL accept requests without nationality field
2. WHEN the backend validates recruitment data THEN it SHALL validate that recruitmentSource is one of the allowed dropdown values
3. WHEN the backend validates recruitment data THEN it SHALL validate that recruitmentPipeline is one of the allowed dropdown values
4. WHEN the backend processes recruitment updates THEN it SHALL maintain backward compatibility with existing records that have nationality data
5. WHEN the API returns recruitment data THEN it SHALL continue to include nationality for existing records but not require it for new records