export interface StaffProfile {
  uid: string;
  displayName: string;
  email: string;
  role: 'collector' | 'supervisor' | 'admin';
  divisionIds?: string[];
}
