# MVP Gaps Analysis: TeleHealth

> Status note (2026-04-21): Teleconsultation has been decommissioned from active scope. Teleconsultation-related items below are historical planning context and should not be treated as current implementation targets.

This document compares the **Minimum Viable Product (MVP)** defined in *MINIMUM VIABLE PRODUCT.docx* (Telehealth Platform for Rural Barangay with AI-Assisted Triage, MoSCoW) against the current TeleHealth application. It lists what is **missing or incomplete** to meet the MVP.

---

## Reference: MVP Design Principles (Non-Negotiable)

- Function in low-resource, low-bandwidth rural barangay settings  
- AI as **Decision Support System (DSS)**, not autonomous diagnosis  
- Deployable for extension in 1–2 barangays  
- Measurable research outputs (accuracy, usability, effectiveness)  
- Ethically compliant and auditable  

**User roles in scope:** Patient, Barangay Health Worker (BHW), Nurse/Doctor (clinician), System Administrator  

---

## MUST HAVE – Gaps (Core MVP)

### A. Patient & Case Intake Module

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Basic patient registration (name, age, sex, barangay) | Done | — |
| Consent capture (data use and telehealth disclaimer) | Partial | **Telehealth disclaimer** is in signup consent text; consider explicitly separating **data use** consent and **telehealth disclaimer** and storing version/text for audit. |
| Symptom input via structured questionnaire | Done | — |
| Medical history (basic comorbidities) | Done | — |

**Action:** Optional: add explicit data-use and telehealth disclaimer fields/versions in consent capture for clearer ethics compliance.

---

### B. AI-Assisted Triage Engine (Decision Support)

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Rule-based + weighted scoring triage logic | Done | — |
| Risk level: Emergency / Urgent / Non-urgent / Home care | Done | — |
| Explainable output (factors contributing to risk score) | Partial | Factors are **stored** in `ai_triage_results.factors` and symptom summary is shown in SymptomChecker. **BHWAssistIntake** does not show “factors contributing to risk” in the result screen. |
| Human override mechanism | **Missing** | No UI or flow for BHW/clinician to **override** the AI triage level (e.g. set a different urgency) and record the override for research/audit. |

**Actions:**

1. **Explainable output:** In BHW assist intake result view, show the contributing factors (symptoms + risk factors) that led to the triage level, aligned with “explainable DSS” for research.  
2. **Human override:** Add triage override (e.g. dropdown + reason) when viewing a triage result, persist override in DB and audit log.

---

### C. Teleconsultation (Low-Bandwidth)

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Secure text-based chat | **Missing** | No in-app chat. Consultations page handles **scheduling** only (book/list appointments). |
| Asynchronous messaging | **Missing** | No message thread per consultation. |
| Consultation log storage | **Missing** | No stored log of consultation messages or clinician notes per consultation. |

**Action:** Implement MUST-have teleconsultation flow:

- **Secure text-based chat** per `teleconsultation` (patient ↔ provider).  
- **Asynchronous messaging** (send/receive messages, no real-time required).  
- **Consultation log** table (e.g. `consultation_messages` or equivalent) with persistence and access limited by role and consultation id.

---

### D. Role-Based Access Control

| MVP Requirement | Status | Gap |
|----------------|--------|-----|
| Separate access for patients, BHWs, clinicians, admin | Done | `ProtectedRoute` and role-based routes. |
| Permission-based data visibility | Partial | Role-based pages exist; **permission-based data visibility** (e.g. row-level or resource-level rules) is not clearly formalized or documented. |
| Audit logging | Done | `audit_logs` used for key actions (login, assisted intake, referral updates, etc.). |

**Action:** Document and, if needed, tighten permission rules (e.g. which roles see which tables/rows) so that “permission-based data visibility” is explicit for ethics and JC-3.

---

### E. Electronic Health Record (Basic EHR)

| MVP Requirement | Status | Gap |
|----------------|--------|-----|
| Patient visit history | Partial | Clinician has **Patient History** (medical history). There is no unified **visit history** (e.g. list of encounters: triage events + consultations). |
| Triage results | Done | Stored in `ai_triage_results` and visible in Triage Monitor and flows. |
| Consultation notes | **Missing** | No structured consultation notes per teleconsultation (only scheduling/status). |
| Referral records | Partial | Referrals table and Referrals UI exist, but **creation** of referrals is missing (see F). |

**Actions:**

1. **Visit history:** Add a “visit history” (or timeline) per patient: triage events + consultations (and later referrals), so continuity of care is clear.  
2. **Consultation notes:** Add a “consultation notes” field (or structured form) per teleconsultation, written by clinician, stored and shown in EHR/visit history.

---

### F. Referral & Escalation Workflow

