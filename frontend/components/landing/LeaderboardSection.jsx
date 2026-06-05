'use client';
import { useEffect, useState } from 'react';

export default function LeaderboardSection() {
  const [activeFilter, setActiveFilter] = useState('Global');
  const leaderboard = [
    { rank: 1, trophy: '🥇', name: 'alexkode_', pts: '12,480', avatar: '#a78bfa', badges: ['Top 1%', 'Streak 90'] },
    { rank: 2, trophy: '🥈', name: 'bytestrike', pts: '11,920', avatar: '#60a5fa', badges: ['Top 5%'] },
    { rank: 3, trophy: '🥉', name: 'devzen_io', pts: '10,755', avatar: '#34d399', badges: ['Contest 1st'] },
    { rank: 4, trophy: null, name: 'NullPtr_x', pts: '9,440', avatar: '#f472b6', badges: [] },
    { rank: 5, trophy: null, name: 'r3cursion', pts: '8,910', avatar: '#fb923c', badges: ['Rising Star'] },
  ];

  const [contestTime, setContestTime] = useState(6127);
  useEffect(() => {
    const t = setInterval(() => setContestTime(s => s > 0 ? s - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(contestTime / 3600);
  const m = Math.floor((contestTime % 3600) / 60);
  const sc = contestTime % 60;
  const timerStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sc).padStart(2,'0')}`;

  return (
    <section className="leaderboard-section animate-in" id="leaderboard">
      <div className="section-header">
        <div className="section-badge">🏆 Competition</div>
        <h2 className="section-title">Global <span style={{background:'linear-gradient(90deg,var(--neon-gold),#f97316)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Leaderboard</span></h2>
        <p className="section-subtitle">Compete with developers worldwide and climb the ranks.</p>
      </div>
      <div className="leaderboard-grid">
        <div className="leaderboard-card">
          <div className="lb-header">
            <div className="lb-title">Top Coders</div>
            <div className="lb-filter">
              {['Global','Weekly','Friends'].map(f => (
                <button key={f} className={`lb-filter-btn${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div>
            {leaderboard.map(d => {
              const rankClass = d.rank <= 3 ? `rank-${d.rank}` : 'rank-other';
              return (
                <div className="lb-row" key={d.rank}>
                  <div className={`lb-rank ${rankClass}`}>{d.trophy ? <span className="lb-trophy">{d.trophy}</span> : d.rank}</div>
                  <div className="lb-avatar" style={{background:`linear-gradient(135deg,${d.avatar}55,${d.avatar}22)`}}>{d.name[0].toUpperCase()}</div>
                  <div className="lb-user-info">
                    <div className="lb-username">{d.name}</div>
                    <div className="lb-badges">{d.badges.map(b => <span className="lb-badge" key={b}>{b}</span>)}</div>
                  </div>
                  <div className="lb-score">{d.pts}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="leaderboard-card">
          <div className="lb-header">
            <div className="lb-title">🔴 Live Contest</div>
            <span style={{fontSize:'12px',color:'#f87171',animation:'dotPulse 1.5s infinite'}}>● LIVE</span>
          </div>
          <div style={{textAlign:'center',padding:'20px 0'}}>
            <div style={{fontSize:'48px',fontFamily:'var(--font-code)',fontWeight:'800',background:'linear-gradient(135deg,var(--neon-cyan),var(--neon-violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',marginBottom:'8px'}}>{timerStr}</div>
            <div style={{fontSize:'14px',color:'var(--text-muted)',marginBottom:'24px'}}>Time remaining in contest</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-glass)',borderRadius:'var(--radius-md)',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'700',color:'var(--neon-blue)',fontFamily:'var(--font-display)'}}>2,847</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>Participants</div>
              </div>
              <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid var(--border-glass)',borderRadius:'var(--radius-md)',padding:'16px',textAlign:'center'}}>
                <div style={{fontSize:'24px',fontWeight:'700',color:'var(--neon-violet)',fontFamily:'var(--font-display)'}}>4</div>
                <div style={{fontSize:'12px',color:'var(--text-muted)',marginTop:'4px'}}>Problems</div>
              </div>
            </div>
            <div style={{marginBottom:'16px'}}>
              <div style={{fontSize:'13px',color:'var(--text-muted)',marginBottom:'8px',textAlign:'left'}}>Your current rank</div>
              <div style={{background:'rgba(168,85,247,0.1)',border:'1px solid rgba(168,85,247,0.25)',borderRadius:'var(--radius-md)',padding:'12px',display:'flex',alignItems:'center',gap:'12px'}}>
                <span style={{fontSize:'22px',fontFamily:'var(--font-display)',fontWeight:'800',color:'var(--neon-violet)'}}>#347</span>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'600',color:'var(--text-primary)'}}>DemoUser</div>
                  <div style={{fontSize:'12px',color:'var(--text-muted)'}}>2 problems solved • 840 pts</div>
                </div>
                <span style={{marginLeft:'auto',fontSize:'11px',color:'#4ade80',background:'rgba(74,222,128,0.1)',border:'1px solid rgba(74,222,128,0.2)',padding:'2px 8px',borderRadius:'var(--radius-2xl)'}}>↑ 23</span>
              </div>
            </div>
            <a href="#" className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>{"View Contest Problems →"}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
