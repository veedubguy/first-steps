import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import SignaturePad from '@/components/shared/SignaturePad';
import { toast } from 'sonner';

const today = format(new Date(), 'dd/MM/yyyy');
const todayISO = new Date().toISOString().split('T')[0];
const reviewDate = format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'dd/MM/yyyy');

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

  const [staffSig, setStaffSig] = useState(null);

  const signedRecord = planTracking.find(p => p.plan_status === 'Signed' && p.parent_signature_url);
  const savedParentSig = signedRecord?.parent_signature_url || null;
  const savedParentName = signedRecord?.parent_signed_name || null;
  const savedSignedDate = signedRecord?.signed_date ? format(new Date(signedRecord.signed_date), 'dd/MM/yyyy') : null;

  if (lc || lr) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!child) return <div className="text-center py-12">Child not found</div>;

  const activePlans = riskPlans.filter(p => p.status !== 'Closed');
  const planImplementedDate = planTracking[0]?.sent_date
    ? format(new Date(planTracking[0].sent_date), 'dd/MM/yyyy')
    : today;
  const planReviewDate = activePlans[0]?.review_date
    ? format(new Date(activePlans[0].review_date), 'dd/MM/yyyy')
    : reviewDate;
  const childFullName = `${child.first_name} ${child.last_name}`;
  const conditionLabel = child.condition_type === 'Allergy' ? 'Allergic Reaction' :
    child.condition_type === 'Asthma' ? 'Asthma' : 'Dietary Requirement';

  const isAllergy = child.condition_type === 'Allergy';
  const isAsthma = child.condition_type === 'Asthma';

  return (
    <div>
      {/* Screen Controls */}
      <div className="no-print flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Print Plan</h1>
        <Button variant="outline" onClick={() => {
          const url = `${window.location.origin}/parent-acknowledgement?child=${id}`;
          navigator.clipboard.writeText(url);
          toast.success('Parent link copied — ready to paste into SMS');
        }} className="gap-2">
          <Link2 className="w-4 h-4" /> Copy Parent Link
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      {/* ======================== PAGE 1: RISK MINIMISATION PLAN ======================== */}
      <div className="bg-white text-black max-w-4xl mx-auto p-8 border rounded-lg print:border-0 print:rounded-none print:shadow-none mb-4 print:mb-0" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

        {/* Page Footer info (shown at top for reference) */}
        <div className="text-xs text-gray-500 mb-2 print:hidden">Page 1 of 4 — Risk Minimisation Plan</div>

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">Risk Minimisation Plan</h1>
            <div className="mt-2 space-y-1 text-sm font-semibold">
              <div><span className="font-bold">Centre Name:</span> First Steps Before & After School Care</div>
              <div><span className="font-bold">Child's Name:</span> {childFullName} &nbsp;&nbsp; <span className="font-bold">Date of Birth:</span> {child.dob ? format(new Date(child.dob), 'dd/MM/yyyy') : '—'}</div>
              <div><span className="font-bold">Diagnosed Medical Condition:</span> {conditionLabel}</div>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 hidden print:block">
            <div className="w-20 h-20 border border-gray-300 ml-auto" />
          </div>
        </div>

        {/* Identified Medical Condition Table */}
        <table className="w-full border-collapse border border-gray-400 mb-3 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '65%' }}>IDENTIFIED MEDICAL CONDITION</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Location of Medical Management/Action Plan:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-3">
                {isAllergy && child.allergens ? `Allergic Reaction – ${child.allergens}${child.severity ? ` (${child.severity})` : ''}` : ''}
                {isAsthma ? `Asthma${child.asthma_severity ? ` – ${child.asthma_severity}` : ''}${child.asthma_triggers ? `. Triggers: ${child.asthma_triggers}` : ''}` : ''}
                {child.condition_type === 'Dietary' && child.dietary_requirement ? child.dietary_requirement : ''}
              </td>
              <td className="border border-gray-400 px-2 py-3">{child.condition_type}</td>
            </tr>
          </tbody>
        </table>

        {/* Emergency Contacts Table */}
        <table className="w-full border-collapse border border-gray-400 mb-3 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '28%' }}>Emergency Contacts:</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '22%' }}>Contact Number(s)</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '15%' }}>Relationship</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '20%' }}>Childs Dr/Specialist(s):</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Contact No:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-2">1. {child.parent_name || '—'}</td>
              <td className="border border-gray-400 px-2 py-2">{child.parent_phone || '—'}</td>
              <td className="border border-gray-400 px-2 py-2">Parent/Guardian</td>
              <td className="border border-gray-400 px-2 py-2" rowSpan={2}></td>
              <td className="border border-gray-400 px-2 py-2" rowSpan={2}></td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-2">2.</td>
              <td className="border border-gray-400 px-2 py-2"></td>
              <td className="border border-gray-400 px-2 py-2"></td>
            </tr>
          </tbody>
        </table>

        {/* Trigger / Exposure / Reaction / Risk / Strategies Table */}
        <table className="w-full border-collapse border border-gray-400 mb-6 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Trigger Mechanism</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Potential Sources/Times for Exposure</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Potential Reactions</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Likelihood/Impact (Use Matrix)</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Strategies to Minimise Risk</th>
            </tr>
          </thead>
          <tbody>
            {activePlans.length > 0 ? activePlans.map((plan) => (
              <tr key={plan.id}>
                <td className="border border-gray-400 px-2 py-3">{plan.trigger || ''}</td>
                <td className="border border-gray-400 px-2 py-3">{plan.exposure_risk || ''}</td>
                <td className="border border-gray-400 px-2 py-3">{plan.reaction || ''}</td>
                <td className="border border-gray-400 px-2 py-3 font-semibold">{plan.risk_level || ''}</td>
                <td className="border border-gray-400 px-2 py-3">{plan.control_measures || ''}</td>
              </tr>
            )) : (
              <>
                <tr><td className="border border-gray-400 px-2 py-6" colSpan={5}></td></tr>
                <tr><td className="border border-gray-400 px-2 py-6" colSpan={5}></td></tr>
              </>
            )}
          </tbody>
        </table>

        {/* Page Footer */}
        <div className="border-t border-gray-300 pt-1 text-xs text-gray-500 flex justify-between">
          <span>Medical action plan for: {childFullName}</span>
          <span>Date of plan implemented: {planImplementedDate}</span>
          <span>Date for plan to be reviewed: {planReviewDate}</span>
        </div>
      </div>

      {/* ======================== PAGE 2: MEDICATION DETAILS + RISK MATRIX ======================== */}
      <div className="bg-white text-black max-w-4xl mx-auto p-8 border rounded-lg print:border-0 print:rounded-none print:shadow-none mb-4 print:mb-0 print:page-break-before-always" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

        <div className="text-xs text-gray-500 mb-2 print:hidden">Page 2 of 4 — Medication Details & Risk Matrix</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Risk Minimisation Plan</h1>

        {/* Medication Details */}
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" colSpan={2}>DETAILS OF MEDICATION REQUIRED.</th>
              <th className="border border-gray-400 px-2 py-1.5 text-right font-bold" colSpan={4}>CHILD: {childFullName}</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Medication Name:</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Expiry Date:</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Supplied by & date:</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Comments/Notes</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Location Medication Kept:</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold">Checked by & Date:</th>
            </tr>
          </thead>
          <tbody>
            {activePlans.filter(p => p.medication_required).map((plan) => (
              <tr key={plan.id}>
                <td className="border border-gray-400 px-2 py-3">{plan.medication_required || ''}</td>
                <td className="border border-gray-400 px-2 py-3"></td>
                <td className="border border-gray-400 px-2 py-3"></td>
                <td className="border border-gray-400 px-2 py-3"></td>
                <td className="border border-gray-400 px-2 py-3">{plan.medication_location || ''}</td>
                <td className="border border-gray-400 px-2 py-3"></td>
              </tr>
            ))}
            {[...Array(Math.max(3, 3 - activePlans.filter(p => p.medication_required).length))].map((_, i) => (
              <tr key={i}><td className="border border-gray-400 px-2 py-4" colSpan={6}></td></tr>
            ))}
          </tbody>
        </table>

        <div className="text-xs mb-1 italic">Guardian Signature: ___________________________________</div>

        {/* Risk Benefit Analysis Matrix */}
        <div className="flex gap-4 mt-4">
          <div style={{ width: '55%' }}>
            <table className="w-full border-collapse border border-gray-400 text-xs">
              <thead>
                <tr>
                  <th className="border border-gray-400 px-2 py-1.5 text-left font-bold bg-gray-100" rowSpan={2}>RISK BENEFIT ANALYSIS MATRIX</th>
                  <th className="border border-gray-400 px-2 py-1.5 text-center font-bold bg-gray-100" colSpan={5}>CONSEQUENCE</th>
                </tr>
                <tr>
                  {['Insignificant','Minor','Moderate','Major','Extreme'].map(h => (
                    <th key={h} className="border border-gray-400 px-1 py-1 text-center font-bold text-xs bg-gray-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'RARE', cells: ['LOW','LOW','LOW','MODERATE','HIGH'] },
                  { label: 'UNLIKELY', cells: ['LOW','LOW','MODERATE','HIGH','HIGH'] },
                  { label: 'POSSIBLE', cells: ['LOW','MODERATE','HIGH','HIGH','EXTREME'] },
                  { label: 'LIKELY', cells: ['MODERATE','MODERATE','HIGH','EXTREME','EXTREME'] },
                  { label: 'ALMOST CERTAIN', cells: ['MODERATE','HIGH','HIGH','EXTREME','EXTREME'] },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="border border-gray-400 px-1 py-1 font-bold text-xs bg-gray-50 text-center">{row.label}</td>
                    {row.cells.map((cell, ci) => (
                      <td key={ci} className={`border border-gray-400 px-1 py-1.5 text-center font-bold text-xs ${
                        cell === 'EXTREME' ? 'bg-red-200' :
                        cell === 'HIGH' ? 'bg-orange-200' :
                        cell === 'MODERATE' ? 'bg-yellow-100' : 'bg-green-100'
                      }`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs italic mt-2 text-gray-600">The following people undersigned have been involved in the preparation of and have read, understood and agree that this document is best practice for the risk minimisation of the 'at risk' child identified in this plan. The parents/guardians agree to notify the centre of any changes asap.</p>
            <table className="w-full border-collapse border border-gray-400 mt-2 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-400 px-2 py-1 text-left font-bold">Name:</th>
                  <th className="border border-gray-400 px-2 py-1 text-left font-bold">Date:</th>
                  <th className="border border-gray-400 px-2 py-1 text-left font-bold">Signature</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-400 px-2 py-5"></td><td className="border border-gray-400 px-2 py-5"></td><td className="border border-gray-400 px-2 py-5"></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ width: '45%' }}>
            <div className="border border-gray-400 h-full p-2">
              <p className="font-bold text-xs mb-1">Comments</p>
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => <div key={i} className="border-b border-gray-200 pb-3"></div>)}
              </div>
            </div>
          </div>
        </div>

        {/* Page Footer */}
        <div className="border-t border-gray-300 pt-1 mt-4 text-xs text-gray-500 flex justify-between">
          <span>Medical action plan for: {childFullName}</span>
          <span>Date of plan implemented: {planImplementedDate}</span>
          <span>Date for plan to be reviewed: {planReviewDate}</span>
        </div>
      </div>

      {/* ======================== PAGE 3: COMMUNICATION PLAN ======================== */}
      <div className="bg-white text-black max-w-4xl mx-auto p-8 border rounded-lg print:border-0 print:rounded-none print:shadow-none mb-4 print:mb-0 print:page-break-before-always" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

        <div className="text-xs text-gray-500 mb-2 print:hidden">Page 3 of 4 — Communication Plan</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-1">Communication Plan</h1>
        <div className="text-sm font-semibold space-y-1 mb-3">
          <div><span className="font-bold">Centre Name:</span> First Steps Before & After School Care</div>
          <div className="flex gap-8">
            <span><span className="font-bold">Child's Name:</span> {childFullName}</span>
            <span><span className="font-bold">Date of Birth:</span> {child.dob ? format(new Date(child.dob), 'dd/MM/yyyy') : '—'}</span>
          </div>
          <div className="flex gap-8">
            <span><span className="font-bold">Diagnosed Medical Condition:</span> {conditionLabel}</span>
            <span><span className="font-bold">Plan prepared by:</span></span>
          </div>
        </div>

        <p className="font-bold text-sm mb-2">Communication Plan Checklist:</p>

        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '45%' }}>Actions to be completed by Centre</th>
              <th className="border border-gray-400 px-2 py-1.5 text-center font-bold" style={{ width: '10%' }}>Checked</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ width: '35%' }}>Actions to be completed by Family</th>
              <th className="border border-gray-400 px-2 py-1.5 text-center font-bold" style={{ width: '10%' }}>Checked</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'Nominated Supervisor will ensure that all educators, staff, volunteers and students understand the medical conditions for this child',
                'Medical Management plans are correct and current to ensure the correct information is provided to the centre',
              ],
              [
                'Medical management plan is fully completed and accessible for all educators',
                'If medical condition is food related, notify centre of their child\'s requirements and menu alternatives',
              ],
              [
                'The risk minimisation plan is developed and completed in consultation child\'s guardians',
                'The risk minimisation has been developed in consultation with family and centre',
              ],
              [
                'The nominated supervisor will communicate with educators of any changes to child\'s medical condition',
                'Any changes to their child\'s medical condition will be communicated immediately to the nominated supervisor',
              ],
              [
                'Medication will be stored out of reach of children, but in a recognisable, known location to educators. Medication will be checked to ensure it meets policy requirements',
                'All medications required will be on premises at all times child is in attendance. Medication will be prescribed by a doctor, in date, clearly labelled',
              ],
              [
                'Nominated supervisor will communicate the attendance patterns and any changes to educators',
                'Family will ensure that changes of attendance and absences are notified to centre',
              ],
              [
                'The nominated supervisor will ensure the medical management plan, risk minimisation and communication plan are reviewed annually, or when changes are identified',
                'The medical management, risk minimisation and communication plan will be reviewed annually or when changes are identified',
              ],
            ].map(([centre, family], i) => (
              <tr key={i}>
                <td className="border border-gray-400 px-2 py-2 align-top">{centre}</td>
                <td className="border border-gray-400 px-2 py-2 text-center"></td>
                <td className="border border-gray-400 px-2 py-2 align-top">{family}</td>
                <td className="border border-gray-400 px-2 py-2 text-center"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Emergency Contact Details */}
        <p className="font-bold text-sm mb-2" style={{ color: '#d97706' }}>Emergency Contact Details:</p>
        <table className="w-full border-collapse border border-gray-400 mb-4 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ color: '#d97706', width: '10%' }}>Priority</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ color: '#d97706', width: '35%' }}>Name</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ color: '#d97706', width: '30%' }}>Relationship to Child</th>
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" style={{ color: '#d97706' }}>Contact Number</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>1.</td>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>{child.parent_name || ''}</td>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>Parent/Guardian</td>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>{child.parent_phone || ''}</td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>2.</td>
              <td className="border border-gray-400 px-2 py-3"></td>
              <td className="border border-gray-400 px-2 py-3"></td>
              <td className="border border-gray-400 px-2 py-3"></td>
            </tr>
            <tr>
              <td className="border border-gray-400 px-2 py-3 font-bold" style={{ color: '#d97706' }}>3.</td>
              <td className="border border-gray-400 px-2 py-3"></td>
              <td className="border border-gray-400 px-2 py-3"></td>
              <td className="border border-gray-400 px-2 py-3"></td>
            </tr>
          </tbody>
        </table>

        {/* Sign-off text */}
        <p className="text-xs mb-4">
          I <strong>(Nominated supervisor)</strong> have discussed the details of this communication plan with <strong>{child.parent_name || '_______________'}</strong> (Child's parent) at <strong>First Steps Before & After School Care</strong> (Name of Centre).
          <br /><br />
          I <strong>{child.parent_name || '_______________'}</strong> (child's parent) agree to the communication plan outlined above being implemented for my child <strong>{childFullName}</strong>. I also give my permission for this information (including a current photo of my child) to be prominently displayed near locations where risk is high. This plan will be reviewed annually or when changes are identified. The next planned review date is: <strong>{planReviewDate}</strong>
        </p>

        {/* Signature section */}
        <div className="grid grid-cols-2 gap-12 mt-6">
          <div>
            {staffSig ? (
              <img src={staffSig} alt="Staff signature" className="h-12 border-b border-black w-full object-contain object-left mb-1" />
            ) : (
              <>
                <div className="no-print mb-1">
                  <SignaturePad label="" onSave={setStaffSig} />
                </div>
                <div className="hidden print:block border-b border-black mt-10 mb-1"></div>
              </>
            )}
            <p className="font-bold text-xs">Nominated Supervisor</p>
            <p className="text-xs">Name – </p>
          </div>
          <div>
            {savedParentSig ? (
              <img src={savedParentSig} alt="Guardian signature" className="h-12 border-b border-black w-full object-contain object-left mb-1" />
            ) : (
              <div className="border-b border-black mt-10 mb-1"></div>
            )}
            <p className="font-bold text-xs">Child's Guardian</p>
            <p className="text-xs">Name – {savedParentName || child.parent_name || ''}</p>
          </div>
        </div>

        {/* Page Footer */}
        <div className="border-t border-gray-300 pt-1 mt-6 text-xs text-gray-500 flex justify-between">
          <span>Medical action plan for: {childFullName}</span>
          <span>Date of plan implemented: {planImplementedDate}</span>
          <span>Date for plan to be reviewed: {planReviewDate}</span>
        </div>
      </div>

      {/* ======================== PAGE 4: STAFF COMMUNICATION RECORD ======================== */}
      <div className="bg-white text-black max-w-4xl mx-auto p-8 border rounded-lg print:border-0 print:rounded-none print:shadow-none mb-4 print:mb-0 print:page-break-before-always" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>

        <div className="text-xs text-gray-500 mb-2 print:hidden">Page 4 of 4 — Staff Communication Record</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-4">Risk Minimisation Plan</h1>

        <table className="w-full border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-1.5 text-left font-bold" colSpan={2}>STAFF COMMUNICATION RECORD [Reg90-1(c)(iv)]</th>
              <th className="border border-gray-400 px-2 py-1.5 text-right font-bold" colSpan={5}>CHILD: {childFullName}</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="border border-gray-400 px-2 py-2 text-left font-bold" style={{ width: '20%' }}>Educator/Staff Name</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>I have read medical conditions policy</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>I am informed about child's medical condition and individual care plan</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>I have read and know the location of the Medical Management Plan</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>I have read and know the location of the Risk Minimisation Plan</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>I know how to use the child's medications & where they are stored</th>
              <th className="border border-gray-400 px-2 py-2 text-center font-bold" style={{ width: '15%' }}>Date/Signature of Educator/Staff</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(12)].map((_, i) => (
              <tr key={i}>
                <td className="border border-gray-400 px-2 py-3"></td>
                <td className="border border-gray-400 px-2 py-3 text-center"></td>
                <td className="border border-gray-400 px-2 py-3 text-center"></td>
                <td className="border border-gray-400 px-2 py-3 text-center"></td>
                <td className="border border-gray-400 px-2 py-3 text-center"></td>
                <td className="border border-gray-400 px-2 py-3 text-center"></td>
                <td className="border border-gray-400 px-2 py-3"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Final sign-off & amendments table */}
        <div className="mt-6">
          <p className="text-xs mb-4">
            I <strong>(Nominated supervisor)</strong> have discussed the details of this risk minimisation and communication plan with <strong>{child.parent_name || '_______________'}</strong>. (Child's parent) at <strong>First Steps Before and After School Care</strong>, (Name of Centre) and I agree to the risk minimisation outlined above being implemented for my child <strong>{childFullName}</strong>.
            <br /><br />
            I also give my permission for this information (including a current photo of my child) to be prominently displayed near locations where risk is high. This plan will be reviewed annually or when changes are identified. The next planned review date is: <strong>{planReviewDate}</strong>
          </p>

          <div className="grid grid-cols-2 gap-12 mb-6">
            <div>
              {staffSig ? (
                <img src={staffSig} alt="Staff signature" className="h-12 border-b border-black w-full object-contain object-left mb-1" />
              ) : (
                <div className="border-b border-black mt-10 mb-1 no-print"></div>
              )}
              <p className="font-bold text-xs">Nominated Supervisor</p>
              <p className="text-xs">Name – </p>
            </div>
            <div>
              {savedParentSig ? (
                <img src={savedParentSig} alt="Guardian signature" className="h-12 border-b border-black w-full object-contain object-left mb-1" />
              ) : (
                <div className="border-b border-black mt-10 mb-1"></div>
              )}
              <p className="font-bold text-xs">Child's Guardian</p>
              <p className="text-xs">Name – {savedParentName || child.parent_name || ''}</p>
            </div>
          </div>

          {/* Changes/Amendments log table */}
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-bold bg-red-100" style={{ color: '#b91c1c' }}>Date of Change</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-bold bg-red-100" style={{ color: '#b91c1c' }}>Changes Made</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-bold bg-red-100" style={{ color: '#b91c1c' }}>Nominated Supervisor (Name and Sign)</th>
                <th className="border border-gray-400 px-2 py-1.5 text-left font-bold bg-red-100" style={{ color: '#b91c1c' }}>Child's Guardian (Name and Sign)</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(3)].map((_, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 px-2 py-5"></td>
                  <td className="border border-gray-400 px-2 py-5"></td>
                  <td className="border border-gray-400 px-2 py-5"></td>
                  <td className="border border-gray-400 px-2 py-5"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Page Footer */}
        <div className="border-t border-gray-300 pt-1 mt-4 text-xs text-gray-500 flex justify-between">
          <span>Medical action plan for: {childFullName}</span>
          <span>Date of plan implemented: {planImplementedDate}</span>
          <span>Date for plan to be reviewed: {planReviewDate}</span>
        </div>
      </div>
    </div>
  );
}