import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowLeft, ArrowRight, Bot, Check,
  Compass, FileBarChart2, ShieldAlert, X
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const steps = [
  {
    icon: Compass,
    badge: 'Step 1 of 5 · System Overview',
    title: 'Welcome to MineGuard AI',
    subtitle: 'Autonomous Subterranean Intelligence & Safety Decision Support',
    description:
      'MineGuard AI is an industrial monitoring platform built specifically for underground mining operations. It connects environmental telemetry, autonomous robotics, and spatial twin data into a single verified control room.',
    keyPoints: [
      'Operational status at a glance without visual clutter',
      'Explainable decision support — not black-box predictions',
      'Integrates sensor feeds, robotics telemetry, and worker safety'
    ],
    path: '/command',
    actionLabel: 'Explore Overview'
  },
  {
    icon: Activity,
    badge: 'Step 2 of 5 · Live Telemetry',
    title: 'Live Mine Monitoring & 3D Map',
    subtitle: 'Environmental sensing and spatial twin across all mine levels',
    description:
      'Track real-time methane (CH4), carbon monoxide (CO), water levels, and temperature across underground sectors from -120m to -360m. Review interactive 2D schematics or full 3D subterranean views.',
    keyPoints: [
      'Instant detection of stale or failing communication links',
      'Sector-by-sector confidence rating (Known, Uncertain, Alert)',
      'Detailed telemetry history with configurable thresholds'
    ],
    path: '/monitoring',
    actionLabel: 'View Monitoring'
  },
  {
    icon: Bot,
    badge: 'Step 3 of 5 · Autonomous Robotics',
    title: 'Robotics Fleet Management',
    subtitle: 'Deploy and monitor autonomous rovers and cavity drones',
    description:
      'Supervise inspection rovers and aerial drones operating in hazardous, unventilated, or hard-to-access drifts. Inspect live telemetry, battery levels, obstacle proximity, and interactive 3D CAD models.',
    keyPoints: [
      'Real-time rover status: Active, Inspecting, Returning, Idle',
      'Live sensor sniffers and distance-to-obstacle telemetry',
      'Trigger autonomous return-to-dock or inspection sweeps'
    ],
    path: '/robotics',
    actionLabel: 'Inspect Robotics'
  },
  {
    icon: ShieldAlert,
    badge: 'Step 4 of 5 · Hazard Detection',
    title: 'Hazard Detection & Triage',
    subtitle: 'Early anomaly recognition and statutory action tracking',
    description:
      'Every atmospheric spike, sump surge, and rock convergence reading is logged into a centralized hazard queue with clear severity badges: Critical, High, Medium, and Low.',
    keyPoints: [
      'Filter hazards by severity, sector, or detection source',
      'Acknowledge safety alerts and dispatch work orders in one click',
      'Traceable audit trail for shift handovers and safety meetings'
    ],
    path: '/hazards',
    actionLabel: 'Review Hazards'
  },
  {
    icon: FileBarChart2,
    badge: 'Step 5 of 5 · Reports & Analytics',
    title: 'Analytics & Verifiable Reports',
    subtitle: 'Data-driven trends, safety compliance, and shift handovers',
    description:
      'Visualize 7-day and 30-day hazard trends, inspection resolution rates, and environmental curves. Export verified CSV shift handover reports directly for site records.',
    keyPoints: [
      'Safety and inspection completion trend curves',
      'One-click CSV shift report generation and printing',
      'Full compliance with transparency and data provenance standards'
    ],
    path: '/analytics',
    actionLabel: 'Open Analytics'
  }
];

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // If explicitly controlled via prop
    if (isOpen !== undefined) {
      setInternalOpen(isOpen);
      return;
    }
    // Otherwise check localStorage for first-time visitor
    try {
      const hasOnboarded = localStorage.getItem('mineguard_onboarding_completed');
      if (!hasOnboarded) {
        setInternalOpen(true);
      }
    } catch {}
  }, [isOpen]);

  const handleClose = () => {
    try {
      localStorage.setItem('mineguard_onboarding_completed', 'true');
    } catch {}
    setInternalOpen(false);
    if (onClose) onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleJump = (path: string) => {
    handleClose();
    navigate(path);
  };

  if (!internalOpen) return null;

  const step = steps[currentStep];
  const StepIcon = step.icon;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="onboarding-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-step-indicator">
            <span className="onboarding-badge">{step.badge}</span>
            <div className="onboarding-dots" aria-label={`Step ${currentStep + 1} of ${steps.length}`}>
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  className={`onboarding-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
                  onClick={() => setCurrentStep(idx)}
                  aria-label={`Jump to step ${idx + 1}`}
                />
              ))}
            </div>
          </div>
          <button
            className="icon-button onboarding-close"
            onClick={handleClose}
            aria-label="Skip onboarding tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="onboarding-body">
          <div className="onboarding-icon-wrap">
            <StepIcon size={26} />
          </div>
          <div className="onboarding-text">
            <h2 id="onboarding-title">{step.title}</h2>
            <div className="onboarding-subtitle">{step.subtitle}</div>
            <p className="onboarding-desc">{step.description}</p>

            <div className="onboarding-checklist">
              {step.keyPoints.map((point, i) => (
                <div key={i} className="onboarding-check-item">
                  <div className="onboarding-check-icon">
                    <Check size={14} />
                  </div>
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="onboarding-footer">
          <button
            className="button button-ghost"
            onClick={handleClose}
          >
            Skip Walkthrough
          </button>

          <div className="onboarding-footer-right">
            <button
              className="button button-secondary"
              onClick={() => handleJump(step.path)}
            >
              {step.actionLabel}
            </button>
            {currentStep > 0 && (
              <button
                className="button button-secondary"
                onClick={handlePrev}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button
              className="button button-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started <Check size={15} />
                </>
              ) : (
                <>
                  Next Step <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