| MVP Requirement | Status | Gap |
|----------------|--------|-----|
| Automatic flagging of high-risk cases | Partial | High-risk triage appears in admin/triage views; no **automatic creation of a referral** or “flagged for referral” state when triage is emergency/urgent. |
| Manual referral to RHU/hospital | **Missing** | No UI or API to **create** a referral (e.g. from clinician/BHW) to RHU/hospital. Only **view/update status** of existing referrals exists. |
| Status tracking (pending, referred, resolved) | Done | Referral status is stored and updated (e.g. BHW update status). |

**Actions:**

1. **Automatic flagging:** When triage is emergency/urgent, either auto-create a referral or set a “needs referral” flag and show it in clinician/BHW workflow.  
2. **Manual referral:** Add “Create referral” (e.g. from Triage Monitor or Consultations) with facility (RHU/hospital), urgency, required documents, and link to patient/case; persist in `referrals` and audit.

---

### G. Data Security & Privacy Controls

| MVP Requirement | Status | Gap |
|----------------|--------|-----|
| Authentication and authorization | Done | Supabase Auth + role-based routes. |
| Encrypted data storage and transmission | Assumed | Supabase provides encryption in transit (HTTPS) and at rest; not explicitly documented in app. |
| Consent and privacy notices | Partial | Consent at signup and in flows; no dedicated **privacy notice** page or in-app link for “Consent and privacy notices.” |

**Actions:**

1. Document that encryption (transit + rest) is handled by Supabase.  
2. Add a **Privacy / Data Use** notice (and link from signup and footer) to satisfy “Consent and privacy notices” and RA 10173-style transparency.

---

## SHOULD HAVE – Gaps (Important but Non-Blocking)

### H. Appointment Scheduling

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Schedule teleconsultations | Done | Date/time selection and `scheduled_at` on teleconsultations. |
| Queue management for clinicians | Partial | Clinician sees list of scheduled/in-progress consultations; no explicit **queue** (e.g. order, priority, “next patient”) or queue management actions. |

**Action:** Optional: add a simple queue view for clinicians (e.g. ordered list, mark “in progress” / “done”) to improve workflow.

---

### I. Basic Analytics Dashboard

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Case counts by urgency | Partial | Admin dashboard has counts (e.g. high-risk triage, pending referrals); no dedicated **analytics** view. |
| Common symptoms | **Missing** | Not aggregated or shown. |
| Referral rates | **Missing** | Not computed or shown. |

**Action:** Add a simple analytics view (for admin or extension reporting): case counts by triage level, common symptoms (from `symptom_assessments`/`ai_triage_results`), referral counts/rates over time.

---

### J. SMS Notifications (Optional Gateway)

| MVP Requirement | Status | Gap |
|-----------------|--------|-----|
| Case status updates | **Missing** | No SMS. In-app notifications only. |
| Appointment reminders | **Missing** | Consultations page mentions “SMS or call within 24 hours” but no SMS integration. |

**Action:** Optional: integrate an SMS gateway (e.g. Twilio) for case status and appointment reminders for low-smartphone-penetration areas.

---

## COULD HAVE – Not Required for MVP

- **Voice or video consultation:** Not in scope for MVP; text-based chat is the MUST.  
- **Multi-language / local dialect:** Optional; not mandatory for pilot.  
- **Offline data capture with sync:** Optional; can be Phase 2.  

No gap list for these; they are explicitly deferrable.

---

## WON’T HAVE (Out of MVP Scope)

- Automated medical diagnosis  
- Prescription generation  
- Wearable/IoT integration  
- Insurance, billing, PhilHealth  

The app correctly avoids these; no changes needed for MVP alignment.

---

## Summary: Priority Fix List

| Priority | Item | Module |
|----------|------|--------|
| **P0 (MUST)** | Secure text-based chat + async messaging + consultation log storage | Teleconsultation |
| **P0 (MUST)** | Create referral (manual) from clinician/BHW to RHU/hospital | Referral & Escalation |
| **P0 (MUST)** | Human override for AI triage level (with audit) | AI Triage |
| **P1 (MUST)** | Explainable triage: show contributing factors in BHW result view | AI Triage |
| **P1 (MUST)** | Automatic flagging of high-risk cases (e.g. create referral or “needs referral”) | Referral & Escalation |
| **P1 (MUST)** | Consultation notes per teleconsultation; visit history (triage + consultations) | EHR |
| **P2 (SHOULD)** | Basic analytics: case counts by urgency, common symptoms, referral rates | Analytics |
| **P2 (MUST)** | Privacy notice page + document encryption (Supabase) | Security & Privacy |
| **P3 (SHOULD)** | SMS gateway for status updates and reminders | Notifications |

---

*Generated from MVP document: “MINIMUM VIABLE PRODUCT (MVP) Telehealth Platform for Rural Barangay with AI-Assisted Triage (MoSCoW Prioritization)”.*
