// types/RegistrationData.ts

export interface RegistrationData {
    testCaseId: string;
    scenario: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    gender?: 'Male' | 'Female' | 'Other' | string; 
    mobile?: string;
    dob?: string;
    subjects?: string;
    hobbies?: string; 
    picture?: string;
    address?: string;
    state?: string;
    city?: string;
    expectedResult: 'success' | 'error_mandatory' | 'error_mobile' | 'error_email' | string;
}