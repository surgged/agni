import React, { useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  Loader2,
  Terminal,
  ExternalLink,
  Layers,
  Globe,
  Play,
  Box,
} from 'lucide-react';
import { App } from '@/types/app';
import { api, mapBackendAppToApp } from '@/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface DeploySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploySuccess?: (newApp: App) => void;
}

interface StepInfo {
  id: number;
  label: string;
  subtext: string;
  icon: React.ElementType;
}

const DEPLOY_STEPS: StepInfo[] = [
  {
    id: 1,
    label: 'Packaging',
    subtext: 'Packaging application files...',
    icon: Layers,
  },
  {
    id: 2,
    label: 'Building',
    subtext: 'Building application bundle...',
    icon: Box,
  },
  {
    id: 3,
    label: 'Environment',
    subtext: 'Setting up execution environment...',
    icon: Terminal,
  },
  {
    id: 4,
    label: 'Starting',
    subtext: 'Launching service instance...',
    icon: Play,
  },
  {
    id: 5,
    label: 'Live URL',
    subtext: 'Application live & domain routed',
    icon: Globe,
  },
];

export const DeploySimulatorModal: React.FC<DeploySimulatorModalProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
}) => {
  const [appName, setAppName] = useState('my-web-app');
  const [imageRef, setImageRef] = useState('ghcr.io/indralab/express-template:v1.0.0');

  const [isDeploying, setIsDeploying] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0); // 0 = not started, 1..5
  const [progress, setProgress] = useState<number>(0);
  const [stepLogs, setStepLogs] = useState<string[]>([]);
  const [deployedApp, setDeployedApp] = useState<App | null>(null);

  const resetState = () => {
    setIsDeploying(false);
    setCurrentStep(0);
    setProgress(0);
    setStepLogs([]);
    setDeployedApp(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const startSimulation = async () => {
    if (!appName.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsDeploying(true);
    setCurrentStep(1);
    setProgress(25);
    setStepLogs([
      `[1] Initiating deployment for app [${appName}]...`,
      `[2] Sending deployment request...`,
    ]);

    try {
      const res = await api.createApp({ name: appName.trim(), runtime: 'standard', imageRef });
      const liveApp = mapBackendAppToApp(res);
      setCurrentStep(5);
      setProgress(100);
      setStepLogs((prev) => [
        ...prev,
        `[SUCCESS] Deployed application [${liveApp.name}] (ID: ${liveApp.id})`,
      ]);
      setDeployedApp(liveApp);

      if (onDeploySuccess) {
        onDeploySuccess(liveApp);
      }
      toast.success(`Application ${liveApp.name} deployed successfully!`);
    } catch (err: any) {
      toast.error(err?.message || 'Deployment failed');
      setStepLogs((prev) => [...prev, `[ERROR] ${err?.message || 'Deployment failed'}`]);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[92vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Deploy New Application
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Deploy a new application to your workspace.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* Configuration Form */}
          {currentStep === 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="appName" className="text-xs font-semibold">
                  App Name
                </Label>
                <Input
                  id="appName"
                  placeholder="my-awesome-service"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="imageRef" className="text-xs font-semibold">
                  Repository / Image Reference
                </Label>
                <Input
                  id="imageRef"
                  placeholder="ghcr.io/org/repo:v1.0.0"
                  value={imageRef}
                  onChange={(e) => setImageRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <Button
                onClick={startSimulation}
                className="w-full h-10 mt-2 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Rocket className="h-4 w-4" /> Start Deployment
              </Button>
            </div>
          )}

          {/* Active Deployment Pipeline View */}
          {currentStep > 0 && (
            <div className="flex flex-col gap-5">
              {/* Progress Bar & Header */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {isDeploying ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    Deployment Progress — {progress}%
                  </span>
                  <span className="font-mono text-muted-foreground">
                    Step {currentStep} of 5
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Step Badges List */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {DEPLOY_STEPS.map((step) => {
                  const Icon = step.icon;
                  const isDone = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-lg border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : isCurrent
                          ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                          : 'bg-muted/30 border-border/40 text-muted-foreground opacity-60'
                      }`}
                    >
                      {isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      <span className="text-[10px] font-bold tracking-tight">
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Build Log Stream Box */}
              <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
                <div className="px-3 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Deployment Output
                  </span>
                </div>
                <div className="h-44 p-3 overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 bg-zinc-950">
                  {stepLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      {log.startsWith('[SUCCESS]') ? (
                        <span className="text-emerald-400 font-bold">{log}</span>
                      ) : (
                        <span className="text-sky-300">{log}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Completion CTA */}
              {currentStep === 5 && deployedApp && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-emerald-400 text-sm">
                        App Live & Operational!
                      </h4>
                      <p className="text-muted-foreground text-xs font-mono">
                        {deployedApp.serviceUrl}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="bg-emerald-500 text-black hover:bg-emerald-400 font-semibold"
                      onClick={() => window.open(deployedApp.serviceUrl, '_blank')}
                    >
                      Open App <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetState}
                  disabled={isDeploying}
                >
                  Deploy Another
                </Button>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
