import type { Hazard, Inspection, Reading, Sensor, Zone } from '../models/types';

export const priorityWeights = {
  unresolvedHazards: 25,
  sensorFailure: 30,
  inspectionAge: 15,
  missingInformation: 15,
  waterLevelChange: 8,
  structuralObservations: 5,
  incidentHistory: 2,
} as const;

export function deriveInspectionScores(inspections: Inspection[], zones: Zone[], sensors: Sensor[], readings: Reading[], hazards: Hazard[]): Inspection[] {
  return inspections.map((inspection) => {
    const zoneSensors = sensors.filter((sensor) => sensor.zoneId === inspection.zoneId);
    const zoneReadings = readings.filter((reading) => zoneSensors.some((sensor) => sensor.id === reading.sensorId));
    const zoneHazards = hazards.filter((hazard) => hazard.zoneId === inspection.zoneId && hazard.state === 'Open');
    const silentSensors = zoneSensors.filter((sensor) => sensor.status === 'silent');
    const missingReadings = zoneReadings.filter((reading) => reading.quality === 'Missing');
    const zone = zones.find((candidate) => candidate.id === inspection.zoneId);

    // Seed scores preserve the documented starting rank; live scenario contributions are computed from the derived data state.
    const sensorFailure = silentSensors.length > 0 ? priorityWeights.sensorFailure : 0;
    const missingInformation = missingReadings.length > 0 ? 16 : 0;
    const score = Math.min(100, inspection.score + sensorFailure + missingInformation);
    const evidence = [...inspection.evidence];
    if (sensorFailure && !evidence.some((item) => item.includes('communication lost'))) evidence.push(`${silentSensors[0].id} sensor communication lost`);
    if (missingInformation && !evidence.includes('Missing information +16')) evidence.push('Missing information +16');
    const reason = sensorFailure ? `Sensor failure +${sensorFailure} and missing information +${missingInformation}. Silence is not safety.` : zoneHazards.length ? `${inspection.reason} An open hazard observation remains unresolved.` : zone && (zone.state === 'UNKNOWN' || zone.state === 'UNCERTAIN') ? `${inspection.reason} Zone is ${zone.state}; verify the information gap.` : inspection.reason;
    return { ...inspection, score, reason, evidence, requiredVerification: inspection.requiredVerification, observations: inspection.observations };
  });
}
