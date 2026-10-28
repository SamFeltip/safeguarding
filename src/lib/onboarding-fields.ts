import type { Audience, Onboarding } from '../../shared/documents';

export const audienceLabels: Record<Audience, string> = {
  company: 'Company',
  hr: 'HR',
  admin: 'Admins',
};
export const onboardingLabels: Record<keyof Onboarding, string> = {
  title: 'Document title',
  fullName: 'Full name',
  email: 'Work email',
  jobTitle: 'Job title',
  department: 'Department',
  manager: 'Manager',
  startDate: 'Start date',
  employmentType: 'Employment type',
  location: 'Work location',
  equipment: 'Equipment requirements',
  notes: 'Additional notes',
  audience: 'Visibility',
};
export const basicFields = [
  { name: 'fullName', type: 'text' },
  { name: 'email', type: 'email' },
  { name: 'jobTitle', type: 'text' },
  { name: 'department', type: 'text' },
  { name: 'manager', type: 'text' },
  { name: 'startDate', type: 'date' },
  { name: 'location', type: 'text' },
] as const;
