'use client';
import { useEffect } from 'react';

export default function ProblemsSection() {
  useEffect(() => {
    const grid = document.getElementById('streakGrid');
    if (grid && grid.childElementCount === 0) {
      const today = 49;
      const active = [32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48];
      for (let i = 0; i < 56; i++) {
        const d = document.createElement('div');
        d.className = 'streak-day';
        if (i === today) d.classList.add('today');
        else if (active.includes(i)) d.classList.add('active');
        grid.appendChild(d);
      }
    }
  }, []);

  const problems = [
    { solved: true, name: 'Two Sum', tags: ['Array','Hash Map'], diff: 'Easy', acc: '49.2%' },
    { solved: true, name: 'Longest Substring Without Repeating', tags: ['String','Sliding Window'], diff: 'Medium', acc: '33.8%' },
    { solved: false, name: 'Median of Two Sorted Arrays', tags: ['Binary Search','Divide & Conquer'], diff: 'Hard', acc: '36.1%' },
    { attempted: true, name: 'Coin Change', tags: ['DP','BFS'], diff: 'Medium', acc: '41.7%' },
    { solved: false, name: 'Trapping Rain Water', tags: ['Two Pointers','Stack'], diff: 'Hard', acc: '56.4%' },
    { solved: true, name: 'Valid Parentheses', tags: ['Stack','String'], diff: 'Easy', acc: '40.5%' },
    { solved: false, name: 'Word Break', tags: ['DP','Trie'], diff: 'Medium', acc: '43.9%' },
    { solved: false, name: 'LRU Cache', tags: ['Design','Linked List','Hash Map'], diff: 'Medium', acc: '42.3%' },
  ];

  return (
    <section className="problems-section" id="questions">
      <div className="section-header animate-in">
        <div className="section-badge">⚡ Challenge Yourself</div>
        <h2 className="section-title">Curated <span style={{background:'linear-gradient(90deg,var(--neon-blue),var(--neon-cyan))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Problems</span></h2>
        <p className="section-subtitle">Battle-tested challenges across algorithms, data structures, and system design.</p>
      </div>
      <div className="problems-container">
        <div className="problems-list animate-in">
          {problems.map((p, i) => (
            <div className="problem-row" key={i}>
              <div className={`problem-status${p.solved ? ' solved' : p.attempted ? ' attempted' : ''}`}>{p.solved ? '✓' : ''}</div>
              <div className="problem-title-col">
                <div className="problem-name">{p.name}</div>
                <div className="problem-tags">{p.tags.map(t => <span className="problem-tag" key={t}>{t}</span>)}</div>
              </div>
              <span className={`problem-difficulty diff-${p.diff.toLowerCase()}`}>{p.diff}</span>
              <span className="problem-acceptance">{p.acc}</span>
            </div>
          ))}
        </div>
        <div className="problems-sidebar animate-in" style={{transitionDelay:'0.15s'}}>
          <div className="sidebar-card">
            <div className="sidebar-card-title">Your Progress</div>
            <div className="progress-item">
              <div className="progress-label"><span style={{color:'#4ade80'}}>Easy</span><span style={{color:'#4ade80'}}>42 / 120</span></div>
              <div className="progress-bar"><div className="progress-fill pf-easy" style={{width:'35%'}}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span style={{color:'var(--neon-gold)'}}>Medium</span><span style={{color:'var(--neon-gold)'}}>18 / 340</span></div>
              <div className="progress-bar"><div className="progress-fill pf-medium" style={{width:'5.3%'}}></div></div>
            </div>
            <div className="progress-item">
              <div className="progress-label"><span style={{color:'#f87171'}}>Hard</span><span style={{color:'#f87171'}}>3 / 180</span></div>
              <div className="progress-bar"><div className="progress-fill pf-hard" style={{width:'1.7%'}}></div></div>
            </div>
          </div>
          <div className="sidebar-card">
            <div className="sidebar-card-title">Activity Streak 🔥 14 days</div>
            <div className="streak-grid" id="streakGrid"></div>
          </div>
          <div className="sidebar-card">
            <div className="sidebar-card-title">Daily Challenge</div>
            <div style={{fontSize:'13px',color:'var(--text-secondary)',marginBottom:'12px',lineHeight:'1.6'}}>
              Minimum Window Substring — <span style={{color:'#f87171',fontWeight:'600'}}>Hard</span>
            </div>
            <a href="#" className="btn btn-primary" style={{width:'100%',justifyContent:'center',fontSize:'13px',padding:'10px'}}>
              {"Attempt Today's Challenge 🎯"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
