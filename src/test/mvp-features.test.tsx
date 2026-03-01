import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Privacy from "@/pages/Privacy";
import { CreateReferralModal } from "@/components/CreateReferralModal";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "clinician-1" },
    profile: { role: "clinician" },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "ref-1" }, error: null }) }) }),
    }),
  },
}));

describe("MVP features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Privacy page renders without crashing", () => {
    render(
      <MemoryRouter>
        <Privacy />
      </MemoryRouter>
    );
    expect(screen.getByText(/Privacy & Data Use Notice/i)).toBeInTheDocument();
    expect(screen.getByText(/What data we collect/i)).toBeInTheDocument();
    expect(screen.getByText(/encrypted in transit/i)).toBeInTheDocument();
  });

  it("CreateReferralModal renders when open with prefilled patient", () => {
    const onSuccess = () => {};
    const onOpenChange = () => {};
    render(
      <CreateReferralModal
        open={true}
        onOpenChange={onOpenChange}
        prefilledPatient={{ id: "patient-1", name: "Juan Dela Cruz" }}
        onSuccess={onSuccess}
      />
    );
    expect(screen.getByRole("heading", { name: /Create referral/i })).toBeInTheDocument();
    expect(screen.getByText(/Juan Dela Cruz/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Facility name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create referral/i })).toBeInTheDocument();
  });
});
