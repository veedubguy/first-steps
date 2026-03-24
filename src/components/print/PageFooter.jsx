export default function PageFooter({ childName, implementedDate, reviewDate }) {
  return (
    <div style={{ borderTop: '1px solid #d1d5db', marginTop: '8px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#6b7280' }}>
      <span>Medical action plan for: <strong>{childName}</strong></span>
      <span>Date of plan implemented: {implementedDate}</span>
      <span>Date for plan to be reviewed: {reviewDate}</span>
    </div>
  );
}