from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


@dataclass(frozen=True)
class TestCase:
    id: str
    module: str
    title: str
    priority: str  # P0/P1/P2/P3
    type: str  # Functional/Security/RBAC/UX/Data
    role: str  # Patient/BHW/Clinician/Admin/Anon/System
    preconditions: str
    steps: str
    expected_result: str
    notes: str = ""


def _wrap(text: str) -> str:
    return (text or "").strip()


def build_test_cases() -> List[TestCase]:
    # Derived from docs/MVP_IMPLEMENTATION_PLAN.md "Testing focus" + feature list.
    return [
        # Phase 0.1 Privacy
        TestCase(
            id="PRIV-001",
            module="Privacy",
            title="Privacy page loads without authentication",
            priority="P2",
            type="Functional",
            role="Anon",
            preconditions="App is deployed/running; route `/privacy` exists.",
            steps="1. Open a new incognito/private browser window.\n2. Navigate to `/privacy`.\n3. Verify page content renders.",
            expected_result="Privacy/Data Use page is accessible without login and renders expected sections (data collected, usage, telehealth disclaimer, RA 10173 rights, contact).",
        ),
        TestCase(
            id="PRIV-002",
            module="Privacy",
            title="Footer contains Privacy link",
            priority="P2",
            type="UX",
            role="Anon",
            preconditions="Footer is visible on public pages.",
            steps="1. Open the landing/login page.\n2. Scroll to footer.\n3. Click the Privacy link.",
            expected_result="Clicking Privacy navigates to `/privacy` and the page loads successfully.",
        ),
        TestCase(
            id="PRIV-003",
            module="Privacy",
            title="Encryption note is visible",
            priority="P2",
            type="UX",
            role="Anon",
            preconditions="Privacy page includes an encryption note.",
            steps="1. Open `/privacy`.\n2. Locate the encryption note/section.",
            expected_result="Page states that data is encrypted in transit (HTTPS) and at rest (Supabase).",
        ),
        # Phase 0.2 Explainable triage factors
        TestCase(
            id="TRIAGE-EXP-001",
            module="BHW Assist Intake",
            title="Triage result shows factors considered",
            priority="P1",
            type="Functional",
            role="BHW",
            preconditions="BHW can run BHW Assist Intake; triage result screen exists.",
            steps="1. Log in as BHW.\n2. Start BHW Assist Intake.\n3. Select symptoms and risk factors.\n4. Complete intake to reach the result screen.\n5. Locate the 'Factors considered' section.",
            expected_result="Result screen displays a 'Factors considered' section listing selected symptoms and risk factors (human-readable labels).",
        ),
        TestCase(
            id="TRIAGE-EXP-002",
            module="BHW Assist Intake",
            title="Factors considered matches selected inputs",
            priority="P1",
            type="Data",
            role="BHW",
            preconditions="BHW Assist Intake allows selecting symptoms/risk factors.",
            steps="1. Log in as BHW.\n2. Run intake selecting a known set of symptoms A and risk factors B.\n3. On result screen, compare listed factors with A and B.",
            expected_result="Displayed factors match the user selections (no missing/extra items beyond those sent/derived).",
        ),
        # Phase 0.3 Triage validation/override
        TestCase(
            id="TRIAGE-VAL-001",
            module="Triage Monitor",
            title="Clinician can validate triage without change (confirm)",
            priority="P0",
            type="Functional",
            role="Clinician",
            preconditions="A triage result exists and is visible in Triage Monitor.",
            steps="1. Log in as Clinician.\n2. Open Triage Monitor.\n3. Open a triage result detail / validate action.\n4. Select final triage level equal to AI triage level.\n5. Submit validation.",
            expected_result="`ai_triage_results.validated_by`, `validated_at`, `validated_triage_level` are set; rationale is stored as 'Confirmed' (or equivalent). UI displays 'Validated: <level>'.",
        ),
        TestCase(
            id="TRIAGE-VAL-002",
            module="Triage Monitor",
            title="Clinician can override triage with rationale",
            priority="P0",
            type="Functional",
            role="Clinician",
            preconditions="A triage result exists and is visible in Triage Monitor.",
            steps="1. Log in as Clinician.\n2. Open Triage Monitor.\n3. Open validate/override action for a triage result.\n4. Change final triage level to a different level.\n5. Enter a reason for change.\n6. Submit.",
            expected_result="Validated triage differs from original; provider rationale is saved and visible in UI where triage is shown.",
        ),
        TestCase(
            id="TRIAGE-VAL-003",
            module="Audit Logs",
            title="Triage validate/override writes audit log entry",
            priority="P0",
            type="Security",
            role="Clinician",
            preconditions="Audit logging is enabled for triage validation/override.",
            steps="1. Perform TRIAGE-VAL-001 or TRIAGE-VAL-002.\n2. Open audit logs view (or query audit_logs via admin tooling).\n3. Locate the latest entry for the action.",
            expected_result="An `audit_logs` record exists with action `triage_override` or `triage_validated`, resource `ai_triage_results`, and details containing assessment_id, original_level, validated_level, and rationale.",
        ),
        TestCase(
            id="TRIAGE-VAL-004",
            module="Triage Monitor",
            title="Patient cannot validate or override triage",
            priority="P0",
            type="RBAC",
            role="Patient",
            preconditions="A triage result exists in system; patient has access to their own views.",
            steps="1. Log in as Patient.\n2. Navigate to any triage result view available to patient.\n3. Attempt to find validate/override controls.\n4. If control is accessible via URL, attempt to access it directly.",
            expected_result="No validate/override UI is shown to patient; any direct access/update attempts are blocked by authorization/RLS.",
        ),
        # Phase 1.1 Referrals
        TestCase(
            id="REF-CRT-001",
            module="Referrals",
            title="Clinician can create referral from Triage Monitor",
            priority="P0",
            type="Functional",
            role="Clinician",
            preconditions="At least one triage case exists in Triage Monitor.",
            steps="1. Log in as Clinician.\n2. Open Triage Monitor.\n3. Click 'Create referral' for a case.\n4. Fill facility, urgency, required documents, and notes.\n5. Submit.",
            expected_result="A `referrals` row is created with status 'pending' and correct linkage to patient (and optional related ids).",
        ),
        TestCase(
            id="REF-CRT-002",
            module="Referrals",
            title="Clinician can create referral from Consultation",
            priority="P0",
            type="Functional",
            role="Clinician",
            preconditions="A teleconsultation exists and is visible in clinician consultations list.",
            steps="1. Log in as Clinician.\n2. Open Consultations.\n3. Select a consultation.\n4. Click 'Refer to facility'.\n5. Submit referral form.",
            expected_result="Referral is created and includes `teleconsultation_id` (if applicable).",
        ),
        TestCase(
            id="REF-CRT-003",
            module="Audit Logs",
            title="Referral creation writes audit log entry",
            priority="P0",
            type="Security",
            role="Clinician",
            preconditions="Referral creation is implemented and audit logging is enabled.",
            steps="1. Create a referral (REF-CRT-001).\n2. Open audit logs view (or query audit_logs via admin tooling).\n3. Locate `referral_created` entry.",
            expected_result="An `audit_logs` record exists with action `referral_created`, resource `referrals`, and details include referral_id, patient_id, facility_name, urgency.",
        ),
        TestCase(
            id="REF-RBAC-001",
            module="Referrals",
            title="Patient cannot create referrals",
            priority="P0",
            type="RBAC",
            role="Patient",
            preconditions="Patient account exists; referral creation UI exists for clinicians.",
            steps="1. Log in as Patient.\n2. Attempt to navigate to referral creation route/modal (if reachable).\n3. Attempt to create a referral via UI/URL.",
            expected_result="Patient cannot access referral creation UI; insert attempts fail authorization/RLS.",
        ),
        # Phase 1.2 High risk flagging (Option B)
        TestCase(
            id="REF-FLAG-001",
            module="Triage",
            title="High-risk triage is flagged as needs referral",
            priority="P1",
            type="Data",
            role="System",
            preconditions="System flags urgent/emergency triage results as needing referral.",
            steps="1. Submit an assessment that results in 'urgent' or 'emergency'.\n2. Open the triage record in Triage Monitor (or inspect stored triage data).",
            expected_result="Case shows a 'Needs referral' badge/indicator and underlying stored flag is true (if implemented as Option B).",
            notes="If Option A auto-creates referrals is used instead, replace with 'Referral auto-created' validation.",
        ),
        # Phase 2 Chat
        TestCase(
            id="CHAT-001",
            module="Consultation Chat",
            title="Patient and provider can exchange messages",
            priority="P1",
            type="Functional",
            role="Patient/Clinician",
            preconditions="A teleconsultation exists with assigned provider; chat route is available.",
            steps="1. Log in as Patient; open chat for a teleconsultation.\n2. Send a message.\n3. Log in as assigned Clinician; open the same chat.\n4. Verify message appears.\n5. Clinician replies.\n6. Patient verifies reply appears.",
            expected_result="Messages persist in chronological order and are visible to both parties in the same consultation.",
        ),
        TestCase(
            id="CHAT-002",
            module="Consultation Chat",
            title="User cannot read/write messages for consultations they are not part of",
            priority="P0",
            type="Security",
            role="Patient/Clinician",
            preconditions="At least two teleconsultations exist with different participants.",
            steps="1. Log in as Patient A.\n2. Attempt to open chat for a teleconsultation that belongs to Patient B.\n3. Attempt to send a message if the UI loads.\n4. Repeat as Clinician not assigned to the consultation.",
            expected_result="Access is denied; no messages are leaked; inserts are blocked by RLS.",
        ),
        TestCase(
            id="CHAT-003",
            module="Consultation Chat",
            title="Chat shows sender labels correctly (You/Patient/Dr.)",
            priority="P2",
            type="UX",
            role="Patient/Clinician",
            preconditions="Chat UI implemented with message bubble styling and sender label.",
            steps="1. Open a consultation chat with at least 3 messages from both parties.\n2. Verify each message shows correct sender identity and 'You' for current user.",
            expected_result="Sender labels and alignment are correct for both patient and provider views.",
        ),
        # Phase 2 Notes
        TestCase(
            id="NOTES-001",
            module="Consultation Notes",
            title="Clinician can create or update consultation notes (upsert)",
            priority="P1",
            type="Functional",
            role="Clinician",
            preconditions="Teleconsultation exists and clinician is assigned; notes UI exists.",
            steps="1. Log in as assigned Clinician.\n2. Open a consultation detail/chat.\n3. Enter diagnosis, advice, treatment plan, follow-up date, and notes.\n4. Save.\n5. Reopen and edit fields.\n6. Save again.",
            expected_result="A single note record per teleconsultation+provider is created/updated; latest values persist.",
        ),
        TestCase(
            id="NOTES-002",
            module="Consultation Notes",
            title="Patient cannot edit clinician notes",
            priority="P0",
            type="RBAC",
            role="Patient",
            preconditions="Consultation has notes recorded.",
            steps="1. Log in as Patient.\n2. Open the consultation.\n3. Attempt to edit notes (if visible) or access edit route directly.",
            expected_result="Patient cannot edit notes; any update attempts are blocked by authorization/RLS.",
        ),
        # Phase 3 Visit history
        TestCase(
            id="HIST-001",
            module="Visit History",
            title="Clinician sees unified visit history for a patient",
            priority="P1",
            type="Functional",
            role="Clinician",
            preconditions="Patient has at least one triage, one referral, and one teleconsultation.",
            steps="1. Log in as Clinician.\n2. Open Patient History/Visit History for that patient.\n3. Review list/timeline ordering and entries.\n4. Open detail links for each entry type.",
            expected_result="History shows triage, consultations, and referrals with correct dates, summaries, and working links to details.",
        ),
        TestCase(
            id="HIST-002",
            module="Visit History",
            title="BHW access to visit history respects intended scope",
            priority="P1",
            type="RBAC",
            role="BHW",
            preconditions="BHW scope rules are defined (e.g., barangay patients only).",
            steps="1. Log in as BHW.\n2. Open visit history for an in-scope patient.\n3. Verify it loads.\n4. Attempt to open visit history for an out-of-scope patient.",
            expected_result="In-scope patient history is accessible; out-of-scope patient access is denied or not discoverable.",
        ),
        # Phase 4 Analytics
        TestCase(
            id="ANALYTICS-001",
            module="Admin Analytics",
            title="Admin analytics page accessible to admin only",
            priority="P2",
            type="RBAC",
            role="Admin",
            preconditions="Admin analytics route exists (e.g., `/admin/analytics`).",
            steps="1. Log in as Admin.\n2. Open analytics route.\n3. Log out.\n4. Log in as non-admin (patient/clinician/bhw) and attempt to open the same route.",
            expected_result="Admin can access analytics; non-admin users are blocked/redirected.",
        ),
        TestCase(
            id="ANALYTICS-002",
            module="Admin Analytics",
            title="Analytics metrics render with correct totals",
            priority="P2",
            type="Data",
            role="Admin",
            preconditions="System has existing triage results and referrals.",
            steps="1. Log in as Admin.\n2. Open analytics.\n3. Verify case counts by triage level.\n4. Verify referral totals by status/urgency.\n5. Verify 'common symptoms' top list appears when data exists.",
            expected_result="Counts/tables render and totals match underlying data for the selected date range (if filter exists).",
        ),
        # RBAC doc check
        TestCase(
            id="DOC-RBAC-001",
            module="Documentation",
            title="RBAC doc exists and matches enforced behavior",
            priority="P2",
            type="Security",
            role="Admin",
            preconditions="`docs/RBAC_AND_DATA_VISIBILITY.md` exists and app enforces RBAC/RLS.",
            steps="1. Open `docs/RBAC_AND_DATA_VISIBILITY.md`.\n2. Sample at least 3 documented restrictions (e.g., chat access, referral creation, triage validation).\n3. Verify behavior in app matches documentation.",
            expected_result="Documentation exists and accurately reflects real access controls (UI + server/RLS).",
        ),
    ]


