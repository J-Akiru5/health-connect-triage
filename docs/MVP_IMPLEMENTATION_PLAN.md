# MVP Missing Features — Implementation Plan

This plan outlines how to implement the gaps identified in [MVP_GAPS_ANALYSIS.md](./MVP_GAPS_ANALYSIS.md). Tasks are ordered by dependency and priority (P0 → P3). **Existing DB columns** that are already present but unused are noted so you can wire UI first where possible.

---

## Phase 0: Quick wins (1–2 days)

*Low risk, no new tables; unblocks documentation and one P0 item.*

### 0.1 Privacy notice page + encryption documentation (P2 MUST)

| Task | Details |
|------|---------|
| **Privacy / Data Use page** | Create `/privacy` route and page with: (1) what data we collect, (2) how it’s used (care, research if consented), (3) telehealth disclaimer, (4) RA 10173 / data subject rights, (5) contact. |
| **Encryption note** | Add short section (or footer link): “Data is encrypted in transit (HTTPS) and at rest (Supabase).” |
| **Links** | Add “Privacy” in footer and (optionally) next to consent checkboxes on Signup / BHWRegisterPatient. |

**Files:** New `src/pages/Privacy.tsx`, add route in `App.tsx`, update `Footer.tsx`.

---

### 0.2 Explainable triage in BHW result view (P1 MUST)

| Task | Details |
|------|---------|
| **Show contributing factors** | On BHW Assist Intake step 4 (result screen), after Risk score and Triage level, add a “Factors considered” section: list symptom labels and risk factor labels that were sent in `factors` (or derive from `selectedSymptoms` / `selectedRiskFactors`). |
| **Copy** | e.g. “These symptoms and risk factors contributed to the triage level.” |

**Files:** `src/pages/BHWAssistIntake.tsx` — add a small card/section that maps factor IDs to labels and displays them.

---

### 0.3 Human override for AI triage (P0 MUST)

**DB already has:** `ai_triage_results.validated_by`, `validated_at`, `validated_triage_level`, `provider_rationale`.

| Task | Details |
|------|---------|
| **Override UI** | Where triage result is shown to clinician/BHW (e.g. Triage Monitor row detail, or a “Validate triage” action): add dropdown for “Final triage level” (same 4 levels) and optional “Reason for change” text. On submit: update `ai_triage_results` with `validated_by`, `validated_at`, `validated_triage_level`, `provider_rationale`; if no change, set `validated_triage_level = triage_level` and rationale “Confirmed”. |
| **Audit** | Insert into `audit_logs`: action e.g. `triage_override` or `triage_validated`, resource `ai_triage_results`, details `{ assessment_id, original_level, validated_level, rationale }`. |
| **Display** | In Triage Monitor (and anywhere triage is shown), display “Validated: &lt;level&gt;” when `validated_triage_level` is set; show provider rationale if present. |

**Files:** `src/pages/TriageMonitor.tsx` (add row action + modal or inline form), optional shared component for “Validate triage” used elsewhere.

---

## Phase 1: Referral creation + auto-flag (2–3 days)

*Referrals table and status flow exist; add creation and optional auto-flag.*

### 1.1 Manual “Create referral” (P0 MUST)

| Task | Details |
|------|---------|
| **Entry points** | (1) Triage Monitor: per row, add “Create referral” (prefill patient, optional assessment/teleconsultation). (2) Consultations: from a consultation row, “Refer to facility” (prefill patient + teleconsultation_id). (3) Optional: Patient History or a dedicated “Referrals” tab for clinician. |
| **Form** | Facility name (text or select from config), urgency (routine / urgent / emergency), required documents (text), optional prior records notes. Patient and (if applicable) teleconsultation_id from context. `from_provider_id` = current user (clinician). |
| **API** | `INSERT` into `referrals` (patient_id, from_provider_id, facility_name, urgency, required_documents, prior_records_notes, teleconsultation_id [optional], status = 'pending'). |
| **Audit** | `audit_logs`: action `referral_created`, resource `referrals`, details `{ referral_id, patient_id, facility_name, urgency }`. |
| **RLS** | Ensure only clinicians (or BHW if you allow BHW to create) can insert; existing RLS for referrals read/update should be reviewed. |

**Files:** New component e.g. `CreateReferralModal.tsx` or inline form; use in `TriageMonitor.tsx`, `Consultations.tsx` (or Referrals page for clinician).

---

### 1.2 Automatic flagging of high-risk cases (P1 MUST)

