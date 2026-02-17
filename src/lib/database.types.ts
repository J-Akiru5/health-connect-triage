export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          role: UserRole;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          role?: UserRole;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          role?: UserRole;
          updated_at?: string;
        };
      };
    };
    Enums: {
      user_role: UserRole;
    };
  };
};

export type UserRole = "patient" | "bhw" | "clinician" | "admin";

export type TriageLevel = "emergency" | "urgent" | "non_urgent" | "home_care";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// New tables (full types from Supabase codegen when available)
export type Barangay = { id: string; name: string; created_at: string };
export type PatientProfile = {
  id: string;
  user_id: string;
  date_of_birth: string | null;
  sex: string | null;
  barangay_id: string | null;
  contact_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
};
export type ConsentRecord = {
  id: string;
  user_id: string;
  consent_type: string;
  version: string;
  accepted_at: string;
  withdrawn_at: string | null;
  created_at: string;
};
export type MedicalHistory = {
  id: string;
  user_id: string;
  conditions: string | null;
  medications: string | null;
  allergies: string | null;
  pregnancy_status: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
