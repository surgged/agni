import React, { useState, useEffect } from 'react';
import {
  Rocket,
  CheckCircle2,
  Loader2,
  Terminal,
  ShieldCheck,
  ExternalLink,
  Layers,
  Container,
  Cpu,
  Globe,
} from 'lucide-react';
import { App } from '@/types/app';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    label: 'Tarballing Source',
    subtext: 'Packaging source files & Dockerfile bundle...',
    icon: Layers,
  },
  {
    id: 2,
    label: 'nerdctl Build',
    subtext: 'Building container image with buildkit engine...',
    icon: Container,
  },
  {
    id: 3,
    label: 'containerd Push',
    subtext: 'Unpacking image layers & preparing MicroVM rootfs...',
    icon: Terminal,
  },
  {
    id: 4,
    label: 'Pod Provision',
    subtext: 'Booting Kata MicroVM with Firecracker hypervisor kernel...',
    icon: Cpu,
  },
  {
    id: 5,
    label: 'Live URL',
    subtext: 'Service healthy & domain routed via Agni ingress gateway',
    icon: Globe,
  },
];

export const DeploySimulatorModal: React.FC<DeploySimulatorModalProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
}) => {
  const [appName, setAppName] = useState('my-express-app');
  const [imageRef, setImageRef] = useState('ghcr.io/indralab/express-template:v1.0.0');
  const [runtime, setRuntime] = useState('kata-fc');

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

  const startSimulation = () => {
    if (!appName.trim()) {
      toast.error('App name is required');
      return;
    }

    setIsDeploying(true);
    setCurrentStep(1);
    setProgress(15);
    setStepLogs(['[1/5] Archiving source tree tarball workspace...']);
  };

  // Deployment timer pipeline simulation
  useEffect(() => {
    if (!isDeploying || currentStep === 0 || currentStep > 5) return;

    const timer = setTimeout(() => {
      if (currentStep === 1) {
        setStepLogs((prev) => [
          ...prev,
          '[1/5] Tarball compressed successfully (4.2 MB)',
          '[2/5] Invoking nerdctl build --namespace=agni ...',
          ' -> STEP 1/4: FROM node:20-alpine',
          ' -> STEP 2/4: COPY package.json ./',
          ' -> STEP 3/4: RUN npm install --production',
        ]);
        setCurrentStep(2);
        setProgress(35);
      } else if (currentStep === 2) {
        setStepLogs((prev) => [
          ...prev,
          ' -> STEP 4/4: CMD ["node", "server.js"]',
          '[2/5] Image build complete: sha256:7f9a2b0e...',
          '[3/5] Exporting layer snapshots to containerd socket...',
          ' -> Unpacking overlayfs rootfs image into /var/lib/containerd/io.containerd.snapshotter.v1.devmapper',
        ]);
        setCurrentStep(3);
        setProgress(60);
      } else if (currentStep === 3) {
        setStepLogs((prev) => [
          ...prev,
          '[3/5] containerd snapshotter ready',
          '[4/5] Provisioning Kata Containers v3.2.0 MicroVM...',
          ' -> Firecracker hypervisor jailer initialized',
          ' -> Allocating 1 vCPU, 512MB RAM, guest vmlinux kernel v5.15-kata',
          ' -> Guest agent online in 142ms',
        ]);
        setCurrentStep(4);
        setProgress(85);
      } else if (currentStep === 4) {
        const generatedId = `app-sim-${Date.now().toString(36)}`;
        const slug = appName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const liveApp: App = {
          id: generatedId,
          name: slug,
          ownerEmail: 'user@indralab.io',
          runtime,
          imageRef,
          podName: `pod-${slug}-vm${Math.floor(1000 + Math.random() * 9000)}`,
          serviceUrl: `https://${slug}.agni.dev`,
          shareUrl: `https://agni.dev/share/tok_${Math.random().toString(36).slice(2, 8)}`,
          status: 'LIVE',
          createdAt: new Date().toISOString(),
          metrics: {
            cpuPercent: 12.4,
            memoryMB: 184,
            memoryLimitMB: 512,
            requestsPerSec: 24,
            activePods: 1,
            networkRxKbps: 640,
            networkTxKbps: 1200,
          },
          envVars: {
            NODE_ENV: 'production',
            PORT: '8080',
          },
          shareCount: 0,
        };

        setStepLogs((prev) => [
          ...prev,
          '[5/5] Ingress proxy updated. HTTPS certificate provisioned',
          `[SUCCESS] App [${slug}] is live at https://${slug}.agni.dev`,
        ]);
        setCurrentStep(5);
        setProgress(100);
        setIsDeploying(false);
        setDeployedApp(liveApp);

        if (onDeploySuccess) {
          onDeploySuccess(liveApp);
        }
        toast.success(`MicroVM App ${slug} deployed successfully!`);
      }
    }, 1800);

    return () => clearTimeout(timer);
  }, [isDeploying, currentStep, appName, imageRef, runtime, onDeploySuccess]);

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
                Deploy MicroVM Simulator
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Trigger a step-by-step Kata MicroVM container build and deployment pipeline.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* Configuration Form (if not building or when reset) */}
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
                  Image Reference / Git Repository
                </Label>
                <Input
                  id="imageRef"
                  placeholder="ghcr.io/org/repo:v1.0.0"
                  value={imageRef}
                  onChange={(e) => setImageRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> MicroVM Runtime Engine
                </Label>
                <Select value={runtime} onValueChange={setRuntime}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select runtime" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kata-fc">
                      kata-fc — Firecracker MicroVM (Hardware Isolation)
                    </SelectItem>
                    <SelectItem value="firecracker">
                      Firecracker — Direct MicroVM Hypervisor
                    </SelectItem>
                    <SelectItem value="gvisor">
                      gVisor — Rule-based User-space Sandbox
                    </SelectItem>
                    <SelectItem value="runc">runc — Standard OCI Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={startSimulation}
                className="w-full h-10 mt-2 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Rocket className="h-4 w-4" /> Trigger Deployment Pipeline
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
                    Pipeline Progress — {progress}%
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
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" /> Deployment Log
                  </span>
                  <span>containerd.sock</span>
                </div>
                <div className="h-44 p-3 overflow-y-auto font-mono text-[11px] text-zinc-300 space-y-1 bg-zinc-950">
                  {stepLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      {log.startsWith('[SUCCESS]') ? (
                        <span className="text-emerald-400 font-bold">{log}</span>
                      ) : log.startsWith(' ->') ? (
                        <span className="text-zinc-400 pl-2">{log}</span>
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
                        App Live & Provisioned!
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
