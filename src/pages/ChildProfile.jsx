import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, MessageSquare, Send, CheckCircle, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ChildHeader from '@/components/child-profile/ChildHeader';
import RiskPlansList from '@/components/child-profile/RiskPlansList';
import CommunicationsList from '@/components/child-profile/CommunicationsList';
import PlanTrackingList from '@/components/child-profile/PlanTrackingList';
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/children')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold">Child Profile</h1>
      </div>

      <ChildHeader child={child} />

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Link to={`/children/${id}/risk-plan/new`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-3.5 h-3.5" /> Create Risk Plan
          </Button>
        </Link>
        <Link to={`/children/${id}/communication/new`}>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-3.5 h-3.5" /> Log Communication
          </Button>
        </Link>
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
        <Link to={`/children/${id}/print`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-3.5 h-3.5" /> Print Plan
          </Button>
        </Link>
      </div>

      {/* Plan Status */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Plan Tracking</h3>
        <PlanTrackingList plans={planTracking} />
      </div>

      {/* Risk Plans */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Risk Minimisation Plans ({riskPlans.length})</h3>
        <RiskPlansList plans={riskPlans} />
      </div>

      {/* Communications */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Communication Log ({comms.length})</h3>
        <CommunicationsList communications={comms} />
      </div>
    </div>
  );
}