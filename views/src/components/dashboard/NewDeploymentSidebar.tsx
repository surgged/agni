import React, { useState, useRef } from 'react';
import {
  Rocket,
  CheckCircle2,
  Loader2,
  UploadCloud,
  FileArchive,
  ArrowRight,
  ArrowLeft,
  Box,
  Copy,
  Check,
  X,
  Server,
  Terminal,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { App } from '@/types/app';
import { api, CreateAppResponse, mapBackendAppToApp } from '@/api';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface NewDeploymentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploySuccess?: (newApp: App) => void;
}

export const NewDeploymentSidebar: React.FC<NewDeploymentSidebarProps> = ({
  isOpen,
  onClose,
  onDeploySuccess,
}) => {
  // Step state: 1 = Create App, 2 = Upload Archive & Deploy, 3 = Complete / Queued
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 Form States
  const [appName, setAppName] = useState('my-express-app');
  const [runtime, setRuntime] = useState('kata');
  const [port, setPort] = useState<number>(8080);
  const [isCreatingApp, setIsCreatingApp] = useState(false);

  // Created App response state
  const [createdApp, setCreatedApp] = useState<CreateAppResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Step 2 Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');

  // Step 3 Result State
  const [deployedApp, setDeployedApp] = useState<App | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setStep(1);
    setAppName('my-express-app');
    setRuntime('kata');
    setPort(8080);
    setIsCreatingApp(false);
    setCreatedApp(null);
    setSelectedFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadStatusText('');
    setDeployedApp(null);
    setCopiedUrl(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // STEP 1: Create App API Call
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName.trim()) {
      toast.error('Application name is required');
      return;
    }

    setIsCreatingApp(true);
    try {
      const res = await api.createApp({
        name: appName.trim(),
        runtime,
        port: Number(port) || 8080,
      });

      setCreatedApp(res);
      setStep(2);
      toast.success('App initialized! Upload pre-signed URL generated.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create app');
    } finally {
      setIsCreatingApp(false);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip') || file.name.endsWith('.tar.gz') || file.name.endsWith('.tgz')) {
        setSelectedFile(file);
      } else {
        toast.error('Please upload a valid .zip or .tar.gz archive file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // STEP 2: Upload Archive to Pre-signed URL & Call Deploy
  const handleUploadAndDeploy = async () => {
    if (!createdApp || !createdApp.upload_url) {
      toast.error('No valid pre-signed URL found. Please recreate the app.');
      return;
    }

    if (!selectedFile) {
      toast.error('Please select a zip file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatusText('Uploading code archive to object store...');

    try {
      // Smart upload: uses multipart if file > 100 MB, single PUT otherwise
      await api.uploadFileSmart(
        createdApp.id,
        createdApp.upload_url,
        selectedFile,
        (percent, statusText) => {
          setUploadProgress(percent);
          setUploadStatusText(statusText);
        }
      );

      // Trigger deployment
      setUploadStatusText('Archive uploaded successfully. Starting deployment...');
      await api.deployApp(createdApp.id);

      // 3. Fetch app details
      setUploadStatusText('Deployment queued!');
      toast.success(`Deployment started for ${createdApp.slug}!`);

      const updatedApp = await api.getApp(createdApp.id);
      const appObj = mapBackendAppToApp(updatedApp);
      setDeployedApp(appObj);

      if (onDeploySuccess) {
        onDeploySuccess(appObj);
      }

      setStep(3);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload archive or start deployment');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyUrl = () => {
    if (createdApp?.upload_url) {
      navigator.clipboard.writeText(createdApp.upload_url);
      setCopiedUrl(true);
      toast.success('Pre-signed URL copied to clipboard');
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg h-full border-l border-border/80 bg-background/95 backdrop-blur-xl p-0 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-border/40 bg-card/50 flex flex-col gap-4">
          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-lg font-extrabold tracking-tight">
                  New Deployment
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Two-step setup: Create app entry & upload project zip file
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            {/* Step 1 Indicator */}
            <div
              className={`flex-1 flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                step === 1
                  ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                  : 'bg-muted/30 border-border/40 text-muted-foreground'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 1
                    ? 'bg-primary text-primary-foreground'
                    : step > 1
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step > 1 ? <Check className="h-3 w-3" /> : '1'}
              </div>
              <span className="truncate">1. Create App</span>
            </div>

            <div className="text-muted-foreground/40 text-xs">→</div>

            {/* Step 2 Indicator */}
            <div
              className={`flex-1 flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition-all ${
                step === 2
                  ? 'bg-primary/10 border-primary/40 text-primary shadow-sm'
                  : step === 3
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-muted/30 border-border/40 text-muted-foreground opacity-60'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                  step === 2
                    ? 'bg-primary text-primary-foreground'
                    : step === 3
                    ? 'bg-emerald-500 text-white'
                    : 'bg-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {step === 3 ? <Check className="h-3 w-3" /> : '2'}
              </div>
              <span className="truncate">2. Upload Zip</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* ================= STEP 1: CREATE APP FORM ================= */}
          {step === 1 && (
            <form onSubmit={handleCreateApp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step 1: Application Configuration
                </span>
                <p className="text-xs text-muted-foreground">
                  Configure app metadata to generate a secure pre-signed S3 upload URL.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="appName" className="text-xs font-semibold flex items-center justify-between">
                  <span>Application Name</span>
                  <span className="text-[10px] text-destructive">*Required</span>
                </Label>
                <Input
                  id="appName"
                  placeholder="e.g. node-api-service"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="h-10 text-xs bg-card border-border/80 focus:border-primary"
                  required
                />
                <span className="text-[11px] text-muted-foreground">
                  Unique identifier for routing and pod names.
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="runtime" className="text-xs font-semibold">
                  Runtime Isolation Type
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRuntime('kata')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      runtime === 'kata'
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/60 bg-card hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Kata MicroVM</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Hardware-backed VM security sandbox
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRuntime('standard')}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                      runtime === 'standard'
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                        : 'border-border/60 bg-card hover:bg-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Standard Container</span>
                      <Box className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Fast lightweight container execution
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="port" className="text-xs font-semibold">
                  Target Service Port
                </Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="8080"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 8080)}
                  className="h-10 text-xs bg-card border-border/80"
                />
                <span className="text-[11px] text-muted-foreground">
                  Port your application listens on inside the container (default: 8080).
                </span>
              </div>

              <div className="pt-4 mt-auto">
                <Button
                  type="submit"
                  disabled={isCreatingApp || !appName.trim()}
                  className="w-full h-11 text-xs font-bold gap-2 shadow-lg"
                >
                  {isCreatingApp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating App & Generating Presigned URL...
                    </>
                  ) : (
                    <>
                      Create App & Continue <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ================= STEP 2: UPLOAD ARCHIVE & DEPLOY ================= */}
          {step === 2 && createdApp && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Step 2: Upload Code Archive
                </span>
                <p className="text-xs text-muted-foreground">
                  Upload your application source code archive (.zip) to the generated pre-signed URL.
                </p>
              </div>

              {/* App Summary Card */}
              <div className="p-3.5 rounded-xl bg-card border border-border/80 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      App Created
                    </Badge>
                    <span className="text-xs font-mono font-bold text-foreground">
                      {createdApp.slug}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ID: {createdApp.id.substring(0, 8)}...
                  </span>
                </div>

                <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg text-[11px]">
                  <span className="text-muted-foreground truncate max-w-[260px] font-mono">
                    {createdApp.upload_url}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="h-6 px-2 text-[10px] gap-1 shrink-0"
                  >
                    {copiedUrl ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedUrl ? 'Copied' : 'Copy Presigned URL'}
                  </Button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-primary bg-primary/10 shadow-lg scale-[0.99]'
                      : 'border-border/80 bg-card/40 hover:bg-card hover:border-primary/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.tar.gz,.tgz"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <div className="p-3.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <UploadCloud className="h-7 w-7" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-foreground">
                      Click to choose file or drag & drop
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Supports .zip or .tar.gz (must contain Dockerfile or app entry point)
                    </span>
                  </div>
                </div>
              ) : (
                /* Selected File Card */
                <div className="p-4 rounded-xl bg-card border border-primary/40 flex items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary shrink-0">
                      <FileArchive className="h-6 w-6" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs font-bold text-foreground truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatFileSize(selectedFile.size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      {uploadStatusText}
                    </span>
                    <span className="font-mono font-bold text-primary">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Step 2 Actions */}
              <div className="flex flex-col gap-2 pt-2 mt-auto">
                <Button
                  type="button"
                  onClick={handleUploadAndDeploy}
                  disabled={!selectedFile || isUploading}
                  className="w-full h-11 text-xs font-bold gap-2 shadow-lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading & Deploying...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" /> Upload Zip & Start Deployment
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={isUploading}
                  className="w-full h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to App Setup
                </Button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: DEPLOYMENT QUEUED & SUCCESS ================= */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-6 text-center gap-5 my-auto">
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg">
                <CheckCircle2 className="h-10 w-10 animate-bounce" />
              </div>

              <div className="flex flex-col gap-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-foreground">
                  Deployment Successfully Queued!
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your code archive was uploaded to S3 and sent to the deployment worker.
                </p>
              </div>

              {deployedApp && (
                <div className="w-full p-4 rounded-xl bg-card border border-border/80 text-left flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="text-xs font-medium text-muted-foreground">App Status</span>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px]">
                      {deployedApp.status}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-foreground">{deployedApp.name}</span>
                    <a
                      href={deployedApp.serviceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono text-[11px] flex items-center gap-1"
                    >
                      {deployedApp.serviceUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="w-full flex flex-col gap-2 pt-4">
                <Button
                  type="button"
                  onClick={handleClose}
                  className="w-full h-10 text-xs font-bold"
                >
                  Done & Return to Dashboard
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="w-full h-9 text-xs font-semibold"
                >
                  Deploy Another Application
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
