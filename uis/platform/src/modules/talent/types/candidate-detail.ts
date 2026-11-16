export type CandidateNote = {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
};

export type CandidateDetail = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  experience_years: number;
  applied_at: string;
  updated_at: string;
  notes?: CandidateNote[];
  notes_count: number;
};
