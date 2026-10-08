/**
 * Mock data — DEMO MODE ONLY (VITE_DEMO_MODE=true).
 *
 * The services return these arrays instead of reading Firestore when demo
 * mode is on. They're empty here; to try the portal locally without
 * Firebase, add test records (same shapes as the Firestore documents —
 * dates as { toDate: () => Date }) and sign in with a member's email and
 * the demo password (VITE_DEMO_PASSWORD, default "demo1234").
 *
 * Production builds have VITE_DEMO_MODE=false, so none of this is used.
 */

export const MOCK_MEMBERS       = [];
export const MOCK_EVENTS        = [];
export const MOCK_ATTENDANCE    = [];
export const MOCK_MEMBER_POINTS = [];
export const MOCK_PROJECTS      = [];
export const MOCK_ORIENTATION   = [];
export const MOCK_NOTICES       = [];
