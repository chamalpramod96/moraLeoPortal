/**
 * Build-time settings, read once from Vite's env variables (see .env.example).
 * Import from here instead of reading import.meta.env around the codebase.
 */

// Demo mode: mock data from src/data/mockData.js, no Firebase reads or writes
export const IS_DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

// Demo mode only: the shared password for the mock accounts
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'demo1234';
