import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function CasualStaffBriefing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    child_id: '',
    staff_name: '',
    briefing_date: format(new Date(), 'yyyy-MM-dd'),
    briefed_by: '',
    topics_covered: '',
    notes: '',
  });

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['children'],
    queryFn: () => base44.entities.Children.list(),
  });

  const { data: briefings = [], isLoading: loadingBriefings } = useQuery({
    queryKey: ['casualStaffBriefings'],
    queryFn: () => base44.entities.CasualStaffBriefing.list('-briefing_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CasualStaffBriefing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casualStaffBriefings'] });
      setFormData({
        child_id: '',
        staff_name: '',
        briefing_date: format(new Date(), 'yyyy-MM-dd'),
        briefed_by: '',
        topics_covered: '',
        notes: '',
      });
      setShowForm(false);
      toast.success('Briefing recorded');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CasualStaffBriefing.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casualStaffBriefings'] });
      toast.success('Briefing deleted');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.child_id || !formData.staff_name || !formData.briefed_by) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const getChildName = (childId) => {
    const child = children.find((c) => c.id === childId);
    return child ? `${child.first_name} ${child.last_name}` : 'Unknown';
  };

  const isLoading = loadingChildren || loadingBriefings;

  // Group briefings by child
  const briefingsByChild = briefings.reduce((acc, briefing) => {
    if (!acc[briefing.child_id]) {
      acc[briefing.child_id] = [];
    }
    acc[briefing.child_id].push(briefing);
    return acc;
  }, {});

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">Casual Staff Briefings</h1>
      </div>

      <Button onClick={() => setShowForm(!showForm)} className="gap-2">
        <Plus className="w-4 h-4" /> Record New Briefing
      </Button>

      {showForm && (
        <Card className="p-6">
          <h2 className="font-semibold mb-4">New Briefing Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Child *</label>
              <Select
                value={formData.child_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, child_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Casual Staff Name *
                </label>
                <Input
                  value={formData.staff_name}
                  onChange={(e) =>
                    setFormData({ ...formData, staff_name: e.target.value })
                  }
                  placeholder="e.g. Sarah Johnson"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Briefing Date *
                </label>
                <Input
                  type="date"
                  value={formData.briefing_date}
                  onChange={(e) =>
                    setFormData({ ...formData, briefing_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Briefed By (Staff Name) *
              </label>
              <Input
                value={formData.briefed_by}
                onChange={(e) =>
                  setFormData({ ...formData, briefed_by: e.target.value })
                }
                placeholder="e.g. Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Topics Covered
              </label>
              <Textarea
                value={formData.topics_covered}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    topics_covered: e.target.value,
                  })
                }
                placeholder="e.g. Medical condition, medication location, emergency contacts"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Any additional notes"
                rows={2}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Save Briefing
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : briefings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No briefing records yet. Start recording casual staff briefings.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {children.map((child) => {
            const childBriefings = briefingsByChild[child.id] || [];
            if (childBriefings.length === 0) return null;

            return (
              <Card key={child.id} className="overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-4 border-b">
                  <h3 className="font-semibold">
                    {child.first_name} {child.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {child.condition_type} • Room {child.room_group || '—'}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left p-4 font-medium">
                          Staff Name
                        </th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">
                          Briefed By
                        </th>
                        <th className="text-left p-4 font-medium">
                          Topics Covered
                        </th>
                        <th className="text-left p-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {childBriefings.map((briefing) => (
                        <tr key={briefing.id} className="border-b hover:bg-slate-50">
                          <td className="p-4 font-medium">
                            {briefing.staff_name}
                          </td>
                          <td className="p-4">
                            {format(
                              new Date(briefing.briefing_date),
                              'dd/MM/yyyy'
                            )}
                          </td>
                          <td className="p-4 text-sm">{briefing.briefed_by}</td>
                          <td className="p-4 text-sm max-w-xs truncate">
                            {briefing.topics_covered || '—'}
                          </td>
                          <td className="p-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                deleteMutation.mutate(briefing.id)
                              }
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}