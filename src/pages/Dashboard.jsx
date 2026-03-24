import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, AlertTriangle, FileX, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/shared/StatCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['children'],
    queryFn: () => base44.entities.Children.list('-created_date'),
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['planTracking'],
    queryFn: () => base44.entities.PlanTracking.list('-created_date'),
  });

  const { data: riskPlans = [], isLoading: loadingRisks } = useQuery({
    queryKey: ['riskPlans'],
    queryFn: () => base44.entities.RiskPlans.list('-created_date'),
  });

  const { data: comms = [] } = useQuery({
    queryKey: ['commsAll'],
    queryFn: () => base44.entities.CommunicationLog.list('-date'),
  });

  const isLoading = loadingChildren || loadingPlans || loadingRisks;

  const highRiskChildren = children.filter(c => c.severity === 'Anaphylaxis');
  const unsignedPlans = plans.filter(p => p.parent_signed !== 'Yes' && p.plan_status !== 'Draft');
  const today = new Date().toISOString().split('T')[0];
  const overdueReviews = riskPlans.filter(rp => rp.review_date && rp.review_date < today && rp.status !== 'Closed');
  const awaitingResponse = comms.filter(c => c.response_required === 'Yes' && c.response_received !== 'Yes');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-8 w-48" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Compliance overview at a glance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Children" value={children.length} icon={Users} accent="blue" />
        <StatCard title="High Risk (Anaphylaxis)" value={highRiskChildren.length} icon={AlertTriangle} accent="red" />
        <StatCard title="Plans Not Signed" value={unsignedPlans.length} icon={FileX} accent="amber" />
        <StatCard title="Reviews Overdue" value={overdueReviews.length} icon={Clock} accent="green" />
      </div>

      {/* High Risk Children */}
      {highRiskChildren.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b bg-red-50/50">
            <h2 className="font-semibold text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Risk Children — Anaphylaxis
            </h2>
          </div>
          <div className="divide-y">
            {highRiskChildren.map(child => (
              <Link key={child.id} to={`/children/${child.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{child.first_name} {child.last_name}</p>
                  <p className="text-xs text-muted-foreground">{child.allergens || 'No allergens listed'}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Awaiting Response */}
      {awaitingResponse.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b bg-yellow-50/50">
            <h2 className="font-semibold text-sm text-yellow-700 flex items-center gap-2">
              🟡 Awaiting Parent Response ({awaitingResponse.length})
            </h2>
          </div>
          <div className="divide-y">
            {awaitingResponse.slice(0, 5).map(comm => {
              const child = children.find(c => c.id === comm.child_id);
              return (
                <Link key={comm.id} to={child ? `/children/${child.id}` : '#'} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{child ? `${child.first_name} ${child.last_name}` : 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{comm.subject} — {comm.method}</p>
                  </div>
                  <StatusBadge type="awaiting_response" />
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Children */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-sm">Recently Added Children</h2>
          <Link to="/children" className="text-xs text-primary font-medium hover:underline">View all</Link>
        </div>
        <div className="divide-y">
          {children.slice(0, 5).map(child => (
            <Link key={child.id} to={`/children/${child.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-medium text-sm">{child.first_name} {child.last_name}</p>
                  <p className="text-xs text-muted-foreground">{child.room_group || 'No group'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge type={child.condition_type} />
                {child.severity === 'Anaphylaxis' && <StatusBadge type="anaphylaxis" />}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}