| Task | Details |
|------|---------|
| **Option A — Auto-create referral** | After inserting `ai_triage_results` with triage_level in (`emergency`, `urgent`), insert a row into `referrals`: patient_id from assessment, from_provider_id = system or first-available clinician (or leave null and use “System”), facility_name e.g. “RHU / Emergency”, urgency = triage_level, status = 'pending'. Requires a rule: e.g. only when triage is emergency, or both emergency and urgent. |
| **Option B — Flag only** | Add a column e.g. `needs_referral` (boolean) on `ai_triage_results` or `symptom_assessments`, set true when triage is emergency/urgent. Show “Needs referral” badge in Triage Monitor and prompt clinician to create referral. |
| **Recommendation** | Start with **Option B** (flag + prominent “Create referral” in UI) to avoid duplicate referrals; later add Option A for emergency-only if desired. |

**Files:** If Option B: migration to add `needs_referral` (or use a view); in `SymptomChecker.tsx` and `BHWAssistIntake.tsx` after saving triage, set flag. Triage Monitor and Consultations already have “Create referral” from 1.1.

---

## Phase 2: Teleconsultation chat + consultation log (3–5 days)

*Core MUST: secure text-based chat and consultation log.*

### 2.1 Consultation messages (chat) — schema

| Task | Details |
|------|---------|
| **Table** | `consultation_messages`: `id` (uuid), `teleconsultation_id` (uuid, FK to teleconsultations), `sender_id` (uuid, FK to profiles), `body` (text), `created_at` (timestamptz). Optional: `read_at` per message or a “last read” per user per consultation. |
| **RLS** | Only patient and provider of that teleconsultation can select/insert. No delete (or soft delete only) for audit. |
| **Indexes** | `teleconsultation_id`, `created_at` for “messages by consultation, ordered by time”. |

**Deliverable:** Supabase migration adding `consultation_messages` and RLS policies.

---

### 2.2 Consultation chat UI

| Task | Details |
|------|---------|
| **Context** | One “room” per teleconsultation: patient and assigned provider see the same thread. |
| **Patient** | From Consultations page: for each of my teleconsultations (scheduled / in progress / completed), allow “Open chat” → thread view. |
| **Provider** | From Dashboard/Consultations: for each consultation assigned to me, “Open chat” → same thread. |
| **Thread view** | List messages by `created_at`; show sender (You / Patient / Dr. X); input at bottom to send new message (insert into `consultation_messages`). Polling every N seconds or Supabase Realtime subscription for new messages. |
| **Access control** | Ensure only `patient_id` and `provider_id` of that teleconsultation can load messages and post. |

**Files:** New page or modal `ConsultationChat.tsx` (or `ConsultationThread.tsx`); hooks or API helpers for fetch + send; link from Consultations list (and clinician dashboard) to `/consultations/:id/chat` or modal by id.

---

### 2.3 Consultation notes (clinician) — wire existing table

**DB already has:** `consultation_notes` (teleconsultation_id, provider_id, diagnosis, advice, treatment_plan, follow_up_date, notes).

| Task | Details |
|------|---------|
| **Where** | In the same consultation context (e.g. inside chat view or a “Notes” tab for this consultation): form for clinician only to add/edit one note row per teleconsultation (upsert by teleconsultation_id + provider_id). |
| **Fields** | Diagnosis, advice, treatment plan, follow-up date, notes. |
| **Display** | Show existing note in read-only to patient (optional) or only to clinician; clinician sees edit form. |

**Files:** Reuse or create `ConsultationNotesForm.tsx`; load/save `consultation_notes` in the consultation detail/chat view.

---

### 2.4 Consultation log storage (MVP requirement)

| Task | Details |
|------|---------|
| **Definition** | “Consultation log” = stored record of the consultation. This is satisfied by (1) `consultation_messages` (full thread) + (2) `consultation_notes` (structured clinician summary). No extra table needed if both are implemented. |
| **Retention** | RLS and no hard delete of messages (or audit trail) so the log is retained for care and research. |

---

## Phase 3: EHR — Visit history (1–2 days)

*Unified timeline of encounters per patient.*

### 3.1 Visit history view (P1 MUST)

| Task | Details |
|------|---------|
| **Who sees it** | Clinician (and optionally BHW for their barangay patients): per-patient view. |
| **Data** | For the selected patient: (1) Triage events: from `symptom_assessments` + `ai_triage_results` (date, triage level, who reported, factors summary). (2) Consultations: from `teleconsultations` (date, status, provider, link to chat/notes). (3) Referrals: from `referrals` (date, facility, urgency, status). |
| **UI** | Single list or timeline, ordered by date (newest first or chronological). Each row: type (Triage / Consultation / Referral), date, short summary, link to detail (e.g. triage result, chat, referral status). |
| **Where** | Extend Patient History page (clinician) to add a “Visit history” section or tab; or a dedicated “Visit history” route with patient selector. |

