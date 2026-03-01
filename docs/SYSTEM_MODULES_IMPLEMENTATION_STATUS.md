# System Modules & Data Specification — Implementation Status

This document checks implementation of the **SYSTEM MODULES AND DATA SPECIFICATION** doc against the Barangay Health Connect app (database + frontend).

---

## 1. User & Identity Management Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| User ID (system-generated) | ✅ | Supabase `auth.users.id`; `profiles.id` mirrors it |
| Full Name | ✅ | `profiles.full_name` |
| Role (Patient, BHW, Nurse, Physician, Admin) | ✅ | `profiles.role` enum: patient, bhw, clinician, admin (Nurse/Physician = clinician) |
| Barangay Assignment | ✅ | `profiles.assigned_barangay_id` (clinicians/BHWs) |
| Contact Number | ✅ | `profiles.phone` |
| Email (optional) | ✅ | In Supabase Auth; not duplicated in profiles |
| Username | ⚠️ | Auth uses email; no separate username field in app |
| Encrypted Password | ✅ | Handled by Supabase Auth |
| Account Status (Active, Suspended, Deactivated) | ⚠️ | `profiles.is_active` (boolean); no explicit "Suspended" state |
| Last Login Timestamp | ❌ | Not stored in `profiles`; could use `auth.users.last_sign_in_at` if exposed |
| Role-permission mapping | ✅ | App + RLS: `ProtectedRoute`, `AdminRoute`, role checks in pages |
| Login audit logs | ✅ | `audit_logs` (e.g. login actions); Admin Audit page |
| Password reset logs | ❌ | Not implemented |
| Device/session metadata | ❌ | Not implemented |

**Verdict:** Core identity and RBAC are implemented; last login, password reset logs, and session metadata are not.

---

## 2. Patient Profile & Health Record Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Patient ID | ✅ | `profiles.id` (patient role) |
| Full Name | ✅ | `profiles.full_name`; patient_profiles has first_name, last_name, middle_initial |
| Date of Birth / Age | ✅ | `patient_profiles.date_of_birth` |
| Sex | ✅ | `patient_profiles.sex` |
| Barangay, Purok | ✅ | `patient_profiles.barangay_id`; address in street/city/province/zip (street used as Purok in UI) |
| Contact Information | ✅ | `patient_profiles.contact_phone` |
| Emergency Contact | ✅ | `patient_profiles.emergency_contact_name`, `emergency_contact_phone` |
| Existing Conditions | ✅ | `medical_histories.conditions` |
| Allergies | ✅ | `medical_histories.allergies` |
| Medications | ✅ | `medical_histories.medications` |
| Pregnancy status | ✅ | `medical_histories.pregnancy_status` |
| Profile update history | ❌ | No dedicated history table; only current snapshot |
| Data completeness flag | ❌ | Not implemented |
| Consent acknowledgment | ✅ | Signup consent; `consent_records` table |

**Verdict:** Core patient and health-record fields are implemented; profile history and completeness flag are not.

---

## 3. AI-Assisted Symptom Intake & Triage Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Date/time of consultation | ✅ | `symptom_assessments.submitted_at`, `created_at` |
| Symptom checklist (structured) | ✅ | `symptom_assessments.symptoms` (jsonb) |
| Duration of symptoms | ✅ | `symptom_assessments.duration` |
| Severity scale (mild–severe) | ✅ | `symptom_assessments.severity` |
| Vital signs (if available) | ✅ | `symptom_assessments.vitals` (jsonb) |
| Free-text description | ✅ | `symptom_assessments.notes` |
| Patient risk factors | ✅ | Captured in intake; stored in AI factors / assessment flow |
| Triage Category (Low/Moderate/High/Emergency) | ✅ | `ai_triage_results.triage_level`: home_care, non_urgent, urgent, emergency |
| Risk Score | ✅ | `ai_triage_results.risk_score` |
| Recommended Action | ✅ | `ai_triage_results.recommended_action` |
| Model confidence level | ⚠️ | Could be in `model_version` or metadata; not explicit column |
| AI decision log (explainability) | ✅ | `ai_triage_results.factors` (jsonb); UI shows "Factors considered" in BHW assist intake & validation |
| Human override | ✅ | `validated_by`, `validated_triage_level`, `provider_rationale`; Triage Monitor Validate dialog |

