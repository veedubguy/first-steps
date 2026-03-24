import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import SignaturePad from '@/components/shared/SignaturePad';

export default function PrintPlan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: children = [], isLoading: lc } = useQuery({
    queryKey: ['child', id],
    queryFn: () => base44.entities.Children.filter({ id }),
  });
  const child = children[0];

  const { data: riskPlans = [], isLoading: lr } = useQuery({
    queryKey: ['riskPlans', id],
    queryFn: () => base44.entities.RiskPlans.filter({ child_id: id }),
  });

  const { data: planTracking = [] } = useQuery({
    queryKey: ['planTracking', id],
    queryFn: () => base44.entities.PlanTracking.filter({ child_id: id }),
  });

  const [parentSig, setParentSig] = useState(null);
  const [staffSig, setStaffSig] = useState(null);
  const [parentSigDate] = useState(format(new Date(), 'dd/MM/yyyy'));

  if (lc || lr) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!child) return <div className="text-center py-12">Child not found</div>;

  const activePlans = riskPlans.filter(p => p.status !== 'Closed');

  return (
    <div>
      {/* Controls */}
      <div className="no-print flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Print Plan</h1>
        <Button variant="outline" onClick={() => {
          const url = `${window.location.origin}/parent-acknowledgement?child=${id}`;
          navigator.clipboard.writeText(url);
          alert('Parent acknowledgement link copied to clipboard!');
        }} className="gap-2">
          <Download className="w-4 h-4" /> Copy Parent Link
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      {/* Printable Content */}
      <div className="bg-white text-black max-w-3xl mx-auto p-8 border rounded-lg print:border-0 print:rounded-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">
            {child.condition_type === 'Allergy' ? 'Allergy Risk Minimisation Plan' :
             child.condition_type === 'Asthma' ? 'Asthma Management Plan' : 'Dietary Management Plan'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">OSHC Service — Confidential Document</p>
          <p className="text-sm text-gray-600">Generated: {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>

        {/* Child Details */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Child Details</h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm px-3">
            <div><span className="font-medium">Name:</span> {child.first_name} {child.last_name}</div>
            <div><span className="font-medium">Child ID:</span> {child.child_id || '—'}</div>
            <div><span className="font-medium">Date of Birth:</span> {child.dob ? format(new Date(child.dob), 'dd/MM/yyyy') : '—'}</div>
            <div><span className="font-medium">Room/Group:</span> {child.room_group || '—'}</div>
            <div><span className="font-medium">Condition Type:</span> {child.condition_type}</div>
            {child.condition_type === 'Allergy' && (
              <>
                <div><span className="font-medium">Allergens:</span> <span className="text-red-700 font-semibold">{child.allergens || '—'}</span></div>
                <div><span className="font-medium">Severity:</span> <span className="font-semibold">{child.severity || '—'}</span></div>
              </>
            )}
            {child.condition_type === 'Dietary' && (
              <div><span className="font-medium">Requirement:</span> {child.dietary_requirement || '—'}</div>
            )}
            {child.condition_type === 'Asthma' && (
              <>
                <div><span className="font-medium">Triggers:</span> {child.asthma_triggers || '—'}</div>
                <div><span className="font-medium">Severity:</span> {child.asthma_severity || '—'}</div>
                <div><span className="font-medium">Reliever:</span> {child.reliever_medication || '—'}</div>
                {child.preventer_medication && <div><span className="font-medium">Preventer:</span> {child.preventer_medication}</div>}
              </>
            )}
          </div>
        </section>

        {/* Parent/Guardian */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Parent / Guardian</h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm px-3">
            <div><span className="font-medium">Name:</span> {child.parent_name || '—'}</div>
            <div><span className="font-medium">Phone:</span> {child.parent_phone || '—'}</div>
            <div><span className="font-medium">Email:</span> {child.parent_email || '—'}</div>
          </div>
        </section>

        {/* Risk Plans */}
        {activePlans.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Risk Minimisation Plans</h2>
            {activePlans.map((plan, idx) => (
              <div key={plan.id} className="mb-4 px-3 text-sm">
                {activePlans.length > 1 && <p className="font-bold mb-1">Plan {idx + 1}</p>}
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b"><td className="py-1.5 font-medium w-40">Trigger</td><td className="py-1.5">{plan.trigger}</td></tr>
                    {plan.exposure_risk && <tr className="border-b"><td className="py-1.5 font-medium">Exposure Risk</td><td className="py-1.5">{plan.exposure_risk}</td></tr>}
                    {plan.reaction && <tr className="border-b"><td className="py-1.5 font-medium">Reaction</td><td className="py-1.5">{plan.reaction}</td></tr>}
                    <tr className="border-b"><td className="py-1.5 font-medium">Risk Level</td><td className="py-1.5">{plan.risk_level}</td></tr>
                    {plan.control_measures && <tr className="border-b"><td className="py-1.5 font-medium">Control Measures</td><td className="py-1.5">{plan.control_measures}</td></tr>}
                    {plan.medication_required && <tr className="border-b"><td className="py-1.5 font-medium">Medication</td><td className="py-1.5">{plan.medication_required}</td></tr>}
                    {plan.medication_location && <tr className="border-b"><td className="py-1.5 font-medium">Medication Location</td><td className="py-1.5">{plan.medication_location}</td></tr>}
                    {plan.review_date && <tr className="border-b"><td className="py-1.5 font-medium">Review Date</td><td className="py-1.5">{format(new Date(plan.review_date), 'dd/MM/yyyy')}</td></tr>}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        {/* Additional Notes */}
        {child.notes && (
          <section className="mb-6">
            <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Additional Notes</h2>
            <p className="text-sm px-3">{child.notes}</p>
          </section>
        )}

        {/* Acknowledgement */}
        <section className="mb-6">
          <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Parent / Guardian Acknowledgement</h2>
          <div className="px-3 text-sm space-y-4">
            <p>I acknowledge that I have read and understood this plan, and that the information provided is accurate.</p>
            <div className="grid grid-cols-2 gap-8 items-end">
              <div>
                {parentSig ? (
                  <div>
                    <p className="font-medium mb-1">Parent / Guardian Signature:</p>
                    <img src={parentSig} alt="Parent signature" className="h-16 border-b border-black w-full object-contain object-left" />
                  </div>
                ) : (
                  <div className="no-print">
                    <SignaturePad label="Parent / Guardian Signature:" onSave={setParentSig} />
                  </div>
                )}
                {/* Print-only blank line if no sig */}
                {!parentSig && <div className="print-only hidden print:block border-b border-black mt-10"></div>}
              </div>
              <div>
                <p className="font-medium mb-1">Date:</p>
                <p className="border-b border-black pb-1">{parentSig ? parentSigDate : ''}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Staff Approval */}
        <section>
          <h2 className="text-sm font-bold uppercase bg-gray-100 px-3 py-1.5 mb-3">Staff Approval</h2>
          <div className="px-3 text-sm space-y-4">
            <div className="grid grid-cols-2 gap-8 items-end">
              <div>
                {staffSig ? (
                  <div>
                    <p className="font-medium mb-1">Staff Name & Signature:</p>
                    <img src={staffSig} alt="Staff signature" className="h-16 border-b border-black w-full object-contain object-left" />
                  </div>
                ) : (
                  <div className="no-print">
                    <SignaturePad label="Staff Name & Signature:" onSave={setStaffSig} />
                  </div>
                )}
                {!staffSig && <div className="hidden print:block border-b border-black mt-10"></div>}
              </div>
              <div>
                <p className="font-medium mb-1">Date:</p>
                <p className="border-b border-black pb-1">{staffSig ? parentSigDate : ''}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}