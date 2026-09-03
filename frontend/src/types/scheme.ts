export type GovernmentType = 'State' | 'Central';

export interface Scheme {
  id: string;
  name: string;
  code: string;
  governmentType?: GovernmentType;
  ministry: string;
  category:
    | 'Financial Assistance'
    | 'Crop Insurance'
    | 'Seeds'
    | 'Irrigation'
    | 'Farm Machinery'
    | 'Soil/Farming Practices'
    | 'Crop Loss'
    | string;
  state: 'Andhra Pradesh' | 'Telangana' | 'All India' | string;
  whoCanApply?: string;
  beneficiaryCategory: string[];
  description: string;
  benefits: string;
  subsidyDetails: string;
  eligibility: string[];
  documentsRequired: string[];
  howToApply: string[];
  officialPortalUrl: string;
  applicationGuideUrl?: string;
  verifiedDate: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchemeQueryParams {
  search?: string;
  category?: string;
  state?: string;
  beneficiary?: string;
}

export interface SchemesResponse {
  success: boolean;
  count: number;
  schemes: Scheme[];
}

export interface SingleSchemeResponse {
  success: boolean;
  scheme: Scheme;
  message?: string;
}

export interface SchemeCategoriesResponse {
  success: boolean;
  categories: { category: string; count: number }[];
  states: string[];
}
