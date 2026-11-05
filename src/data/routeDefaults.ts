import type { Role } from '../models/types';

export const roleDestinations: Record<Role, { path: string; label: string }> = {
  'Mine Safety Officer': { path: '/inspections', label: 'Hazards & Inspections' },
  'Mine Manager': { path: '/command', label: 'Command Centre' },
  'Mining Engineer / Surveyor': { path: '/map', label: 'Mine Map' },
  'Control Room Operator': { path: '/monitoring', label: 'Live Monitoring' },
  'Procurement / Engineering': { path: '/reports', label: 'Reports' },
};
