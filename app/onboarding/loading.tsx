const shimmer = { background: '#f2f0ed', animation: 'om-shimmer 1.4s ease-in-out infinite' } as const;

export default function OnboardingLoading() {
  return (
    <main data-screen-label="Loading workspace setup" data-surface-id="workspace-onboarding" data-state-id="onboarding-loading" aria-busy="true" aria-label="Loading workspace setup" style={{ height: 860, minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#1c1f23' }}>
      <header style={{ height: 50, flex: '0 0 50px', borderBottom: '1px solid #eae8e5', background: '#ffffff' }} />
      <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 920, margin: '0 auto', padding: '28px 32px 34px' }}>
        <div style={{ width: 126, height: 10, borderRadius: 5, ...shimmer }} />
        <div style={{ width: 196, height: 26, borderRadius: 8, marginTop: 9, ...shimmer }} />
        <div style={{ width: '62%', height: 13, borderRadius: 6, marginTop: 10, ...shimmer }} />
        <div style={{ display: 'grid', gridTemplateColumns: '184px minmax(0,1fr)', gap: 20, marginTop: 22 }}>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}><div style={{ width: 82, height: 11, borderRadius: 5, ...shimmer }} />{Array.from({ length: 4 }, (_, index) => <div key={index} style={{ height: 42, borderRadius: 9, background: index === 0 ? '#f2f0ed' : '#f4f3f1', animation: 'om-shimmer 1.4s ease-in-out infinite' }} />)}</aside>
          <section style={{ minHeight: 520, borderRadius: 11, padding: 24, background: '#ffffff', boxShadow: '0 1px 2px rgba(28,27,25,.06),0 0 0 1px rgba(28,27,25,.05)' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, ...shimmer }} /><div style={{ width: 186, height: 18, borderRadius: 7, marginTop: 16, ...shimmer }} /><div style={{ width: '74%', height: 12, borderRadius: 6, marginTop: 10, ...shimmer }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 30 }}>{Array.from({ length: 6 }, (_, index) => <div key={index}><div style={{ width: 96, height: 10, borderRadius: 5, ...shimmer }} /><div style={{ height: 38, borderRadius: 9, marginTop: 7, ...shimmer }} /></div>)}</div>
          </section>
        </div>
      </div>
    </main>
  );
}
