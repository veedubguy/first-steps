export default function PageHeader({ title }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1d4ed8', margin: 0 }}>{title}</h1>
      <div style={{ width: '60px', height: '60px', border: '1px solid #d1d5db', flexShrink: 0 }} />
    </div>
  );
}