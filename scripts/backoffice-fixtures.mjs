export const tokenKey = "brasaland.backoffice.token";
export const timestamp = "2026-11-01T10:00:00Z";
export const profile = { id: "synthetic-profile", user_id: "synthetic-user", name: "Synthetic Manager", phone: null, address: null };
export const user = { id: "synthetic-user", email: "synthetic@example.test", role: "manager", profile };
export const supplier = { id: 1, name: "Synthetic supplier", country: "Colombia", categories: ["carne"], rate_per_unit: 12.5, currency: "COP", status: "active", contact_email: null, notes: null, updated_at: timestamp };
export const incident = { id: "synthetic-incident", title: "Synthetic incident", description: "Synthetic oven maintenance", category: "equipment_failure", origin: "branch", branch: "miami_doral", status: "open", created_at: timestamp, updated_at: timestamp };
export const products = [0, 25, 100].map((current_stock, index) => ({
  id: index + 1, name: `Synthetic product ${index + 1}`, sku: `SYN-${index + 1}`, unit: "kg", category: "meat", country: "CO", current_stock,
}));
export const candidate = {
  id: "synthetic-candidate", full_name: "Synthetic Candidate", email: "candidate@example.test",
  phone: "0000000000", position: "Cocina", status: "received", stage: "pending",
  experience_years: 2, applied_at: timestamp, updated_at: timestamp,
  linkedin_url: null, cv_url: null, notes_count: 0,
};
