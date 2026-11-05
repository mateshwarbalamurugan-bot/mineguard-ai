import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useMineStore } from '../store/useMineStore';
import { mine } from '../data/seed';

const steps = [
  { title: 'The problem', duration: '15 sec', body: 'Missed hazards, delayed inspections and gaps in underground intelligence are the problem MineGuard is designed to make visible.' },
  { title: 'The mine', duration: '30 sec', body: 'This is fictional Kestrel Ridge: six zones, 36 expected sensors and 48 pseudonymous sample worker records.' },
  { title: 'The failure', duration: '30 sec', body: 'Trigger the Tunnel B sensor-communication scenario. A missing reading is not a safe reading.' },
  { title: 'The intelligence', duration: '40 sec', body: 'Follow the zone classification, evidence checklist and changed inspection priority. It is transparent decision support—not a prediction.' },
  { title: 'The inspection', duration: '35 sec', body: 'Open the ranked queue and create a verification task with an owner and due date.' },
  { title: 'The emergency drill', duration: '40 sec', body: 'Review last-verified checkpoint records only. This demo is not a rescue dispatch system and does not use live GPS.' },
  { title: 'Close', duration: '15 sec', body: 'MineGuard is an offline demo. It does not replace site procedures, statutory inspections, certified equipment or professional judgment.' },
];

export function GuidedDemoModal() {
  const open = useMineStore((state) => state.tourOpen);
  const step = useMineStore((state) => state.tourStep);
  const setOpen = useMineStore((state) => state.setTourOpen);
  const setStep = useMineStore((state) => state.setTourStep);
  const setScenario = useMineStore((state) => state.setScenario);
  const setDrill = useMineStore((state) => state.setDrillActive);
  if (!open) return null;
  const current = steps[step] ?? steps[0];
  function advance(next: number) {
    if (next === 2) setScenario('sensor-failure');
    if (next === 5) setDrill(true);
    if (next >= steps.length) { setOpen(false); setStep(0); return; }
    if (next < 0) return;
    setStep(next);
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="tour-modal" role="dialog" aria-modal="true" aria-labelledby="tour-title">
    <div className="tour-top"><div><span className="eyebrow">MINEGUARD · GUIDED DEMO · {mine.name}</span><h2 id="tour-title">{current.title}</h2></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Skip guided demo"><X size={18}/></button></div>
    <div className="tour-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((item, index) => <span key={item.title} className={index === step ? 'tour-progress-current' : index < step ? 'tour-progress-done' : ''}/>)}</div>
    <span className="tour-duration">STEP {step} OF 6 <span>·</span> {current.duration}</span><p>{current.body}</p><div className="tour-safety-note"><span className="tour-note-dot"/>Fictional sample data · no live mine connection</div>
    <div className="tour-actions"><button className="button button-secondary" onClick={() => setOpen(false)}>Skip tour</button><div>{step > 0 && <button className="button button-secondary" onClick={() => advance(step - 1)}><ArrowLeft size={14}/>Previous</button>}<button className="button button-primary" onClick={() => advance(step + 1)}>{step === steps.length - 1 ? 'Finish' : step === 5 ? 'Close tour' : 'Next step'}{step === steps.length - 1 ? <Check size={15}/> : <ArrowRight size={14}/>}</button></div></div>
  </section></div>;
}