**Files:** `src/pages/PatientHistory.tsx` (add section or tab) or new `VisitHistory.tsx`; shared hook or function to aggregate triage + teleconsultations + referrals by patient_id.

---

## Phase 4: Analytics + RBAC documentation (1–2 days)

### 4.1 Basic analytics dashboard (P2 SHOULD)

| Task | Details |
|------|---------|
| **Location** | Admin only: new route e.g. `/admin/analytics` or a tab on Admin Dashboard. |
| **Metrics** | (1) Case counts by triage level (from `ai_triage_results`: count by triage_level). (2) Common symptoms: from `symptom_assessments.symptoms` (jsonb array) or `ai_triage_results.factors` — aggregate and show top N. (3) Referral rates: total referrals, by status, by urgency; optional: referrals per period. |
| **UI** | Cards or simple tables; optional date range filter. Export CSV optional later. |

**Files:** New `src/pages/admin/AdminAnalytics.tsx` (or extend `AdminDashboard.tsx`), add route and nav link.

---

### 4.2 RBAC documentation (P2 MUST)

| Task | Details |
|------|---------|
| **Doc** | Create `docs/RBAC_AND_DATA_VISIBILITY.md`: list roles (Patient, BHW, Clinician, Admin) and for each: which routes they can access; which tables/rows they can read/write (e.g. patients see only own data; BHW see barangay patients; clinician see assigned consultations and their patients; admin see all). Reference RLS policies if applicable. |
| **Audit** | Confirm RLS on all relevant tables matches the doc; fix if not. |

---

## Phase 5: Optional / later

### 5.1 Consent and data-use refinement (optional)

| Task | Details |
|------|---------|
| **Consent** | Separate checkboxes or versions for “data use” and “telehealth disclaimer”; store version strings in `consent_records` or metadata for audit. |

### 5.2 Queue management for clinicians (SHOULD)

| Task | Details |
|------|---------|
| **Queue** | Clinician dashboard: ordered list of scheduled/in-progress consultations (e.g. by scheduled_at or triage priority); actions “Start” (set status in_progress), “Complete” (set completed, then prompt for consultation notes). |

### 5.3 SMS gateway (P3 SHOULD)

| Task | Details |
|------|---------|
| **Gateway** | Integrate Twilio (or similar): send SMS for (1) case status updates (e.g. “Your referral was confirmed”), (2) appointment reminders. Store gateway config in env; optional `notification_preferences` per user (SMS yes/no). |

---

## Implementation order summary

| Order | Phase | Main deliverables |
|-------|--------|--------------------|
| 1 | **0** | Privacy page + encryption doc; explainable factors in BHW result; human override UI for triage (use existing DB columns). |
| 2 | **1** | Create-referral UI (Triage Monitor + Consultations); optional needs_referral flag for high-risk. |
| 3 | **2** | `consultation_messages` migration + RLS; chat UI (patient + provider); wire `consultation_notes` UI. |
| 4 | **3** | Visit history (triage + consultations + referrals) on Patient History or dedicated page. |
| 5 | **4** | Admin analytics (case counts, symptoms, referral rates); RBAC + data visibility doc. |
| 6 | **5** | Optional: consent refinement, queue actions, SMS. |

---

## Dependencies

- **Phase 0** has no dependency on other phases.
- **Phase 1** can run in parallel with Phase 0 after 0.1–0.2.
- **Phase 2** (chat) is the largest; start after 0 and 1 so referral creation is in place when you show “Refer to facility” from a consultation.
- **Phase 3** (visit history) uses teleconsultations, referrals, and triage; best after 1 and 2.
- **Phase 4** is independent; can be done anytime after basic data exists.

---

## Database changes checklist

| Item | Type | Phase |
|------|------|--------|
| `consultation_messages` table + RLS | New | 2 |
| `needs_referral` (or similar) on assessments/triage | Optional column or view | 1 |
| No change for: consultation_notes, ai_triage override columns, referrals | — | Use existing |

---

## Testing focus

- **Triage override:** Only clinician/BHW can validate; audit log and `validated_*` fields persist; display shows validated level.
- **Referrals:** Only allowed roles can create; RLS blocks other users; status updates and list views work.
- **Chat:** Only patient and provider of that consultation can read/write messages; no cross-consultation leakage.
- **Visit history:** Only clinician (and intended BHW scope) see the list; data matches triage + consultations + referrals for that patient.
- **Privacy page:** Accessible unauthenticated; linked from footer and signup.

---

*This plan aligns with the MVP gaps in MVP_GAPS_ANALYSIS.md and the MoSCoW priorities in the source MVP document.*
