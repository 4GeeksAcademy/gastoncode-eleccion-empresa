export type Candidate = {
  id: string;
  full_name: string;
  position: string;
  status: string;
  stage: string;
  experience_years: number;
  applied_at: string;
};

export type RecordsResponse = {
  total: number;
  page: number;
  limit: number;
  data: Candidate[];
};

export const stageOptions = ["pending", "review", "interview", "offer", "hired"];
export const statusOptions = ["received", "in_progress", "rejected", "hired"];
