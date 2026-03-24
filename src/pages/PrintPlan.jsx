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
import PrintStyles from '@/components/print/PrintStyles';

// ─── shared inline style tokens ──────────────────────────────────────────────
const F = { fontFamily: 'Arial, sans-serif' };
const PAGE = { ...F, fontSize: '10px', lineHeight: '1.35', background: 'white', color: '#111', padding: '0', marginBottom: '16px' };
const TH = { border: '1px solid #6b7280', padding: '5px 6px', background: '#f3f4f6', fontWeight: 'bold', textAlign: 'left', fontSize: '10px' };
const TD = { border: '1px solid #6b7280', padding: '5px 6px', fontSize: '10px', verticalAlign: 'top' };
const TDC = { ...TD, textAlign: 'center' };
const TABLE = { width: '100%', borderCollapse: 'collapse', marginBottom: '8px' };
const SEC_HDR = { fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', background: '#e5e7eb', padding: '4px 8px', marginBottom: '6px', letterSpacing: '0.03em' };
const SIG_LINE = { borderBottom: '1px solid #111', minHeight: '32px', marginBottom: '3px' };

const riskColor = (cell) => {
  if (cell === 'EXTREME') return '#fecaca';
  if (cell === 'HIGH') return '#fed7aa';
  if (cell === 'MODERATE') return '#fef9c3';
  return '#dcfce7';
};

export default function PrintPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staffSig, setStaffSig] = useState(null);

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

  const { data: staffSignoffs = [] } = useQuery({
    queryKey: ['staffSignoffs', id],
    queryFn: () => base44.entities.StaffSignoff.filter({ child_id: id }, 'signed_date'),
  });

  if (lc || lr) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!child) return <div className="text-center py-12">Child not found</div>;

  const activePlans = riskPlans.filter(p => p.status !== 'Closed');
  const signedRecord = planTracking.find(p => p.plan_status === 'Signed' && p.parent_signature_url);
  const savedParentSig = signedRecord?.parent_signature_url || null;
  const savedParentName = signedRecord?.parent_signed_name || null;
  const savedSignedDate = signedRecord?.signed_date ? format(new Date(signedRecord.signed_date), 'dd/MM/yyyy') : null;

  const today = format(new Date(), 'dd/MM/yyyy');
  const planImplementedDate = planTracking[0]?.sent_date
    ? format(new Date(planTracking[0].sent_date), 'dd/MM/yyyy') : today;
  const planReviewDate = activePlans[0]?.review_date
    ? format(new Date(activePlans[0].review_date), 'dd/MM/yyyy')
    : format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'dd/MM/yyyy');

  const childName = `${child.first_name} ${child.last_name}`;
  const dob = child.dob ? format(new Date(child.dob), 'dd/MM/yyyy') : '—';
  const isAllergy = child.condition_type === 'Allergy';
  const isAsthma = child.condition_type === 'Asthma';
  const conditionDesc = isAllergy
    ? `Allergic Reaction${child.allergens ? ` – ${child.allergens}` : ''}${child.severity ? ` (${child.severity})` : ''}`
    : isAsthma
    ? `Asthma${child.asthma_severity ? ` – ${child.asthma_severity}` : ''}${child.asthma_triggers ? `. Triggers: ${child.asthma_triggers}` : ''}`
    : child.dietary_requirement || 'Dietary Requirement';

  const Footer = () => (
    <div style={{ borderTop: '1px solid #d1d5db', marginTop: '10px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#6b7280' }}>
      <span>Medical action plan for: <strong>{childName}</strong></span>
      <span>Date of plan implemented: {planImplementedDate}</span>
      <span>Date for plan to be reviewed: {planReviewDate}</span>
    </div>
  );

  const SigBlock = ({ label, name, sigUrl, onCapture, blank }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>{label}</div>
      {sigUrl ? (
        <img src={sigUrl} alt="signature" style={{ height: '36px', width: '100%', objectFit: 'contain', objectPosition: 'left', borderBottom: '1px solid #111', marginBottom: '3px' }} />
      ) : onCapture ? (
        <>
          <div className="no-print"><SignaturePad label="" onSave={onCapture} /></div>
          <div className="hidden print:block" style={SIG_LINE}></div>
        </>
      ) : (
        <div style={SIG_LINE}></div>
      )}
      {blank ? (
        <div style={{ fontSize: '10px' }}>Name: _______________________</div>
      ) : (
        <div style={{ fontSize: '10px' }}>Name: <strong>{name || '___________________'}</strong></div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '794px', margin: '0 auto' }}>
      <PrintStyles />

      {/* ── Screen toolbar ── */}
      <div className="no-print flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Print Plan</h1>
        <Button variant="outline" onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/parent-acknowledgement?child=${id}`);
          toast.success('Parent link copied');
        }} className="gap-2">
          <Link2 className="w-4 h-4" /> Copy Parent Link
        </Button>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 1 — RISK MINIMISATION PLAN (main body)
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '20px 24px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div className="no-print" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>Page 1 — Risk Minimisation Plan</div>

        {/* Title + meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 6px 0' }}>Risk Minimisation Plan</h1>
            <div style={{ fontSize: '10px', lineHeight: '1.7' }}>
              <div><strong>Centre Name:</strong> First Steps Before &amp; After School Care</div>
              <div><strong>Child's Name:</strong> {childName} &nbsp;&nbsp;&nbsp; <strong>Date of Birth:</strong> {dob}</div>
              <div><strong>Diagnosed Medical Condition:</strong> {child.condition_type}</div>
              <div><strong>Date of Plan Implemented:</strong> {planImplementedDate} &nbsp;&nbsp;&nbsp; <strong>Review Date:</strong> {planReviewDate}</div>
            </div>
          </div>
          {child.photo_url ? (
            <img src={child.photo_url} alt={childName} style={{ width: '72px', height: '72px', objectFit: 'cover', border: '1px solid #d1d5db', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '72px', height: '72px', border: '1px solid #d1d5db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#9ca3af', textAlign: 'center' }}>Photo</div>
          )}
        </div>

        {/* Medical Condition */}
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '65%' }}>IDENTIFIED MEDICAL CONDITION</th>
              <th style={TH}>Location of Medical Management / Action Plan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...TD, paddingTop: '8px', paddingBottom: '8px' }}>{conditionDesc}</td>
              <td style={TD}>{child.condition_type}</td>
            </tr>
          </tbody>
        </table>

        {/* Emergency Contacts */}
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '25%' }}>Emergency Contact</th>
              <th style={{ ...TH, width: '20%' }}>Contact Number</th>
              <th style={{ ...TH, width: '15%' }}>Relationship</th>
              <th style={{ ...TH, width: '25%' }}>Child's Dr / Specialist</th>
              <th style={TH}>Contact No</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={TD}>1. {child.parent_name || ''}</td>
              <td style={TD}>{child.parent_phone || ''}</td>
              <td style={TD}>Parent/Guardian</td>
              <td style={{ ...TD, borderBottom: 'none' }} rowSpan={2}></td>
              <td style={{ ...TD, borderBottom: 'none' }} rowSpan={2}></td>
            </tr>
            <tr>
              <td style={TD}>2.</td>
              <td style={TD}></td>
              <td style={TD}></td>
            </tr>
          </tbody>
        </table>

        {/* Risk table */}
        <table style={{ ...TABLE, marginBottom: '12px' }}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '18%' }}>Trigger Mechanism</th>
              <th style={{ ...TH, width: '20%' }}>Potential Sources / Times for Exposure</th>
              <th style={{ ...TH, width: '18%' }}>Potential Reactions</th>
              <th style={{ ...TH, width: '12%' }}>Risk Level</th>
              <th style={TH}>Strategies to Minimise Risk</th>
            </tr>
          </thead>
          <tbody>
            {activePlans.length > 0 ? activePlans.map(plan => (
              <tr key={plan.id}>
                <td style={{ ...TD, paddingTop: '8px', paddingBottom: '8px' }}>{plan.trigger || ''}</td>
                <td style={TD}>{plan.exposure_risk || ''}</td>
                <td style={TD}>{plan.reaction || ''}</td>
                <td style={{ ...TD, fontWeight: 'bold', textAlign: 'center' }}>{plan.risk_level || ''}</td>
                <td style={TD}>{plan.control_measures || ''}</td>
              </tr>
            )) : (
              <>
                <tr>{[...Array(5)].map((_, i) => <td key={i} style={{ ...TD, height: '40px' }}></td>)}</tr>
                <tr>{[...Array(5)].map((_, i) => <td key={i} style={{ ...TD, height: '40px' }}></td>)}</tr>
              </>
            )}
          </tbody>
        </table>

        <Footer />
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 2 — MEDICATION DETAILS + RISK MATRIX
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '20px 24px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div className="no-print" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>Page 2 — Medication Details &amp; Risk Matrix</div>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 10px 0' }}>Risk Minimisation Plan</h1>

        {/* Medication */}
        <div style={SEC_HDR}>Details of Medication Required &nbsp;·&nbsp; Child: {childName}</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '20%' }}>Medication Name</th>
              <th style={{ ...TH, width: '14%' }}>Expiry Date</th>
              <th style={{ ...TH, width: '16%' }}>Supplied by &amp; Date</th>
              <th style={{ ...TH, width: '18%' }}>Comments / Notes</th>
              <th style={{ ...TH, width: '18%' }}>Location Kept</th>
              <th style={TH}>Checked by &amp; Date</th>
            </tr>
          </thead>
          <tbody>
            {activePlans.filter(p => p.medication_required).map(plan => (
              <tr key={plan.id}>
                <td style={{ ...TD, paddingTop: '8px', paddingBottom: '8px' }}>{plan.medication_required}</td>
                <td style={TD}>{plan.medication_expiry_date ? format(new Date(plan.medication_expiry_date), 'dd/MM/yyyy') : ''}</td>
                <td style={TD}>{plan.medication_supplied_by || ''}{plan.medication_supplied_date ? ` – ${format(new Date(plan.medication_supplied_date), 'dd/MM/yyyy')}` : ''}</td>
                <td style={TD}></td>
                <td style={TD}>{plan.medication_location || ''}</td>
                <td style={TD}></td>
              </tr>
            ))}
            {[...Array(Math.max(3, 3 - activePlans.filter(p => p.medication_required).length))].map((_, i) => (
              <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} style={{ ...TD, height: '30px' }}></td>)}</tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: '10px', marginBottom: '12px', fontStyle: 'italic' }}>
          Guardian Signature: ___________________________________
        </div>

        {/* Risk matrix + comments */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: '0 0 54%' }}>
            <div style={SEC_HDR}>Risk Benefit Analysis Matrix</div>
            <table style={{ ...TABLE, marginBottom: '4px' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>LIKELIHOOD</th>
                  {['Insignificant', 'Minor', 'Moderate', 'Major', 'Extreme'].map(h => (
                    <th key={h} style={{ ...TH, textAlign: 'center', fontSize: '9px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'RARE',          cells: ['LOW','LOW','LOW','MODERATE','HIGH'] },
                  { label: 'UNLIKELY',      cells: ['LOW','LOW','MODERATE','HIGH','HIGH'] },
                  { label: 'POSSIBLE',      cells: ['LOW','MODERATE','HIGH','HIGH','EXTREME'] },
                  { label: 'LIKELY',        cells: ['MODERATE','MODERATE','HIGH','EXTREME','EXTREME'] },
                  { label: 'ALMOST CERTAIN',cells: ['MODERATE','HIGH','HIGH','EXTREME','EXTREME'] },
                ].map(row => (
                  <tr key={row.label}>
                    <td style={{ ...TD, fontWeight: 'bold', background: '#f9fafb', textAlign: 'center', fontSize: '9px' }}>{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} style={{ ...TDC, fontWeight: 'bold', fontSize: '9px', background: riskColor(cell) }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: '9px', color: '#6b7280', fontStyle: 'italic', marginBottom: '6px' }}>
              The following people undersigned have been involved in the preparation of and have read, understood and agree that this document is best practice for the risk minimisation of the 'at risk' child. Parents/guardians agree to notify the centre of any changes immediately.
            </p>
            <table style={TABLE}>
              <thead><tr>
                <th style={{ ...TH, width: '35%' }}>Name</th>
                <th style={{ ...TH, width: '20%' }}>Date</th>
                <th style={TH}>Signature</th>
              </tr></thead>
              <tbody>
                <tr>
                  <td style={{ ...TD, height: '28px' }}></td>
                  <td style={TD}></td>
                  <td style={TD}></td>
                </tr>
                <tr>
                  <td style={{ ...TD, height: '28px' }}></td>
                  <td style={TD}></td>
                  <td style={TD}></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ flex: 1, border: '1px solid #6b7280', padding: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '6px' }}>Comments</div>
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '14px' }}></div>
            ))}
          </div>
        </div>

        <Footer />
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 3 — COMMUNICATION PLAN
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '20px 24px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div className="no-print" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>Page 3 — Communication Plan</div>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 8px 0' }}>Communication Plan</h1>

        <div style={{ fontSize: '10px', lineHeight: '1.7', marginBottom: '8px' }}>
          <div><strong>Centre Name:</strong> First Steps Before &amp; After School Care</div>
          <div><strong>Child's Name:</strong> {childName} &nbsp;&nbsp;&nbsp; <strong>Date of Birth:</strong> {dob}</div>
          <div><strong>Diagnosed Medical Condition:</strong> {child.condition_type} &nbsp;&nbsp;&nbsp; <strong>Plan prepared by:</strong> _________________________</div>
        </div>

        <div style={SEC_HDR}>Communication Plan Checklist</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '43%' }}>Actions to be completed by Centre</th>
              <th style={{ ...TH, width: '7%', textAlign: 'center' }}>✓</th>
              <th style={{ ...TH, width: '43%' }}>Actions to be completed by Family</th>
              <th style={{ ...TH, width: '7%', textAlign: 'center' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Nominated Supervisor will ensure all educators, staff, volunteers and students understand the medical conditions for this child.',
               'Medical Management plans are correct and current to ensure correct information is provided to the centre.'],
              ['Medical management plan is fully completed and accessible for all educators.',
               'If medical condition is food related, notify centre of child\'s requirements and menu alternatives.'],
              ['The risk minimisation plan is developed and completed in consultation with child\'s guardians.',
               'The risk minimisation plan has been developed in consultation with family and centre.'],
              ['The nominated supervisor will communicate with educators of any changes to child\'s medical condition.',
               'Any changes to their child\'s medical condition will be communicated immediately to the nominated supervisor.'],
              ['Medication will be stored out of reach of children in a recognisable, known location to educators. Medication will be checked to ensure it meets policy requirements.',
               'All medications required will be on premises at all times child is in attendance. Medication will be prescribed by a doctor, in date, and clearly labelled.'],
              ['Nominated supervisor will communicate attendance patterns and any changes to educators.',
               'Family will ensure changes of attendance and absences are notified to the centre.'],
              ['The nominated supervisor will ensure the medical management plan, risk minimisation and communication plan are reviewed annually, or when changes are identified.',
               'The medical management, risk minimisation and communication plan will be reviewed annually or when changes are identified.'],
            ].map(([centre, family], i) => (
              <tr key={i}>
                <td style={{ ...TD, paddingTop: '5px', paddingBottom: '5px' }}>{centre}</td>
                <td style={TDC}></td>
                <td style={{ ...TD, paddingTop: '5px', paddingBottom: '5px' }}>{family}</td>
                <td style={TDC}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Emergency contacts */}
        <div style={SEC_HDR}>Emergency Contact Details</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '8%' }}>Priority</th>
              <th style={{ ...TH, width: '34%' }}>Name</th>
              <th style={{ ...TH, width: '28%' }}>Relationship to Child</th>
              <th style={TH}>Contact Number</th>
            </tr>
          </thead>
          <tbody>
            {[
              { n: '1.', name: child.parent_name || '', rel: 'Parent/Guardian', ph: child.parent_phone || '' },
              { n: '2.', name: '', rel: '', ph: '' },
              { n: '3.', name: '', rel: '', ph: '' },
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ ...TD, fontWeight: 'bold', paddingTop: '7px', paddingBottom: '7px' }}>{r.n}</td>
                <td style={{ ...TD, fontWeight: i === 0 ? 'bold' : 'normal' }}>{r.name}</td>
                <td style={TD}>{r.rel}</td>
                <td style={{ ...TD, fontWeight: i === 0 ? 'bold' : 'normal' }}>{r.ph}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: '10px', marginBottom: '10px', lineHeight: '1.6' }}>
          I <strong>(Nominated supervisor)</strong> have discussed the details of this communication plan with <strong>{child.parent_name || '_______________'}</strong> (Child's parent) at <strong>First Steps Before &amp; After School Care</strong>.<br /><br />
          I <strong>{child.parent_name || '_______________'}</strong> (child's parent) agree to the communication plan outlined above being implemented for my child <strong>{childName}</strong>. I also give my permission for this information (including a current photo of my child) to be prominently displayed near locations where risk is high. This plan will be reviewed annually or when changes are identified. The next planned review date is: <strong>{planReviewDate}</strong>
        </p>

        <div style={{ display: 'flex', gap: '48px' }}>
          <SigBlock label="Nominated Supervisor" name="" onCapture={setStaffSig} sigUrl={staffSig} />
          <SigBlock label="Child's Guardian" name={savedParentName || child.parent_name} sigUrl={savedParentSig} />
        </div>

        <Footer />
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 4 — STAFF COMMUNICATION RECORD + AMENDMENTS
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '20px 24px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div className="no-print" style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>Page 4 — Staff Communication Record</div>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 10px 0' }}>Risk Minimisation Plan</h1>

        <div style={SEC_HDR}>Staff Communication Record [Reg 90-1(c)(iv)] &nbsp;·&nbsp; Child: {childName}</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '20%' }}>Educator / Staff Name</th>
              <th style={{ ...TH, width: '13%', textAlign: 'center', fontSize: '9px' }}>I have read medical conditions policy</th>
              <th style={{ ...TH, width: '13%', textAlign: 'center', fontSize: '9px' }}>I am informed about child's medical condition &amp; care plan</th>
              <th style={{ ...TH, width: '13%', textAlign: 'center', fontSize: '9px' }}>I know the location of the Medical Management Plan</th>
              <th style={{ ...TH, width: '13%', textAlign: 'center', fontSize: '9px' }}>I know the location of the Risk Minimisation Plan</th>
              <th style={{ ...TH, width: '13%', textAlign: 'center', fontSize: '9px' }}>I know how to use child's medications &amp; where stored</th>
              <th style={{ ...TH, width: '15%', textAlign: 'center', fontSize: '9px' }}>Date / Signature</th>
            </tr>
          </thead>
          <tbody>
            {staffSignoffs.map(s => (
              <tr key={s.id}>
                <td style={{ ...TD, height: '22px' }}>
                  <div>{s.staff_name}</div>
                  {s.staff_role && <div style={{ fontSize: '9px', color: '#6b7280' }}>{s.staff_role}</div>}
                </td>
                <td style={{ ...TDC, color: s.check_medical_policy ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_medical_policy ? '✓' : '✗'}</td>
                <td style={{ ...TDC, color: s.check_condition_aware ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_condition_aware ? '✓' : '✗'}</td>
                <td style={{ ...TDC, color: s.check_med_plan_location ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_med_plan_location ? '✓' : '✗'}</td>
                <td style={{ ...TDC, color: s.check_risk_plan_location ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_risk_plan_location ? '✓' : '✗'}</td>
                <td style={{ ...TDC, color: s.check_medication_use ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_medication_use ? '✓' : '✗'}</td>
                <td style={TD}>
                  {s.signature_url && <img src={s.signature_url} alt="sig" style={{ height: '20px', maxWidth: '80px', objectFit: 'contain' }} />}
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>{s.signed_date ? format(new Date(s.signed_date), 'dd/MM/yyyy') : ''}</div>
                </td>
              </tr>
            ))}
            {[...Array(Math.max(0, 10 - staffSignoffs.length))].map((_, i) => (
              <tr key={i}>
                <td style={{ ...TD, height: '22px' }}></td>
                <td style={TDC}></td>
                <td style={TDC}></td>
                <td style={TDC}></td>
                <td style={TDC}></td>
                <td style={TDC}></td>
                <td style={TD}></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Final sign-off */}
        <p style={{ fontSize: '10px', margin: '10px 0', lineHeight: '1.6' }}>
          I <strong>(Nominated supervisor)</strong> have discussed the details of this risk minimisation and communication plan with <strong>{child.parent_name || '_______________'}</strong> (Child's parent) at <strong>First Steps Before &amp; After School Care</strong> and I agree to the risk minimisation outlined above being implemented for my child <strong>{childName}</strong>.<br /><br />
          I also give my permission for this information (including a current photo of my child) to be prominently displayed near locations where risk is high. This plan will be reviewed annually or when changes are identified. The next planned review date is: <strong>{planReviewDate}</strong>
        </p>

        <div style={{ display: 'flex', gap: '48px', marginBottom: '14px' }}>
          <SigBlock label="Nominated Supervisor" name="" onCapture={setStaffSig} sigUrl={staffSig} />
          <SigBlock label="Child's Guardian" name={savedParentName || child.parent_name} sigUrl={savedParentSig} />
        </div>

        {/* Amendments log */}
        <div style={SEC_HDR}>Record of Updates / Amendments</div>
        <table style={TABLE}>
          <thead>
            <tr>
              <th style={{ ...TH, width: '15%', background: '#fee2e2', color: '#991b1b' }}>Date of Change</th>
              <th style={{ ...TH, width: '35%', background: '#fee2e2', color: '#991b1b' }}>Changes Made</th>
              <th style={{ ...TH, background: '#fee2e2', color: '#991b1b' }}>Nominated Supervisor (Name &amp; Sign)</th>
              <th style={{ ...TH, background: '#fee2e2', color: '#991b1b' }}>Child's Guardian (Name &amp; Sign)</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(4)].map((_, i) => (
              <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} style={{ ...TD, height: '28px' }}></td>)}</tr>
            ))}
          </tbody>
        </table>

        <Footer />
      </div>
    </div>
  );
}