**Verdict:** Fully implemented for core triage and explainability; optional model confidence could be added.

---

## 4. Teleconsultation Management Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Consultation ID | ✅ | `teleconsultations.id` |
| Assigned Nurse/Physician | ✅ | `teleconsultations.provider_id` |
| Consultation Type (Chat / Audio / Video) | ⚠️ | No DB column; UI shows "Teleconsultation (Video Call)" but type not stored; in-app chat is implemented |
| Scheduled Time | ✅ | `teleconsultations.scheduled_at` |
| Case Summary (from triage) | ✅ | Via `assessment_id` → symptom_assessments + ai_triage_results |
| Consultation Notes | ✅ | `consultation_notes`: diagnosis, advice, treatment_plan, follow_up_date, notes |
| Diagnosis | ✅ | `consultation_notes.diagnosis` |
| Advice / Treatment Plan | ✅ | `consultation_notes.advice`, `treatment_plan` |
| Consultation transcripts | ✅ | `consultation_messages` (in-app chat) |
| Duration and timestamps | ✅ | `started_at`, `ended_at` |
| Missed or cancelled sessions | ✅ | `status`: no_show, cancelled |
| Follow-up flags | ✅ | `consultation_notes.follow_up_date` |
| Queue management (Start/Complete) | ✅ | Consultations page: Start, Complete; status in_progress, completed |

**Verdict:** Implemented; only gap is storing consultation type (chat/audio/video) in DB if needed.

---

## 5. Referral & Escalation Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Referral ID | ✅ | `referrals.id` |
| Reason for referral | ⚠️ | Can be in `prior_records_notes`; no dedicated "reason" field |
| Referring professional | ✅ | `referrals.from_provider_id` |
| Receiving facility | ✅ | `referrals.facility_name` |
| Urgency level | ✅ | `referrals.urgency`: routine, urgent, emergency |
| Supporting documents | ✅ | `referrals.required_documents` |
| Referral status | ✅ | `referrals.status`: pending, confirmed, completed, cancelled |
| Create referral (manual) | ✅ | CreateReferralModal; from Triage Monitor, Consultations, Referrals page |
| Referral outcome tracking | ⚠️ | Status only; no structured outcome field |
| Time-to-referral metrics | ❌ | Not computed or displayed |
| Escalation history | ❌ | No separate escalation log |

**Verdict:** Core referral creation and status are implemented; outcome tracking and time metrics are partial or missing.

---

## 6. BHW Operations Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Assigned households | ⚠️ | BHW sees by barangay (`assigned_barangay_id`); no household-level assignment table |
| Assisted consultations | ✅ | `symptom_assessments.reported_by`; BHW assist intake flow |
| Home visit records | ✅ | `bhw_activities` (activity_type, notes, patient_id, bhw_id) |
| Follow-up actions | ✅ | BHW Activities page; activity types |
| Community health notes | ✅ | `bhw_activities.notes` |
| Activity logs | ✅ | `bhw_activities` + audit_logs |
| BHW workload metrics | ❌ | No dashboard aggregating workload |
| Patient follow-up compliance | ❌ | Not implemented |

**Verdict:** Core BHW tasks (assist intake, activities, barangay-scoped data) are in place; workload and compliance metrics are not.

---

## 7. Notification & Alert Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Notification type | ✅ | `notifications.type` |
| Recipient | ✅ | `notifications.user_id` |
| Message content | ✅ | `notifications.title`, `body` |
| Priority level | ❌ | No priority column |
| Delivery channel (SMS, in-app) | ❌ | In-app only; no SMS or channel field |
| Delivery status | ❌ | No delivery_status; only read_at for in-app read |
| Read receipts | ✅ | `notifications.read_at` |
| Alert escalation tracking | ❌ | Not implemented |
| UI (in-app list) | ✅ | Notifications page; Admin Notifications |

**Verdict:** In-app notifications work; priority, delivery channel (e.g. SMS), and delivery/escalation tracking are not implemented.

---

