import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const emptyForm = { full_name: '', role: '', email: '', active: true };

export default function StaffList() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staffMembers'],
    queryFn: () => base44.entities.StaffMember.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? base44.entities.StaffMember.update(editing.id, data)
      : base44.entities.StaffMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      toast.success(editing ? 'Staff member updated' : 'Staff member added');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StaffMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffMembers'] });
      toast.success('Staff member removed');
    },
  });

  const openEdit = (s) => {
    setEditing(s);
    setForm({ full_name: s.full_name, role: s.role || '', email: s.email, active: s.active !== false });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.full_name || !form.email) return toast.error('Name and email are required');
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Staff Members</h1>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditing(null); setForm(emptyForm); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Staff
        </Button>
      </div>

      {showForm && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">{editing ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Full Name *</label>
              <Input placeholder="Jane Smith" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Input placeholder="Educator" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email *</label>
              <Input type="email" placeholder="jane@centre.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : staff.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No staff members yet. Add your team to send sign-off requests.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {staff.map(s => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                  {s.full_name?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.role && `${s.role} · `}{s.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.active !== false ? 'Active' : 'Inactive'}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}