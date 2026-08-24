import React from 'react';
import { NewDeploymentSidebar } from './NewDeploymentSidebar';
import { App } from '@/types/app';

interface DeploySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploySuccess?: (newApp: App) => void;
}

export const DeploySimulatorModal: React.FC<DeploySimulatorModalProps> = (props) => {
  return <NewDeploymentSidebar {...props} />;
};

export { NewDeploymentSidebar };
