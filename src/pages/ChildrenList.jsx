import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, ChevronRight, Archive, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';

export default function ChildrenList() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [showArchived, setShowArchived] = useState(false);

  const { data: children = [], isLoading } = useQuery({
    queryKey: ['children'],
    queryFn: () => base44.entities.Children.list('-created_date'),
  });

  const filtered = children.filter(child => {
    if (showArchived && !child.archived) return false;
    if (!showArchived && child.archived) return false;
    const matchesSearch = `${child.first_name} ${child.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || child.condition_type === filterType;
    const matchesSeverity = filterSeverity === 'all' || child.severity === filterSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Children</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} of {children.length} enrolled</p>
        </div>
        <Link to="/children/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Child
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2 shrink-0"
        >
          {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {showArchived ? 'Archived' : 'Active'}
        </Button>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Allergy">Allergy</SelectItem>
            <SelectItem value="Dietary">Dietary</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
            <SelectItem value="Moderate">Moderate</SelectItem>
            <SelectItem value="Anaphylaxis">Anaphylaxis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No children found</p>
        </Card>
      ) : (
        <Card className="overflow-hidden divide-y">
          {filtered.map(child => (
            <Link
              key={child.id}
              to={`/children/${child.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{child.first_name} {child.last_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {child.room_group || 'No group'} · {child.parent_name || 'No parent listed'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <StatusBadge type={child.condition_type} />
                {child.severity && <StatusBadge type={child.severity} />}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}