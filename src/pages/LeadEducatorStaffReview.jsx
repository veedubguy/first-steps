import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/shared/StatusBadge';
import { toast } from 'sonner';

export default function LeadEducatorStaffReview() {
  const [selectedChild, setSelectedChild] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState('');
  const queryClient = useQueryClient();

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['children'],
    queryFn: () => base44.entities.Children.list('-created_date'),
  });

  const { data: staffMembers = [], isLoading: ls } = useQuery({
    queryKey: ['staffMembers'],
    queryFn: () => base44.entities.StaffMember.list(),
  });

  const { data: staffSignoffs = [], isLoading: lss } = useQuery({
    queryKey: ['staffSignoffs'],
    queryFn: () => base44.entities.StaffSignoff.list(),
  });

  const { data: leadSignoffs = [], isLoading: lle } = useQuery({
    queryKey: ['leadEducatorSignoffs'],
    queryFn: () => base44.entities.LeadEducatorSignoff.list(),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (passcode !== '1234') {
        throw new Error('Incorrect passcode');
      }

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = format(today, 'HH:mm');

      await base44.entities.LeadEducatorSignoff.create({
        child_id: selectedChild.id,
        confirmed_by: 'Lead Educator',
        confirmed_date: dateStr,
        confirmed_time: timeStr,
      });

      return { dateStr, timeStr };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leadEducatorSignoffs'] });
      setPasscode('');
      setPassError('');
      toast.success(`Child marked complete at ${data.timeStr}`);
      setSelectedChild(null);
    },
    onError: (err) => {
      setPassError(err.message === 'Incorrect passcode' ? 'Incorrect passcode' : 'Error confirming');
    },
  });

  const activeChildren = children.filter(c => !c.archived);
  const alreadyConfirmed = leadSignoffs.map(l => l.child_id);
  const pendingChildren = activeChildren.filter(c => !alreadyConfirmed.includes(c.id));

  if (lc || ls || lss || lle) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff Sign-Off Review</h1>
          <p className="text-muted-foreground text-sm mt-1">Lead educator approval of staff viewing</p>
        </div>

        <div className="space-y-3">
          {pendingChildren.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-muted-foreground">All children have been confirmed</p>
            </Card>
          ) : (
            pendingChildren.map(child => {
              const childSignoffs = staffSignoffs.filter(s => s.child_id === child.id);
              const signedStaff = staffMembers.filter(m => childSignoffs.some(s => s.staff_name === m.full_name));
              const unsigned = staffMembers.filter(m => !childSignoffs.some(s => s.staff_name === m.full_name));

              return (
                <Card
                  key={child.id}
                  className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedChild(child)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{child.first_name} {child.last_name}</h3>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <StatusBadge type={child.condition_type} />
                        {child.severity && <StatusBadge type={child.severity} />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {child.room_group || 'No group'} · {child.parent_name || 'No parent'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">{signedStaff.length} signed</div>
                      <div className="text-sm text-amber-600">{unsigned.length} pending</div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  const childSignoffs = staffSignoffs.filter(s => s.child_id === selectedChild.id);
  const signedStaff = staffMembers.filter(m => childSignoffs.some(s => s.staff_name === m.full_name));
  const unsignedStaff = staffMembers.filter(m => !childSignoffs.some(s => s.staff_name === m.full_name));

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => setSelectedChild(null)}>
        ← Back to List
      </Button>

      {/* Child info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-xl font-bold">{selectedChild.first_name} {selectedChild.last_name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedChild.room_group || 'No group'} · {selectedChild.condition_type}
        </p>
      </Card>

      {/* Staff status */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-green-700">Signed Off ({signedStaff.length})</h3>
          <div className="space-y-2">
            {signedStaff.length === 0 ? (
              <p className="text-xs text-muted-foreground">No staff signed yet</p>
            ) : (
              signedStaff.map(staff => (
                <div key={staff.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span>{staff.full_name}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-amber-700">Pending ({unsignedStaff.length})</h3>
          <div className="space-y-2">
            {unsignedStaff.length === 0 ? (
              <p className="text-xs text-muted-foreground">All staff have signed</p>
            ) : (
              unsignedStaff.map(staff => (
                <div key={staff.id} className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>{staff.full_name}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Lead educator passcode */}
      {(unsignedStaff.length === 0 || signedStaff.length > 0) && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Confirm Staff Review</h3>
              <p className="text-sm text-amber-700 mt-1">
                Enter your passcode to confirm all relevant staff have viewed {selectedChild.first_name}'s plan.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Lead Educator Passcode</label>
              <Input
                type="password"
                placeholder="Enter passcode"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setPassError('');
                }}
                onKeyPress={(e) => e.key === 'Enter' && confirmMutation.mutate()}
                className="mt-1"
              />
            </div>
            {passError && <p className="text-sm text-red-600">{passError}</p>}
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={!passcode || confirmMutation.isPending}
              className="w-full gap-2"
            >
              <Lock className="w-4 h-4" />
              {confirmMutation.isPending ? 'Confirming...' : 'Confirm & Mark Complete'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}