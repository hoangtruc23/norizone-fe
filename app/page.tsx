import React from 'react';
import Link from 'next/link';

export default function NoriZonePage() {
  return (
    <div className="relative w-full min-h-screen text-white overflow-x-hidden font-sans">
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .nori-root {
          font-family: 'Space Grotesk', sans-serif;
        }

        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .bg-animated {
          background: linear-gradient(-45deg, #1a3bd4, #d63891, #0ea5c9, #be185d);
          background-size: 300% 300%;
          animation: gradientShift 10s ease infinite;
        }

        @keyframes floatA {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50%       { transform: translateY(-22px) rotate(4deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(-8px) rotate(6deg); }
          50%       { transform: translateY(18px) rotate(-6deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); }
          50%       { transform: translateY(-14px) rotate(12deg) scale(1.08); }
        }
        .float-a { animation: floatA 5s ease-in-out infinite; }
        .float-b { animation: floatB 6.5s ease-in-out infinite; }
        .float-c { animation: floatC 4.2s ease-in-out infinite; }

        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.25); }
          50%       { transform: scaleY(1); }
        }
        .eq-bar { transform-origin: bottom; border-radius: 2px; }
        .eq-bar:nth-child(1) { animation: waveBar 0.9s ease-in-out infinite 0.0s; }
        .eq-bar:nth-child(2) { animation: waveBar 0.9s ease-in-out infinite 0.3s; }
        .eq-bar:nth-child(3) { animation: waveBar 0.9s ease-in-out infinite 0.15s; }
        .eq-bar:nth-child(4) { animation: waveBar 0.9s ease-in-out infinite 0.45s; }
        .eq-bar:nth-child(5) { animation: waveBar 0.9s ease-in-out infinite 0.05s; }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .pill-white  { background: rgba(255,255,255,0.95); color: #111; }
        .pill-yellow { background: #facc15; color: #111; }
        .pill-cyan   { background: #22d3ee; color: #0a2f35; }

        .card {
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 28px;
        }

        .cta-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 16px 36px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          background: #facc15;
          color: #111;
          border: none;
          box-shadow: 0 8px 32px rgba(250,204,21,0.4);
        }
        .cta-btn:hover  { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(250,204,21,0.5); }
        .cta-btn:active { transform: scale(0.97); }

        .ghost-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 28px;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          background: rgba(255,255,255,0.12);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
        }
        .ghost-btn:hover  { background: rgba(255,255,255,0.2); transform: translateY(-2px); }

        .stat-chip {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
        }
        .stat-num  { font-size: 28px; font-weight: 700; line-height: 1; }
        .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; }

        .divider { width: 1px; background: rgba(255,255,255,0.2); align-self: stretch; }

        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .big-title  { font-size: clamp(96px, 30vw, 160px) !important; }
          .stats-row  { flex-wrap: wrap; gap: 24px !important; }
        }
      `}} />

      {/* Animated background */}
      <div className="bg-animated" style={{ position: 'fixed', inset: 0, zIndex: 0 }} />

      {/* Glow orbs */}
      <div style={{
        position: 'fixed', top: '15%', left: '25%',
        width: '45vw', height: '45vw', maxWidth: 500, maxHeight: 500,
        background: 'rgba(250,204,21,0.18)', borderRadius: '50%',
        filter: 'blur(80px)', zIndex: 1, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'fixed', bottom: '10%', right: '15%',
        width: '35vw', height: '35vw', maxWidth: 380, maxHeight: 380,
        background: 'rgba(34,211,238,0.2)', borderRadius: '50%',
        filter: 'blur(90px)', zIndex: 1, pointerEvents: 'none'
      }} />

      {/* Floating icons */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
        {/* Mic */}
        <div className="float-a" style={{ position: 'absolute', top: '20%', left: '7%', opacity: 0.7 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </div>
        {/* Gamepad */}
        <div className="float-b" style={{ position: 'absolute', top: '12%', right: '8%', opacity: 0.65 }}>
          <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="6" y1="12" x2="10" y2="12" />
            <line x1="8" y1="10" x2="8" y2="14" />
            <line x1="15" y1="13" x2="15.01" y2="13" />
            <line x1="18" y1="11" x2="18.01" y2="11" />
            <rect width="20" height="12" x="2" y="6" rx="3" />
          </svg>
        </div>
        {/* Switch */}
        <div className="float-c" style={{ position: 'absolute', bottom: '25%', left: '38%', opacity: 0.55 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
            <circle cx="5" cy="10" r="1" fill="white" />
            <path d="M15 6h2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3Z" />
            <circle cx="15" cy="14" r="1" fill="white" />
          </svg>
        </div>
        {/* Equalizer bars */}
        <div style={{
          position: 'absolute', right: '5%', top: '45%',
          display: 'flex', alignItems: 'flex-end', gap: '5px', height: '64px', opacity: 0.5
        }}>
          {[40, 64, 48, 64, 36].map((h, i) => (
            <div key={i} className="eq-bar" style={{
              width: 8, height: h,
              background: i % 2 === 0 ? 'white' : '#facc15',
            }} />
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="nori-root" style={{
        position: 'relative', zIndex: 10,
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        padding: '28px 32px 40px',
        maxWidth: 1200, margin: '0 auto',
      }}>

        {/* Nav */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: 20, marginBottom: 0,
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>
            NORI ZONE
          </div>
          <nav style={{ display: 'flex', gap: 28, fontSize: 13, fontWeight: 500, opacity: 0.85, letterSpacing: '0.04em' }}>
            <span style={{ cursor: 'pointer' }}>Dịch vụ</span>
            <span style={{ cursor: 'pointer' }}>Bảng giá</span>
            <span style={{ cursor: 'pointer' }}>Liên hệ</span>
          </nav>
        </header>

        {/* Hero */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 32 }}>

          {/* Pills row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
            <span className="pill pill-cyan">🎤 Music Box </span>
            <span className="pill pill-yellow">🕹️ Nintendo Switch</span>
            <span className="pill pill-white">🎮 Food & Drink </span>
          </div>

          {/* Grid */}
          <div className="hero-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 48,
            alignItems: 'flex-end',
          }}>

            {/* Left: big title + tagline */}
            <div>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <h1 className="big-title" style={{
                  fontSize: 'clamp(120px, 18vw, 200px)',
                  fontWeight: 700,
                  lineHeight: 0.85,
                  letterSpacing: '-0.04em',
                  color: '#fff',
                  textShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}>
                  NORI
                </h1>
                <div style={{
                  position: 'absolute', top: 8, right: -20,
                  background: '#facc15', color: '#111',
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  textTransform: 'uppercase', padding: '5px 12px',
                  borderRadius: 999, transform: 'rotate(-10deg)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}>
                  Đặt phòng điii ✓
                </div>
              </div>

              <p style={{
                fontSize: 'clamp(14px, 1.6vw, 18px)',
                lineHeight: 1.65,
                color: 'rgba(255,255,255,0.85)',
                maxWidth: 480,
                marginTop: 24, marginBottom: 36,
                fontWeight: 400,
              }}>
                Không gian giải trí cho gen Z. Phòng Music Box cách âm chuẩn,
                kho game Nintendo Switch siêu chất, đồ ăn vặt ngon, giá sinh viên.
                Rủ cả nhóm là chiến thôi.
              </p>

              {/* CTA buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <Link href="/booking">
                  <button className="cta-btn">
                    Đặt phòng ngay
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </Link>
                <button className="ghost-btn">
                  Xem bảng giá
                </button>
              </div>
            </div>

            {/* Right: info card */}
            <div className="card" style={{ padding: '36px 32px' }}>

              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 8 }}>
                  Tại sao chọn NoriZone?
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                  Đập tan lo âu, căng thẳng
                </h2>
              </div>

              {/* Feature list */}
              {[
                { icon: '🎤', title: 'Music Box riêng tư', desc: 'Phòng cách âm, màn hình rõ nét, micro chuyên nghiệp' },
                { icon: '🎮', title: 'Nintendo Switch', desc: 'Kho game đồ sộ, đổi game thoải mái' },
                { icon: '🍟', title: 'Đồ ăn & nước uống ngon ngon', desc: 'Nước và đồ ăn vặt giá học sinh, sinh viên' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{
                  display: 'flex', gap: 14, marginBottom: 20,
                  paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>{desc}</div>
                  </div>
                </div>
              ))}

              {/* Stats */}
              <div className="stats-row" style={{
                display: 'flex', gap: 20, marginTop: 4, alignItems: 'center',
              }}>
                <div className="stat-chip">
                  <span className="stat-num">Giá hát chỉ từ: 39k/h</span>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer strip */}
        <footer style={{
          marginTop: 48,
          paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.12)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 12, opacity: 0.45, flexWrap: 'wrap', gap: 8,
        }}>
          <span>© 2025 NoriZone</span>
          <span>📍 Đức Trọng - Lâm Đồng</span>
        </footer>
      </div>
    </div>
  );
}