def write_xlsx(cases: List[TestCase], out_path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.title = "Test Cases"

    headers = [
        "ID",
        "Module",
        "Title",
        "Priority",
        "Type",
        "Role",
        "Preconditions",
        "Steps",
        "Expected Result",
        "Notes",
    ]
    ws.append(headers)

    for tc in cases:
        ws.append(
            [
                tc.id,
                tc.module,
                tc.title,
                tc.priority,
                tc.type,
                tc.role,
                _wrap(tc.preconditions),
                _wrap(tc.steps),
                _wrap(tc.expected_result),
                _wrap(tc.notes),
            ]
        )

    # Styling
    header_fill = PatternFill("solid", fgColor="1F2937")  # slate-800
    header_font = Font(color="FFFFFF", bold=True)
    header_alignment = Alignment(vertical="center", wrap_text=True)
    body_alignment = Alignment(vertical="top", wrap_text=True)

    for col_idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=col_idx)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = header_alignment

    # Column widths
    widths = {
        "A": 12,  # ID
        "B": 22,  # Module
        "C": 38,  # Title
        "D": 10,  # Priority
        "E": 14,  # Type
        "F": 16,  # Role
        "G": 28,  # Preconditions
        "H": 44,  # Steps
        "I": 44,  # Expected
        "J": 26,  # Notes
    }
    for col_letter, width in widths.items():
        ws.column_dimensions[col_letter].width = width

    # Row formatting
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(ws.max_column)}{ws.max_row}"

    for row in ws.iter_rows(min_row=2, max_row=ws.max_row, min_col=1, max_col=ws.max_column):
        for cell in row:
            cell.alignment = body_alignment

    # Metadata sheet
    meta = wb.create_sheet("Meta")
    meta["A1"] = "Generated At"
    meta["B1"] = datetime.now().isoformat(timespec="seconds")
    meta["A2"] = "Source"
    meta["B2"] = "docs/MVP_IMPLEMENTATION_PLAN.md"
    meta["A3"] = "Rows"
    meta["B3"] = len(cases)
    meta.column_dimensions["A"].width = 18
    meta.column_dimensions["B"].width = 60

    out_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out_path)


def main() -> None:
    out_path = Path("docs/test-cases.xlsx")
    cases = build_test_cases()
    write_xlsx(cases, out_path)
    print(f"Wrote {len(cases)} test cases to {out_path}")


if __name__ == "__main__":
    main()

