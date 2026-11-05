import type { VendorRecord } from '../models/types';

const field = (label: string, value: string, tag: 'VENDOR-PROVIDED' | 'NOT AVAILABLE' = 'VENDOR-PROVIDED') => ({ label, value, tag });
const unavailable = (label: string) => field(label, 'Not available', 'NOT AVAILABLE');

export const vendors: VendorRecord[] = [
  {
    id: 'sandvik', name: 'Sandvik', sourceId: 'sandvik',
    description: 'Mining Data Platform: OEM-agnostic monitoring of people, equipment and environment; positioning, 3D map, worker tag board, distress alerts, evacuation notifications, proximity analytics and environmental monitoring.',
    boundary: 'No integration or equivalence implied; MineGuard does not claim evacuation capability.',
    fields: [field('Source-supported scope', 'Underground monitoring of people, equipment and environment, positioning, 3D map, worker tag board, distress alerts, evacuation notifications, proximity analytics and environmental monitoring.'), field('Compatibility notes', 'Not available', 'NOT AVAILABLE'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'epiroc', name: 'Epiroc', sourceId: 'epiroc',
    description: 'Mobilaris Mining Intelligence: network awareness, 3D situational awareness, shift and emergency support, event automation and customizable dashboards.',
    boundary: 'No guaranteed evacuation, complete personnel accounting or verified coverage implied.',
    fields: [field('Source-supported scope', 'Network Awareness, 3D Situational Awareness, Shift Support, Emergency Support, Event Automation and customizable dashboards.'), unavailable('Compatibility notes'), field('Integration information', 'The page describes event flows based on Epiroc or other integrated-system data; specific interfaces and supported integrations are not available.'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'hexagon', name: 'Hexagon', sourceId: 'hexagon',
    description: 'Mine Safety portfolio includes collision avoidance, alertness monitoring, personal protection, proximity/fatigue/distraction monitoring and intervention.',
    boundary: 'Portfolio-level claims do not establish each function for every product; MineGuard makes no detection or machine-intervention claim.',
    fields: [field('Source-supported scope', 'Mine Safety portfolio description; functions vary by product and the reviewed page does not establish every function for each product.'), unavailable('Compatibility notes'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'caterpillar', name: 'Caterpillar', sourceId: 'caterpillar',
    description: 'Cat Mining overview describes equipment, technology and services; names Cat MineStar.',
    boundary: 'Underground functions: Not available.',
    fields: [field('Source-supported scope', 'Cat Mining overview names equipment, technology, services and Cat MineStar.'), field('Underground functions', 'Not available', 'NOT AVAILABLE'), unavailable('Compatibility notes'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'abb', name: 'ABB', sourceId: 'abb',
    description: 'Mining control systems, digital applications and remote operations; recommendation workflows are described with human sign-off.',
    boundary: 'MineGuard is not a substitute for mine control or ventilation systems.',
    fields: [field('Source-supported scope', 'Mining control systems, digital applications and remote operations; some recommendations are reviewed and signed off by a person.'), unavailable('Compatibility notes'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'becker', name: 'Becker Mining Systems', sourceId: 'becker',
    description: 'MineView AI visual analytics (drill/conveyor monitoring and PPE detection), live alerts and live/history dashboard; pilot comparison to site ground truth is described, but no published accuracy was reviewed.',
    boundary: 'No accuracy, compatibility or compliance claim.',
    fields: [field('Source-supported scope', 'MineView AI visual analytics for drill/conveyor monitoring and PPE detection, alerts and live/history dashboard.'), unavailable('Compatibility notes'), field('Integration information', 'Becker states MineView AI integrates with smartflow and existing automation systems; this does not establish MineGuard compatibility.'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'exyn', name: 'Exyn Technologies', sourceId: 'exyn',
    description: 'Pilot-free drone and portable ground systems; 3D maps, georeferenced models, Nexys and cavity monitoring.',
    boundary: 'MineGuard is not a mapping system or autonomous controller.',
    fields: [field('Source-supported scope', 'Pilot-free drone and portable ground systems, 3D maps, georeferenced models, Nexys and cavity monitoring.'), unavailable('Compatibility notes'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
  {
    id: 'emesent', name: 'Emesent', sourceId: 'emesent',
    description: 'Autonomous mapping, point-cloud capture and repeat surveys; volumetrics, over/under-break, convergence and inspection workflows.',
    boundary: 'No MineGuard scanning capability or compatibility implied.',
    fields: [field('Source-supported scope', 'Autonomous mapping, point-cloud capture, repeat surveys and mining workflows including volumetrics, over/under-break, convergence and inspection.'), unavailable('Compatibility notes'), unavailable('Integration information'), unavailable('Certifications'), unavailable('Pricing'), unavailable('Technical specifications')],
  },
];
