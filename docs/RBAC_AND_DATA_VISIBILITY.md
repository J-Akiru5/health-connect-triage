# Role-Based Access Control (RBAC) and Data Visibility

This document describes how access control and data visibility work in Barangay Health Connect. It is intended for ethics compliance, JC-3 defensibility, and audit. **Row-level security (RLS)** on Supabase tables enforces server-side visibility; the app’s route and UI logic align with these rules.

---

## Roles

| Role       | Description |
|-----------|-------------|
| **Patient** | Barangay resident using the platform for telehealth (symptom check, consultations, referrals). |
| **BHW**     | Barangay Health Worker: conducts assisted intake, registers patients, views triage and referrals for their barangay. |
| **Clinician** | Nurse/doctor: validates triage, conducts consultations, creates referrals, views patient history and visit history for assigned patients. |
| **Admin**    | System administrator: user and barangay management, audit logs, analytics, research exports, AI triage oversight. |

---

## Route Access

### Public (unauthenticated)

- `/` — Home  
- `/symptom-checker` — Symptom checker (can use without account; submission may require login)  
- `/faq`, `/about`, `/login`, `/signup`, `/privacy`  

### Protected (authenticated)

All routes below require a valid session. Role checks are enforced in the app and, where applicable, by RLS.

| Route | Patient | BHW | Clinician | Admin |
|-------|---------|-----|-----------|-------|
| `/dashboard` | ✓ (patient dashboard) | ✓ (BHW dashboard) | ✓ (clinician dashboard) | Redirect to `/admin` |
| `/consultations` | ✓ (my appointments) | ✓ (barangay consultations) | ✓ (my schedule + list) | — |
| `/consultations/:id/chat` | ✓ if patient of that consultation | — | ✓ if provider of that consultation | — |
| `/profile` | ✓ (own profile) | ✓ | ✓ | — |
| `/referrals` | ✓ (own referrals) | ✓ (barangay referrals) | ✓ (referrals I created) | — |
| `/notifications` | ✓ (own) | ✓ | ✓ | — |
| `/medical-history` | ✓ (own) | ✓ | ✓ | — |
| `/triage-monitor` | — | ✓ (barangay triage) | ✓ (assigned patients’ triage) | — |
| `/patient-history` | — | — | ✓ (assigned patients only) | — |
| `/bhw/register-patient` | — | ✓ | — | — |
| `/bhw/assist-intake` | — | ✓ | — | — |
| `/bhw/activities` | — | ✓ | — | — |

### Admin-only routes

`AdminRoute` restricts these to `profile.role === 'admin'`:

- `/admin` — Admin dashboard  
- `/admin/users` — User management  
- `/admin/barangays` — Barangays  
- `/admin/ai-triage` — AI triage oversight  
- `/admin/teleconsult-referrals` — Teleconsult & referrals  
- `/admin/notifications` — Notifications & alerts  
- `/admin/audit` — Audit & reporting  
- `/admin/analytics` — Analytics (case counts, symptoms, referral rates)  
- `/admin/research-exports` — Research exports  

---

## Data Visibility (by role)

### Patient

- **Own data only:** profile, patient_profile, medical_history, consent_records, symptom_assessments (own), ai_triage_results (for own assessments), teleconsultations (where `patient_id` = self), consultation_messages and consultation_notes for those consultations, referrals (where `patient_id` = self), notifications (own).
- **Read:** barangays (for dropdowns).  
- **No access to:** other patients’ data, BHW activity logs, audit logs, admin tables.

### BHW

- **Own:** profile, consent when registering patients.  
- **Barangay-scoped:** patient_profiles, symptom_assessments, ai_triage_results, teleconsultations, referrals for patients in their `assigned_barangay_id`. Can create referrals (from_provider_id = self).  
- **Tables used:** bhw_activities (own actions), audit_logs (writes for own actions).  
- **No access to:** patients outside assigned barangay, clinician-only patient history, admin-only data.

### Clinician

- **Own:** profile.  
- **Assigned patients:** teleconsultations where `provider_id` = self → patient list; for those patients: patient_profiles, medical_histories, symptom_assessments, ai_triage_results, referrals, visit history (triage + consultations + referrals). consultation_messages and consultation_notes for their consultations (RLS: patient or provider of that teleconsultation).  
- **Referrals:** those they created (`from_provider_id` = self).  
- **No access to:** patients never assigned to them, other clinicians’ data, admin-only data.

### Admin

- **Full read** (subject to RLS) for reporting and oversight: profiles, barangays, patient_profiles, medical_histories, symptom_assessments, ai_triage_results, teleconsultations, referrals, audit_logs, notifications, research_exports, etc.  
- **Write** where the app allows: user/barangay management, notifications, research export requests.  
- Analytics and audit pages assume admin can read aggregated data (e.g. ai_triage_results, referrals) for reporting.

---

## RLS (Row-Level Security) Reference

Supabase RLS policies enforce who can SELECT/INSERT/UPDATE/DELETE. Key tables:

- **consultation_messages:** SELECT and INSERT only for the patient or provider of the related teleconsultation. No UPDATE/DELETE (log retention).  
- **consultation_notes:** SELECT for patient or provider of the teleconsultation; INSERT/UPDATE only for the provider of that consultation.  
- **referrals:** Application logic and RLS limit who can create or see referrals (patient vs provider vs BHW vs admin).  
- **profiles, patient_profiles, medical_histories, symptom_assessments, ai_triage_results, teleconsultations:** Policies should restrict reads/writes so that patients see only own data, BHWs only barangay-scoped data, clinicians only data for their consultations/patients, and admin has the access needed for dashboard/analytics/audit (often via service role or explicit admin policies).  

**Audit recommendation:** In the Supabase dashboard, review each table’s RLS policies and ensure they match the visibility matrix above. Add or adjust policies so that (1) patients never see other patients’ data, (2) BHWs see only data for their assigned barangay, (3) clinicians see only data for patients they serve, and (4) admin access is explicit and logged where required.

---

## Summary

- **Patient:** Own records and consultations only.  
- **BHW:** Own + barangay patients (assigned_barangay_id).  
- **Clinician:** Own + assigned patients (via teleconsultations and visit history).  
- **Admin:** Full access for system and reporting; use only for administration and research/audit as intended.  

All access is logged where applicable (e.g. audit_logs) for ethics and JC-3 compliance.
