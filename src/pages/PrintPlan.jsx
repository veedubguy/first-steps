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
const PAGE = { ...F, fontSize: '9px', lineHeight: '1.3', background: 'white', color: '#111', padding: '0' };
const TH = { border: '1px solid #6b7280', padding: '3px 5px', background: '#f3f4f6', fontWeight: 'bold', textAlign: 'left', fontSize: '9px' };
const TD = { border: '1px solid #6b7280', padding: '3px 5px', fontSize: '9px', verticalAlign: 'top' };
const TDC = { ...TD, textAlign: 'center' };
const TABLE = { width: '100%', borderCollapse: 'collapse', marginBottom: '6px' };
const SEC_HDR = { fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', background: '#e5e7eb', padding: '3px 6px', marginBottom: '4px', letterSpacing: '0.03em' };
const SIG_LINE = { borderBottom: '1px solid #111', minHeight: '28px', marginBottom: '2px' };

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
    queryFn: () => base44.entities.StaffSignoff.filter({ child_id: id }, '-signed_date'),
  });

  if (lc || lr) return <div className="p-8"><Skeleton className="h-96" /></div>;
  if (!child) return <div className="text-center py-12">Child not found</div>;

  const activePlans = riskPlans.filter(p => p.status !== 'Closed');
  const signedRecord = planTracking.find(p => p.plan_status === 'Signed' && p.parent_signature_url);
  const savedParentSig = signedRecord?.parent_signature_url || null;
  const savedParentName = signedRecord?.parent_signed_name || null;

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
    <div style={{ borderTop: '1px solid #d1d5db', marginTop: '8px', paddingTop: '3px', display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#6b7280' }}>
      <span>Medical action plan for: <strong>{childName}</strong></span>
      <span>Date implemented: {planImplementedDate}</span>
      <span>Review date: {planReviewDate}</span>
    </div>
  );

  const SigBlock = ({ label, name, sigUrl, onCapture, blank }) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: '8px', color: '#6b7280', marginBottom: '2px' }}>{label}</div>
      {sigUrl ? (
        <img src={sigUrl} alt="signature" style={{ height: '30px', width: '100%', objectFit: 'contain', objectPosition: 'left', borderBottom: '1px solid #111', marginBottom: '2px' }} />
      ) : onCapture ? (
        <>
          <div className="no-print"><SignaturePad label="" onSave={onCapture} /></div>
          <div className="hidden print:block" style={SIG_LINE}></div>
        </>
      ) : (
        <div style={SIG_LINE}></div>
      )}
      {blank ? (
        <div style={{ fontSize: '9px' }}>Name: _______________________</div>
      ) : (
        <div style={{ fontSize: '9px' }}>Name: <strong>{name || '___________________'}</strong></div>
      )}
    </div>
  );

  const printPlan = () => {
    const printContent = document.getElementById('print-content');
    const win = window.open('', '_blank', 'width=1100,height=800');
    win.document.write(`
      <!DOCTYPE html><html><head>
      <title>Risk Minimisation Plan – ${childName}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; background: white; color: #111; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-page { width: 100%; padding: 12px 16px; page-break-after: always; break-after: page; }
        .print-page:last-child { page-break-after: auto; break-after: auto; }
        .no-print { display: none !important; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
        th, td { border: 1px solid #6b7280; padding: 3px 5px; font-size: 9px; vertical-align: top; }
        th { background: #f3f4f6 !important; font-weight: bold; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        img { max-width: 100%; }
      </style>
      </head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div style={{ maxWidth: '1050px', margin: '0 auto' }}>
      <PrintStyles />

      {/* ── Screen toolbar ── */}
      <div className="no-print flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/children/${id}`)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Print Plan — {childName}</h1>
        <Button variant="outline" onClick={() => {
          navigator.clipboard.writeText(`${window.location.origin}/parent-acknowledgement?child=${id}`);
          toast.success('Parent link copied');
        }} className="gap-2">
          <Link2 className="w-4 h-4" /> Copy Parent Link
        </Button>
        <Button onClick={printPlan} className="gap-2">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </Button>
      </div>

      <div id="print-content">

      {/* ══════════════════════════════════════════════════════════
          PAGE 1 — RISK MINIMISATION PLAN + MEDICATION
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '12px' }}>
        <div className="no-print" style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '4px' }}>Page 1 — Risk Minimisation Plan &amp; Medication</div>

        {/* Title + meta */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div>
            <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 4px 0' }}>Risk Minimisation Plan</h1>
            <div style={{ fontSize: '9px', lineHeight: '1.6' }}>
              <span><strong>Centre:</strong> First Steps Before &amp; After School Care &nbsp;|&nbsp; </span>
              <span><strong>Child:</strong> {childName} &nbsp;|&nbsp; </span>
              <span><strong>DOB:</strong> {dob} &nbsp;|&nbsp; </span>
              <span><strong>Condition:</strong> {child.condition_type} &nbsp;|&nbsp; </span>
              <span><strong>Implemented:</strong> {planImplementedDate} &nbsp;|&nbsp; </span>
              <span><strong>Review:</strong> {planReviewDate}</span>
            </div>
          </div>
          {child.photo_url ? (
            <img src={child.photo_url} alt={childName} style={{ width: '56px', height: '56px', objectFit: 'cover', border: '1px solid #d1d5db', flexShrink: 0, marginLeft: '12px' }} />
          ) : (
            <div style={{ width: '56px', height: '56px', border: '1px solid #d1d5db', flexShrink: 0, marginLeft: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#9ca3af', textAlign: 'center' }}>Photo</div>
          )}
        </div>

        {/* Two-column layout: left = risk plan, right = medication */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* LEFT: Medical condition + contacts + risk table */}
          <div style={{ flex: '0 0 58%' }}>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '60%' }}>IDENTIFIED MEDICAL CONDITION</th>
                  <th style={TH}>Location of Medical Management / Action Plan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...TD, padding: '4px 5px' }}>{conditionDesc}</td>
                  <td style={TD}>{child.condition_type}</td>
                </tr>
              </tbody>
            </table>

            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '28%' }}>Emergency Contact</th>
                  <th style={{ ...TH, width: '22%' }}>Phone</th>
                  <th style={{ ...TH, width: '18%' }}>Relationship</th>
                  <th style={{ ...TH, width: '20%' }}>Child's Dr</th>
                  <th style={TH}>Dr Phone</th>
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

            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '18%' }}>Trigger</th>
                  <th style={{ ...TH, width: '20%' }}>Exposure Risk</th>
                  <th style={{ ...TH, width: '18%' }}>Reaction</th>
                  <th style={{ ...TH, width: '10%' }}>Risk</th>
                  <th style={TH}>Strategies to Minimise Risk</th>
                </tr>
              </thead>
              <tbody>
                {activePlans.length > 0 ? activePlans.map(plan => (
                  <tr key={plan.id}>
                    <td style={{ ...TD, padding: '4px 5px' }}>{plan.trigger || ''}</td>
                    <td style={TD}>{plan.exposure_risk || ''}</td>
                    <td style={TD}>{plan.reaction || ''}</td>
                    <td style={{ ...TD, fontWeight: 'bold', textAlign: 'center' }}>{plan.risk_level || ''}</td>
                    <td style={TD}>{plan.control_measures || ''}</td>
                  </tr>
                )) : (
                  <>
                    <tr>{[...Array(5)].map((_, i) => <td key={i} style={{ ...TD, height: '28px' }}></td>)}</tr>
                    <tr>{[...Array(5)].map((_, i) => <td key={i} style={{ ...TD, height: '28px' }}></td>)}</tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* RIGHT: Medication + Risk Matrix */}
          <div style={{ flex: 1 }}>
            <div style={SEC_HDR}>Medication Details</div>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '22%' }}>Medication</th>
                  <th style={{ ...TH, width: '16%' }}>Expiry</th>
                  <th style={{ ...TH, width: '20%' }}>Supplied by</th>
                  <th style={{ ...TH, width: '22%' }}>Location</th>
                  <th style={TH}>Checked by</th>
                </tr>
              </thead>
              <tbody>
                {activePlans.filter(p => p.medication_required).map(plan => (
                  <tr key={plan.id}>
                    <td style={{ ...TD, padding: '4px 5px' }}>{plan.medication_required}</td>
                    <td style={TD}>{plan.medication_expiry_date ? format(new Date(plan.medication_expiry_date), 'dd/MM/yy') : ''}</td>
                    <td style={TD}>{plan.medication_supplied_by || ''}{plan.medication_supplied_date ? ` ${format(new Date(plan.medication_supplied_date), 'dd/MM/yy')}` : ''}</td>
                    <td style={TD}>{plan.medication_location || ''}</td>
                    <td style={TD}></td>
                  </tr>
                ))}
                {[...Array(Math.max(2, 2 - activePlans.filter(p => p.medication_required).length))].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => <td key={j} style={{ ...TD, height: '22px' }}></td>)}</tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: '9px', marginBottom: '6px', fontStyle: 'italic' }}>Guardian Signature: ___________________________________</div>

            <div style={SEC_HDR}>Risk Benefit Analysis Matrix</div>
            <table style={{ ...TABLE, marginBottom: '3px' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '26%', fontSize: '8px' }}>LIKELIHOOD</th>
                  {['Insig.', 'Minor', 'Moder.', 'Major', 'Extreme'].map(h => (
                    <th key={h} style={{ ...TH, textAlign: 'center', fontSize: '8px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'RARE',          cells: ['LOW','LOW','LOW','MOD','HIGH'] },
                  { label: 'UNLIKELY',      cells: ['LOW','LOW','MOD','HIGH','HIGH'] },
                  { label: 'POSSIBLE',      cells: ['LOW','MOD','HIGH','HIGH','EXT'] },
                  { label: 'LIKELY',        cells: ['MOD','MOD','HIGH','EXT','EXT'] },
                  { label: 'ALMOST CERT.',  cells: ['MOD','HIGH','HIGH','EXT','EXT'] },
                ].map(row => (
                  <tr key={row.label}>
                    <td style={{ ...TD, fontWeight: 'bold', background: '#f9fafb', textAlign: 'center', fontSize: '8px' }}>{row.label}</td>
                    {row.cells.map((cell, i) => {
                      const full = cell === 'MOD' ? 'MODERATE' : cell === 'EXT' ? 'EXTREME' : cell;
                      return <td key={i} style={{ ...TDC, fontWeight: 'bold', fontSize: '8px', background: riskColor(full) }}>{cell}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Footer />
      </div>

      {/* ══════════════════════════════════════════════════════════
          PAGE 2 — COMMUNICATION PLAN + STAFF RECORD
      ══════════════════════════════════════════════════════════ */}
      <div className="print-page" style={{ ...PAGE, padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
        <div className="no-print" style={{ fontSize: '9px', color: '#9ca3af', marginBottom: '4px' }}>Page 2 — Communication Plan &amp; Staff Record</div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {/* LEFT: Communication Plan */}
          <div style={{ flex: '0 0 50%' }}>
            <h1 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 4px 0' }}>Communication Plan</h1>
            <div style={{ fontSize: '9px', lineHeight: '1.5', marginBottom: '5px' }}>
              <span><strong>Child:</strong> {childName} &nbsp;|&nbsp; </span>
              <span><strong>DOB:</strong> {dob} &nbsp;|&nbsp; </span>
              <span><strong>Condition:</strong> {child.condition_type}</span>
            </div>

            <div style={SEC_HDR}>Communication Plan Checklist</div>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '45%' }}>Centre Actions</th>
                  <th style={{ ...TH, width: '5%', textAlign: 'center' }}>✓</th>
                  <th style={{ ...TH, width: '45%' }}>Family Actions</th>
                  <th style={{ ...TH, width: '5%', textAlign: 'center' }}>✓</th>
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
                  ['Medication will be stored out of reach of children in a known location. Medication will be checked to ensure it meets policy requirements.',
                   'All medications required will be on premises at all times. Medication will be prescribed by a doctor, in date, and clearly labelled.'],
                  ['Nominated supervisor will communicate attendance patterns and any changes to educators.',
                   'Family will ensure changes of attendance and absences are notified to the centre.'],
                  ['The nominated supervisor will ensure all plans are reviewed annually or when changes are identified.',
                   'All plans will be reviewed annually or when changes are identified.'],
                ].map(([centre, family], i) => (
                  <tr key={i}>
                    <td style={{ ...TD, padding: '3px 5px' }}>{centre}</td>
                    <td style={TDC}></td>
                    <td style={{ ...TD, padding: '3px 5px' }}>{family}</td>
                    <td style={TDC}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={SEC_HDR}>Emergency Contacts</div>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '6%' }}>#</th>
                  <th style={{ ...TH, width: '36%' }}>Name</th>
                  <th style={{ ...TH, width: '28%' }}>Relationship</th>
                  <th style={TH}>Phone</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { n: '1.', name: child.parent_name || '', rel: 'Parent/Guardian', ph: child.parent_phone || '' },
                  { n: '2.', name: '', rel: '', ph: '' },
                  { n: '3.', name: '', rel: '', ph: '' },
                ].map((r, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, fontWeight: 'bold', padding: '4px 5px' }}>{r.n}</td>
                    <td style={{ ...TD, fontWeight: i === 0 ? 'bold' : 'normal' }}>{r.name}</td>
                    <td style={TD}>{r.rel}</td>
                    <td style={{ ...TD, fontWeight: i === 0 ? 'bold' : 'normal' }}>{r.ph}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ fontSize: '8.5px', margin: '5px 0', lineHeight: '1.5' }}>
              I <strong>(Nominated supervisor)</strong> have discussed this communication plan with <strong>{child.parent_name || '_______________'}</strong> at <strong>First Steps Before &amp; After School Care</strong>. I <strong>{child.parent_name || '_______________'}</strong> agree to the communication plan being implemented for my child <strong>{childName}</strong>. Review date: <strong>{planReviewDate}</strong>
            </p>

            <div style={{ display: 'flex', gap: '24px' }}>
              <SigBlock label="Nominated Supervisor" name="" onCapture={setStaffSig} sigUrl={staffSig} />
              <SigBlock label="Child's Guardian" name={savedParentName || child.parent_name} sigUrl={savedParentSig} />
            </div>
          </div>

          {/* RIGHT: Staff Communication Record + Amendments */}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', margin: '0 0 4px 0' }}>Staff Communication Record <span style={{ fontSize: '9px', fontWeight: 'normal', color: '#6b7280' }}>[Reg 90-1(c)(iv)]</span></h1>
            <div style={{ fontSize: '9px', marginBottom: '5px' }}><strong>Child:</strong> {childName}</div>

            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '22%' }}>Educator / Staff</th>
                  <th style={{ ...TH, width: '10%', textAlign: 'center', fontSize: '8px' }}>Medical Policy</th>
                  <th style={{ ...TH, width: '10%', textAlign: 'center', fontSize: '8px' }}>Condition Aware</th>
                  <th style={{ ...TH, width: '10%', textAlign: 'center', fontSize: '8px' }}>Med. Plan Location</th>
                  <th style={{ ...TH, width: '10%', textAlign: 'center', fontSize: '8px' }}>Risk Plan Location</th>
                  <th style={{ ...TH, width: '10%', textAlign: 'center', fontSize: '8px' }}>Medication Use</th>
                  <th style={{ ...TH, width: '28%', textAlign: 'center', fontSize: '8px' }}>Date / Signature</th>
                </tr>
              </thead>
              <tbody>
                {staffSignoffs.map(s => (
                  <tr key={s.id}>
                    <td style={{ ...TD, height: '18px' }}>
                      <div>{s.staff_name}</div>
                      {s.staff_role && <div style={{ fontSize: '8px', color: '#6b7280' }}>{s.staff_role}</div>}
                    </td>
                    <td style={{ ...TDC, color: s.check_medical_policy ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_medical_policy ? '✓' : '✗'}</td>
                    <td style={{ ...TDC, color: s.check_condition_aware ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_condition_aware ? '✓' : '✗'}</td>
                    <td style={{ ...TDC, color: s.check_med_plan_location ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_med_plan_location ? '✓' : '✗'}</td>
                    <td style={{ ...TDC, color: s.check_risk_plan_location ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_risk_plan_location ? '✓' : '✗'}</td>
                    <td style={{ ...TDC, color: s.check_medication_use ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>{s.check_medication_use ? '✓' : '✗'}</td>
                    <td style={TD}>
                      {s.signature_url && <img src={s.signature_url} alt="sig" style={{ height: '16px', maxWidth: '70px', objectFit: 'contain' }} />}
                      <div style={{ fontSize: '8px', color: '#6b7280' }}>{s.signed_date ? format(new Date(s.signed_date), 'dd/MM/yyyy') : ''}</div>
                    </td>
                  </tr>
                ))}
                {[...Array(Math.max(0, 8 - staffSignoffs.length))].map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...TD, height: '18px' }}></td>
                    <td style={TDC}></td><td style={TDC}></td><td style={TDC}></td>
                    <td style={TDC}></td><td style={TDC}></td><td style={TD}></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p style={{ fontSize: '8.5px', margin: '5px 0', lineHeight: '1.5' }}>
              I <strong>(Nominated supervisor)</strong> have discussed this risk minimisation and communication plan with <strong>{child.parent_name || '_______________'}</strong> at <strong>First Steps Before &amp; After School Care</strong>. Review date: <strong>{planReviewDate}</strong>
            </p>
            <div style={{ display: 'flex', gap: '24px', marginBottom: '8px' }}>
              <SigBlock label="Nominated Supervisor" name="" onCapture={setStaffSig} sigUrl={staffSig} />
              <SigBlock label="Child's Guardian" name={savedParentName || child.parent_name} sigUrl={savedParentSig} />
            </div>

            <div style={SEC_HDR}>Record of Updates / Amendments</div>
            <table style={TABLE}>
              <thead>
                <tr>
                  <th style={{ ...TH, width: '15%', background: '#fee2e2', color: '#991b1b' }}>Date</th>
                  <th style={{ ...TH, width: '40%', background: '#fee2e2', color: '#991b1b' }}>Changes Made</th>
                  <th style={{ ...TH, background: '#fee2e2', color: '#991b1b' }}>Supervisor</th>
                  <th style={{ ...TH, background: '#fee2e2', color: '#991b1b' }}>Guardian</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <tr key={i}>{[...Array(4)].map((_, j) => <td key={j} style={{ ...TD, height: '20px' }}></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Footer />
      </div>

      </div>
    </div>
  );
}