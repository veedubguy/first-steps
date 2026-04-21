import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, MessageSquare, Send, CheckCircle, Printer, Loader2, Mail, Link2, Users, Archive, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ChildHeader from '@/components/child-profile/ChildHeader';
import RiskPlansList from '@/components/child-profile/RiskPlansList';
import CommunicationsList from '@/components/child-profile/CommunicationsList';
import PlanTrackingList from '@/components/child-profile/PlanTrackingList';
import DoctorPlanUpload from '@/components/child-profile/DoctorPlanUpload';
import StaffSignoffsList from '@/components/child-profile/StaffSignoffsList';
import SendToStaffModal from '@/components/child-profile/SendToStaffModal';
import StaffSignoffStatus from '@/components/child-profile/StaffSignoffStatus';
import WorkflowTracker from '@/components/child-profile/WorkflowTracker';
import DietaryIntakeView from '@/components/child-profile/DietaryIntakeView';
import { toast } from 'sonner';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: children = [], isLoading: loadingChild } = useQuery({
    queryKey: ['child', id],
    queryFn: () => base44.entities.Children.filter({ id }),
  });
  const child = children[0];

  const { data: riskPlans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['riskPlans', id],
    queryFn: () => base44.entities.RiskPlans.filter({ child_id: id }, '-created_date'),
  });

  const { data: comms = [], isLoading: loadingComms } = useQuery({
    queryKey: ['comms', id],
    queryFn: () => base44.entities.CommunicationLog.filter({ child_id: id }, '-date'),
  });

  const { data: planTracking = [], isLoading: loadingTracking } = useQuery({
    queryKey: ['planTracking', id],
    queryFn: () => base44.entities.PlanTracking.filter({ child_id: id }, '-created_date'),
  });

  const { data: staffSignoffs = [] } = useQuery({
    queryKey: ['staffSignoffs', id],
    queryFn: () => base44.entities.StaffSignoff.filter({ child_id: id }, '-created_date'),
  });

  const { data: commPlans = [] } = useQuery({
    queryKey: ['commPlan', id],
    queryFn: () => base44.entities.CommunicationPlan.filter({ child_id: id }),
  });
  const commPlan = commPlans[0];



  const markSentMutation = useMutation({
    mutationFn: () => {
      const activePlan = planTracking.find(p => p.plan_status === 'Draft');
      if (activePlan) {
        return base44.entities.PlanTracking.update(activePlan.id, {
          plan_status: 'Sent',
          sent_date: new Date().toISOString().split('T')[0],
        });
      }
      return base44.entities.PlanTracking.create({
        child_id: id,
        plan_type: child?.condition_type || 'Allergy',
        plan_status: 'Sent',
        sent_date: new Date().toISOString().split('T')[0],
        parent_signed: 'No',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planTracking', id] });
      toast.success('Plan marked as sent');
    },
  });

  const sendToParentMutation = useMutation({
    mutationFn: async () => {
      console.log('[sendToParent] child:', child?.id, 'email:', child?.parent_email, 'planTracking count:', planTracking.length);
      if (!child?.parent_email) throw new Error('No parent email on record');

      // Dietary children get a different form
      if (child.condition_type === 'Dietary') {
        const dietaryUrl = `https://prompt-care-safe-sync.base44.app/parent-dietary-form?child=${id}`;
        console.log('[sendToParent] sending dietary email to:', child.parent_email);
      await base44.functions.invoke('sendEmail', {
          to: child.parent_email,
          subject: `Action Required: Please complete ${child.first_name}'s Dietary Requirement Form`,
          body: `Dear ${child.parent_name || 'Parent/Guardian'},\n\nTo ensure we can safely accommodate ${child.first_name} ${child.last_name}'s dietary needs at our service, we ask that you complete the dietary requirement form below.\n\nThis form covers dietary requirements, religious needs, foods to avoid, cross-contamination concerns, and meal arrangements.\n\nPlease complete the form here:\n\n${dietaryUrl}\n\nIf you have any questions, please contact us directly.\n\nKind regards,\nFirst Steps Before & After School Care`,
        });
        await base44.entities.CommunicationLog.create({
          child_id: id,
          date: new Date().toISOString().split('T')[0],
          method: 'Email',
          subject: 'Dietary Requirement Form sent to parent',
          summary: `Dietary intake form emailed to ${child.parent_email}.`,
          sent_by: 'Staff',
          response_required: 'Yes',
          response_received: 'No',
          follow_up_required: 'Yes',
        });
        return;
      }

      const planRecord = planTracking.find(p => p.plan_status === 'Draft') || planTracking[0];
      const planParam = planRecord ? `&plan=${planRecord.id}` : '';
      const ackUrl = `https://prompt-care-safe-sync.base44.app/parent-acknowledgement?child=${id}${planParam}`;
      const planType = child.condition_type === 'Allergy' ? 'Allergy Risk Minimisation Plan' : 'Asthma Management Plan';

      console.log('[sendToParent] sending plan email to:', child.parent_email, 'planType:', planType, 'ackUrl:', ackUrl);
      await base44.functions.invoke('sendEmail', {
        to: child.parent_email,
        subject: `Action Required: Please review and sign ${child.first_name}'s ${planType}`,
        body: `Dear ${child.parent_name || 'Parent/Guardian'},\n\nPlease review and digitally sign the ${planType} for ${child.first_name} ${child.last_name}.\n\nClick the link below to view the plan and provide your acknowledgement:\n\n${ackUrl}\n\nIf you have any questions, please contact the service directly.\n\nKind regards,\nFirst Steps Before & After School Care`,
      });

      // Log the communication
      await base44.entities.CommunicationLog.create({
        child_id: id,
        date: new Date().toISOString().split('T')[0],
        method: 'Email',
        subject: `${planType} sent for acknowledgement`,
        summary: `Plan emailed to ${child.parent_email} for digital signature.`,
        sent_by: 'Staff',
        response_required: 'Yes',
        response_received: 'No',
        follow_up_required: 'Yes',
      });

      // Mark plan as Sent if Draft
      if (planRecord && planRecord.plan_status === 'Draft') {
        await base44.entities.PlanTracking.update(planRecord.id, {
          plan_status: 'Sent',
          sent_date: new Date().toISOString().split('T')[0],
        });
      } else if (!planRecord) {
        await base44.entities.PlanTracking.create({
          child_id: id,
          plan_type: child.condition_type || 'Allergy',
          plan_status: 'Sent',
          sent_date: new Date().toISOString().split('T')[0],
          parent_signed: 'No',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planTracking', id] });
      queryClient.invalidateQueries({ queryKey: ['comms', id] });
      toast.success(`Plan emailed to ${child.parent_email}`);
    },
    onError: (e) => toast.error(e.message || 'Failed to send email'),
  });

  const markSignedMutation = useMutation({
    mutationFn: () => {
      const sentPlan = planTracking.find(p => p.plan_status === 'Sent');
      if (sentPlan) {
        return base44.entities.PlanTracking.update(sentPlan.id, {
          plan_status: 'Signed',
          parent_signed: 'Yes',
          signed_date: new Date().toISOString().split('T')[0],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planTracking', id] });
      toast.success('Plan marked as signed');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => base44.entities.Children.update(id, { archived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child', id] });
      queryClient.invalidateQueries({ queryKey: ['children'] });
      toast.success('Child record archived');
      navigate('/children');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Children.update(id, { archived: false });
      // Reset plan tracking for re-enrolment
      const plans = await base44.entities.PlanTracking.filter({ child_id: id });
      for (const plan of plans) {
        await base44.entities.PlanTracking.update(plan.id, { plan_status: 'Draft', parent_signed: 'No' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child', id] });
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['planTracking', id] });
      toast.success('Child record reactivated');
    },
  });

  const isLoading = loadingChild || loadingPlans || loadingComms || loadingTracking;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!child) {
    return <div className="text-center py-12 text-muted-foreground">Child not found</div>;
  }

  const hasSentPlan = planTracking.some(p => p.plan_status === 'Sent');
  const hasDraftOrNone = planTracking.length === 0 || planTracking.some(p => p.plan_status === 'Draft');

  return (
    <div className="space-y-6">
      {child?.archived && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-900">This child record is archived</p>
            <p className="text-sm text-amber-700 mt-1">The record is hidden from active lists. Click "Reactivate" below to bring the child back.</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/children')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">Child Profile</h1>
      </div>

      <ChildHeader child={child} onPhotoUpdated={() => queryClient.invalidateQueries({ queryKey: ['child', id] })} />

      {/* Workflow Progress Tracker */}
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Compliance Workflow</h3>
        <WorkflowTracker planTracking={planTracking} commPlan={commPlan} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Link to={riskPlans.length > 0
          ? `/children/${id}/risk-plan/new?planId=${riskPlans[0].id}`
          : `/children/${id}/risk-plan/new`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> {riskPlans.length > 0 ? 'Edit Risk Plan' : 'Create Risk Plan'}
          </Button>
        </Link>
        <Link to={`/children/${id}/communication/new`}>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Log Communication
          </Button>
        </Link>
        <Button
          variant="outline" size="sm" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={() => sendToParentMutation.mutate()}
          disabled={sendToParentMutation.isPending || !child?.parent_email}
          title={!child?.parent_email ? 'No parent email on record' : ''}
        >
          {sendToParentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          {child?.condition_type === 'Dietary' ? 'Send Dietary Form to Parent' : 'Send to Parent'}
        </Button>
        <Button
          variant="outline" size="sm" className="gap-2"
          onClick={() => markSentMutation.mutate()}
          disabled={markSentMutation.isPending || (!hasDraftOrNone)}
        >
          {markSentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Mark Plan Sent
        </Button>
        <Button
          variant="outline" size="sm" className="gap-2"
          onClick={() => markSignedMutation.mutate()}
          disabled={markSignedMutation.isPending || !hasSentPlan}
        >
          {markSignedMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Mark Plan Signed
        </Button>
        <Button
          variant="outline" size="sm" className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
          onClick={() => {
            const url = `https://prompt-care-safe-sync.base44.app/parent-acknowledgement?child=${id}`;
            navigator.clipboard.writeText(url);
            toast.success('Parent link copied — ready to paste into SMS');
          }}
        >
          <Link2 className="w-3.5 h-3.5" /> Copy Parent Link
        </Button>
        <Link to={`/children/${id}/comm-plan`}>
          <Button
            variant="outline" size="sm" className="gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {commPlan?.status === 'Complete' ? 'Comm Plan ✓' : commPlan?.status === 'Comm Pack Sent' ? 'Awaiting Parent Sign' : 'Stage 2: Comm Plan'}
          </Button>
        </Link>
        <Link to="/staff-signoff">
          <Button
            variant="outline" size="sm" className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <Users className="w-3.5 h-3.5" /> Staff Sign-Off (Tablet)
          </Button>
        </Link>
        <Link to={`/children/${id}/print`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-3.5 h-3.5" /> Print Plan
          </Button>
        </Link>
      </div>

      {/* Dietary Intake — only for Dietary children */}
      {child?.condition_type === 'Dietary' && (
        <div>
          <h3 className="font-semibold text-sm mb-3">Dietary Intake (Parent Submitted)</h3>
          <DietaryIntakeView childId={id} />
        </div>
      )}

      {/* Doctor Plan Upload */}
      <DoctorPlanUpload
        child={child}
        onUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['child', id] });
          queryClient.invalidateQueries({ queryKey: ['riskPlans', id] });
        }}
      />

      {/* Plan Status */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Plan Tracking</h3>
        <PlanTrackingList plans={planTracking} />
      </div>

      {/* Risk Plans */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Risk Minimisation Plans ({riskPlans.length})</h3>
        <RiskPlansList plans={riskPlans} child={child} />
      </div>

      {/* Staff Sign-offs */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Staff Sign-offs</h3>
        <StaffSignoffStatus childId={id} />
      </div>



      {/* Communications */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Communication Log ({comms.length})</h3>
        <CommunicationsList communications={comms} />
      </div>

      {/* Archive/Reactivate */}
      <div className="border-t pt-6">
        {child?.archived ? (
          <Button
            variant="outline"
            className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
          >
            {reactivateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reactivate Child
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2 border-gray-300 text-gray-600 hover:bg-gray-50"
            onClick={() => {
              if (confirm(`Archive ${child.first_name} ${child.last_name}? This will remove them from active lists.`)) {
                archiveMutation.mutate();
              }
            }}
            disabled={archiveMutation.isPending}
          >
            {archiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
            Archive Child
          </Button>
        )}
      </div>
      </div>
      );
      }