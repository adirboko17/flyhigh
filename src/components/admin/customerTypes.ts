export type CustomerChild = {
  id: string;
  full_name: string;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  school_grade: number | null;
  grade_school_year: number | null;
  notes: string | null;
  created_at: string;
  healthDeclaration: {
    id_number: string;
    signed_at: string;
    accepted: boolean;
    child_name: string;
  } | null;
};

export type CustomerWithChildren = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: "male" | "female" | "other" | null;
  city: string | null;
  address: string | null;
  receipt_name: string | null;
  receipt_id_number: string | null;
  admin_note: string | null;
  created_at: string;
  children: CustomerChild[];
};
