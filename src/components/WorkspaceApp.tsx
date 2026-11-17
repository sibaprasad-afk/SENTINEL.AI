import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { ClinicianUser, DashboardOverviewData } from '../types';
import { AmbientBackground } from './AmbientBackground';
import { GlassNavbar } from './glass/GlassNavbar';
import { GlassSidebar, WORKSPACE_NAV_ITEMS, type WorkspacePage } from './glass/GlassSidebar';
import { AnalyticsView } from './workspace/AnalyticsView';
import { ClinicalAiStudioView } from './workspace/ClinicalAiStudioView';
import { ClinicalQueueView } from './workspace/ClinicalQueueView';
import { CommandCenterView } from './workspace/CommandCenterView';
import { DatasetAnalysisView } from './workspace/DatasetAnalysisView';
import { ImageAnalysisView } from './workspace/ImageAnalysisView';
import { NotificationsView } from './workspace/NotificationsView';
import { PatientIntelligenceView } from './workspace/PatientIntelligenceView';
import { ReviewHistoryView } from './workspace/ReviewHistoryView';
import { SettingsView } from './workspace/SettingsView';

interface WorkspaceAppProps {
  user: ClinicianUser;
  onUserUpdated: (user: ClinicianUser) => void;
  onLogout: () => void;
  onReturnToLanding: () => void;
  onToast: (msg: string) => void;
}

export const WorkspaceApp: React.FC<WorkspaceAppProps> = ({
  user,
  onUserUpdated,
  onLogout,
  onReturnToLanding,
  onToast,
}) => {
  const [activePage, setActivePage] = useState<WorkspacePage>('command-center');
  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const loadOverview = async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to refresh clinical overview.');
    } finally {
      setLoadingOverview(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const navigateTo = (page: string) => {
    setActivePage(page as WorkspacePage);
    setMobileSidebarOpen(false);
  };

  const openCaseInQueue = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActivePage('clinical-queue');
    setMobileSidebarOpen(false);
  };

  const activeNavLabel =
    WORKSPACE_NAV_ITEMS.find((i) => i.id === activePage)?.label || 'Command Center';

  return (
    <div className="relative min-h-screen text-[#F4F7FF] flex">
      <AmbientBackground variant="workspace" />

      <GlassSidebar
        activePage={activePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onNavigate={navigateTo}
        unreadCount={overview?.unreadNotifications || 0}
        user={user}
        onReturnToLanding={onReturnToLanding}
        onLogout={onLogout}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      <div className="relative z-10 flex-1 min-w-0 flex flex-col">
        <GlassNavbar
          breadcrumb={activeNavLabel}
          unreadNotifications={overview?.unreadNotifications || 0}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenNotifications={() => navigateTo('notifications')}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {activePage === 'command-center' && (
                <CommandCenterView
                  user={user}
                  overview={overview}
                  loading={loadingOverview}
                  onNavigate={navigateTo}
                  onSelectCaseId={setSelectedCaseId}
                />
              )}
              {activePage === 'ai-copilot' && (
                <ClinicalAiStudioView user={user} onToast={onToast} />
              )}
              {activePage === 'clinical-queue' && (
                <ClinicalQueueView
                  selectedCaseId={selectedCaseId}
                  onSelectCaseId={setSelectedCaseId}
                  onRefreshParent={() => void loadOverview()}
                  onToast={onToast}
                />
              )}
              {activePage === 'image-analysis' && (
                <ImageAnalysisView
                  onAnalysisComplete={(c) => {
                    setSelectedCaseId(c.id);
                    void loadOverview();
                  }}
                  onToast={onToast}
                />
              )}
              {activePage === 'dataset-analysis' && (
                <DatasetAnalysisView
                  onAnalysisComplete={(c) => {
                    setSelectedCaseId(c.id);
                    void loadOverview();
                  }}
                  onToast={onToast}
                />
              )}
              {activePage === 'patient-intelligence' && (
                <PatientIntelligenceView onOpenCase={openCaseInQueue} onToast={onToast} />
              )}
              {activePage === 'analytics' && <AnalyticsView onToast={onToast} />}
              {activePage === 'review-history' && (
                <ReviewHistoryView onOpenCase={openCaseInQueue} onToast={onToast} />
              )}
              {activePage === 'notifications' && (
                <NotificationsView
                  onOpenCase={openCaseInQueue}
                  onRefreshParent={() => void loadOverview()}
                  onToast={onToast}
                />
              )}
              {activePage === 'settings' && (
                <SettingsView
                  user={user}
                  onUserUpdated={onUserUpdated}
                  onToast={onToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};
