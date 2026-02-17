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

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
