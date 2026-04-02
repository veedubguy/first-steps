import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ChildrenList from '@/pages/ChildrenList';
import ChildForm from '@/pages/ChildForm.jsx';
import ChildProfile from '@/pages/ChildProfile';
import RiskPlanForm from '@/pages/RiskPlanForm';
import CommunicationForm from '@/pages/CommunicationForm';
import PrintPlan from '@/pages/PrintPlan';
import ParentAcknowledgement from '@/pages/ParentAcknowledgement';
import StaffAcknowledgement from '@/pages/StaffAcknowledgement';
import StaffList from '@/pages/StaffList';
import CasualStaffBriefing from '@/pages/CasualStaffBriefing';
import StaffSignoffDashboard from '@/pages/StaffSignoffDashboard';
import StaffSignChild from '@/pages/StaffSignChild';
import LeadEducatorStaffReview from '@/pages/LeadEducatorStaffReview';
import CentreCommPlan from '@/pages/CentreCommPlan';
import ParentCommPlan from '@/pages/ParentCommPlan';
import ParentDietaryForm from '@/pages/ParentDietaryForm';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/children" element={<ChildrenList />} />
        <Route path="/children/new" element={<ChildForm />} />
        <Route path="/children/:id" element={<ChildProfile />} />
        <Route path="/children/:id/edit" element={<ChildForm />} />
        <Route path="/children/:id/risk-plan/new" element={<RiskPlanForm />} />
        <Route path="/children/:id/communication/new" element={<CommunicationForm />} />
        <Route path="/children/:id/comm-plan" element={<CentreCommPlan />} />
        <Route path="/children/:id/print" element={<PrintPlan />} />
        <Route path="/staff" element={<StaffList />} />
        <Route path="/casual-staff-briefing" element={<CasualStaffBriefing />} />
      </Route>
      <Route path="/parent-acknowledgement" element={<ParentAcknowledgement />} />
      <Route path="/parent-comm-plan" element={<ParentCommPlan />} />
      <Route path="/parent-dietary-form" element={<ParentDietaryForm />} />
      <Route path="/staff-acknowledgement" element={<StaffAcknowledgement />} />
      <Route path="/staff-signoff" element={<StaffSignoffDashboard />} />
      <Route path="/staff-sign-child/:childId" element={<StaffSignChild />} />
      <Route path="/lead-educator-review" element={<LeadEducatorStaffReview />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App