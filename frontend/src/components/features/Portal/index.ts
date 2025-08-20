/**
 * Portal Components Index
 * 
 * Main exports for CVPlus Portal system components
 * 
 * @author Gil Klainert
 * @version 1.0.0
 */

export { PortalLayout } from './PortalLayout';
export { PortalDeploymentStatus } from './PortalDeploymentStatus';
export { default as PortalDeploymentStatusExample } from './PortalDeploymentStatus.example';
export { PortalSections } from './PortalSections';
export { default as PortalSectionsExample } from './PortalSections.example';
export { PortalQRIntegration } from './PortalQRIntegration';
export { default as PortalQRIntegrationExample } from './PortalQRIntegration.example';

// Type exports
export type {
  PortalLayoutProps,
  PortalDeploymentStatusProps,
  PortalSectionsProps,
  PortalQRIntegrationProps,
  PortalChatInterfaceProps,
  BasePortalComponentProps,
  PortalComponentWrapperProps,
} from '../../../types/portal-component-props';

export type {
  PortalConfig,
  PortalTheme,
  PortalFeatures,
  PortalMetadata,
  DeploymentStatus,
  PortalError,
  PortalOperationResult,
} from '../../../types/portal-types';