## 8. Analytics & Reporting Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Consultation volume | ✅ | Admin Analytics (triage counts; consultations derivable) |
| Triage distribution | ✅ | Admin Analytics: counts by triage_level |
| Referral rates | ✅ | Admin Analytics: referral total, by status, by urgency |
| Response times | ❌ | Not computed or displayed |
| Barangay-level health trends | ⚠️ | Top factors/symptoms are global; no barangay breakdown in UI |
| Aggregated datasets | ✅ | Analytics queries |
| Exported reports (CSV/PDF) | ❌ | No export buttons in Analytics UI |
| Data anonymization logs | ⚠️ | research_exports track purpose/anonymized; no dedicated anonymization log |

**Verdict:** Dashboards and main metrics exist; response times, barangay-level trends, and CSV/PDF export are missing.

---

## 9. Consent, Ethics & Data Privacy Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Informed consent records | ✅ | `consent_records` (user_id, consent_type, version, accepted_at) |
| Terms acceptance timestamps | ✅ | `consent_records.accepted_at` |
| Data usage permissions | ✅ | Signup consent; Privacy page; consent_type in consent_records |
| Consent versioning | ✅ | `consent_records.version` |
| Withdrawal of consent | ✅ | `consent_records.withdrawn_at` |
| Data access audit trails | ✅ | `audit_logs`; RBAC doc; RLS |
| Privacy notice page | ✅ | `/privacy`; linked from signup |

**Verdict:** Implemented for core consent and privacy; withdrawal UI could be expanded if required.

---

## 10. System Configuration & Administration Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| User role definitions | ✅ | App + DB role enum; Admin Users management |
| AI threshold parameters | ❌ | No configurable AI thresholds in DB or Admin UI |
| Barangay registry | ✅ | `barangays` table; Admin Barangays CRUD |
| Health facility registry | ❌ | No facilities table; referral uses free-text `facility_name` |
| System logs | ✅ | `audit_logs`; Admin Audit page |
| Configuration change history | ❌ | No config table or versioning |
| Admin actions audit trail | ✅ | audit_logs (e.g. admin_create_research_export) |

**Verdict:** User and barangay management and audit exist; AI thresholds and health facility registry are not implemented.

---

## 11. Research Data Management Module (SHOULD)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| De-identified datasets | ✅ | research_exports (anonymized, consent_aligned, purpose); status workflow |
| Model performance metrics | ❌ | No dedicated table or UI |
| Annotation logs | ❌ | Not implemented |
| Admin UI for export requests | ✅ | Admin Research Exports: create, list, status |

**Verdict:** Export workflow and metadata exist; model metrics and annotation logs are not.

---

## 12. Training & Help Module (COULD)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| User manuals | ⚠️ | FAQ, About; no formal manual |
| Tutorial videos | ❌ | Not implemented |
| FAQs | ✅ | `/faq` page |

**Verdict:** FAQ and About only; no tutorials or full manuals.

---

## 13. Integration & Interoperability Module (COULD)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| LGU / DOH / hospital integration | ❌ | Not implemented (future) |

**Verdict:** Out of scope for current app.

---

## 14. Audit & Compliance Module (CORE)

| Spec field / capability | Status | Notes |
|-------------------------|--------|--------|
| Login logs | ✅ | audit_logs (login actions) |
| Data access logs | ✅ | audit_logs (resource, action, details) |
| Modification history | ✅ | audit_logs for key actions (triage validation, referral, assist intake, etc.) |
| Admin Audit UI | ✅ | Admin Audit: filter by resource/action, view logs |

**Verdict:** Implemented.

---

## Summary

- **Fully or largely implemented (CORE):** User & Identity (with minor gaps), Patient Profile & Health Record, AI Triage, Teleconsultation (except consultation_type in DB), Referral & Escalation (core flow), BHW Operations (core), Notifications (in-app), Analytics (dashboards), Consent & Privacy, Barangay Admin, Audit & Compliance.
- **Gaps (CORE):** Last login timestamp, password reset logs, session metadata; profile update history and data completeness; consultation_type (Chat/Audio/Video) in DB; referral reason field, time-to-referral, escalation history; notification priority and SMS/delivery channel; response times and barangay-level analytics; CSV/PDF export; AI threshold parameters; health facility registry; configuration change history.
- **SHOULD/COULD:** Research model metrics and annotation logs; training manuals/videos; LGU/DOH integration not started.

Use this document to prioritize next steps (e.g. health facility registry, notification priority/SMS, analytics export, AI thresholds) based on product and compliance needs.
