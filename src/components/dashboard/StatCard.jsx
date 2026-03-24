import React from 'react';
import { Card } from '@/components/ui/card';

export default function DashStatCard({ label, value, icon: Icon, onClick, variant = 'default' }) {
  const baseClasses = 'p-6 cursor-pointer hover:shadow-lg transition-shadow';
  
  const variants = {
    default: 'bg-blue-50 border-blue-100',
    warning: 'bg-amber-50 border-amber-100',
    success: 'bg-green-50 border-green-100',
    danger: 'bg-red-50 border-red-100',
  };

  return (
    <Card className={`${baseClasses} ${variants[variant]}`} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        {Icon && <Icon className="w-8 h-8 text-muted-foreground opacity-50" />}
      </div>
    </Card>
  );
}