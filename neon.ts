import { defineConfig } from "@neon/config/v1";

/** Long-lived branches that must never auto-expire. */
const PERSISTENT_BRANCHES = new Set(["demo", "dev", "preview"]);

export default defineConfig({
  // Declare your Neon services here
  auth: false,
  // Private bucket for registration documents, CVs and profile images.
  // Access is always mediated by /api/files/[id] (owner / admin / approved
  // organization); objects are never served publicly.
  buckets: {
    documents: { access: "private" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists && !PERSISTENT_BRANCHES.has(branch.name)) {
      // New throwaway branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing / persistent branch: no changes
    return {};
  },
});
