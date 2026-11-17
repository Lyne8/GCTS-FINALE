export type ServiceReportType = 'overflowing_bin' | 'missed_collection';
export type ServiceReportStatus = 'received' | 'under_review' | 'resolved';

export type ServiceReport = {
  id: string;
  residentUid: string;
  divisionId: string;
  binId: string;
  type: ServiceReportType;
  location: string;
  details: string;
  status: ServiceReportStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type NewServiceReport = {
  binId: string;
  divisionId: string;
  type: ServiceReportType;
  location: string;
  details: string;
};
