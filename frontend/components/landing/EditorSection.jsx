'use client';

export default function EditorSection({ onShowToast }) {
  return (
    <section className="editor-section animate-in" id="editor">
      <div className="section-header">
        <div className="section-badge">⌨️ Write &amp; Run</div>
        <h2 className="section-title">In-Browser <span style={{background:'linear-gradient(90deg,var(--neon-cyan),var(--neon-violet))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>Editor</span></h2>
      </div>
      <div className="editor-preview">
        <div className="editor-titlebar">
          <div className="editor-dots">
            <div className="dot dot-red"></div>
            <div className="dot dot-amber"></div>
            <div className="dot dot-green"></div>
          </div>
          <span className="editor-title">problem_42.py — KodeChirp Editor</span>
          <div className="editor-tabs">
            <div className="editor-tab active">solution.py</div>
            <div className="editor-tab">test_cases.py</div>
            <div className="editor-tab">console</div>
          </div>
        </div>
        <div className="editor-body">
          <div className="problem-pane">
            <div className="problem-header">
              <span className="problem-number">#42</span>
              <span className="problem-difficulty diff-hard">Hard</span>
              <span style={{fontSize:'12px',color:'var(--neon-gold)',marginLeft:'4px'}}>💰 1250 pts</span>
            </div>
            <div className="problem-pane-title">Trapping Rain Water</div>
            <p className="problem-desc">
              Given <code style={{fontFamily:'var(--font-code)',color:'var(--neon-cyan)',background:'rgba(0,212,255,0.1)',padding:'1px 5px',borderRadius:'4px'}}>n</code> non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.
            </p>
            <div className="problem-example">
              <strong style={{color:'var(--text-secondary)'}}>Example:</strong><br />
              {"Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]"}<br />
              Output: 6<br /><br />
              <strong style={{color:'var(--text-secondary)'}}>Constraints:</strong><br />
              {"n == height.length"}<br />
              {"1 ≤ n ≤ 2 × 10⁴"}<br />
              {"0 ≤ height[i] ≤ 10⁵"}
            </div>
          </div>
          <div className="code-pane">
            <div className="code-lang-bar">
              <select className="lang-select" defaultValue="Python 3">
                <option>Python 3</option>
                <option>JavaScript</option>
                <option>Java</option>
                <option>C++</option>
                <option>Go</option>
              </select>
              <span style={{flex:'1'}}></span>
              <span style={{fontSize:'11px',color:'var(--text-muted)'}}>AI Hint available</span>
              <span style={{fontSize:'14px',marginLeft:'8px',cursor:'pointer'}} title="Get AI Hint">🤖</span>
            </div>
            <div className="code-editor">
              <div className="code-line"><span className="line-num">1</span><span className="line-code"><span className="kw">from</span> <span className="var">typing</span> <span className="kw">import</span> <span className="var">List</span></span></div>
              <div className="code-line"><span className="line-num">2</span><span className="line-code"></span></div>
              <div className="code-line"><span className="line-num">3</span><span className="line-code"><span className="kw">class</span> <span className="fn">Solution</span><span className="op">:</span></span></div>
              <div className="code-line"><span className="line-num">4</span><span className="line-code">  <span className="kw">def</span> <span className="fn">trap</span><span className="op">(</span><span className="var">self</span><span className="op">,</span> <span className="var">height</span><span className="op">:</span> <span className="var">List</span><span className="op">[</span><span className="var">int</span><span className="op">])</span> <span className="op">{'->'}</span> <span className="var">int</span><span className="op">:</span></span></div>
              <div className="code-line"><span className="line-num">5</span><span className="line-code">    <span className="cmt"># Two-pointer approach: O(n) time, O(1) space</span></span></div>
              <div className="code-line"><span className="line-num">6</span><span className="line-code">    <span className="var">left</span><span className="op">,</span> <span className="var">right</span> <span className="op">=</span> <span className="num">0</span><span className="op">,</span> <span className="fn">len</span><span className="op">(</span><span className="var">height</span><span className="op">)</span> <span className="op">-</span> <span className="num">1</span></span></div>
              <div className="code-line"><span className="line-num">7</span><span className="line-code">    <span className="var">max_left</span><span className="op">,</span> <span className="var">max_right</span> <span className="op">=</span> <span className="num">0</span><span className="op">,</span> <span className="num">0</span></span></div>
              <div className="code-line"><span className="line-num">8</span><span className="line-code">    <span className="var">water</span> <span className="op">=</span> <span className="num">0</span></span></div>
              <div className="code-line"><span className="line-num">9</span><span className="line-code"></span></div>
              <div className="code-line"><span className="line-num">10</span><span className="line-code">    <span className="kw">while</span> <span className="var">left</span> <span className="op">{'<'}</span> <span className="var">right</span><span className="op">:</span></span></div>
              <div className="code-line"><span className="line-num">11</span><span className="line-code">      <span className="kw">if</span> <span className="var">height</span><span className="op">[</span><span className="var">left</span><span className="op">] {'<'}</span> <span className="var">height</span><span className="op">[</span><span className="var">right</span><span className="op">]:</span></span></div>
              <div className="code-line"><span className="line-num">12</span><span className="line-code">        <span className="var">max_left</span> <span className="op">=</span> <span className="fn">max</span><span className="op">(</span><span className="var">max_left</span><span className="op">,</span> <span className="var">height</span><span className="op">[</span><span className="var">left</span><span className="op">])</span></span></div>
              <div className="code-line"><span className="line-num">13</span><span className="line-code">        <span className="var">water</span> <span className="op">+=</span> <span className="var">max_left</span> <span className="op">-</span> <span className="var">height</span><span className="op">[</span><span className="var">left</span><span className="op">]</span></span></div>
              <div className="code-line"><span className="line-num">14</span><span className="line-code">        <span className="var">left</span> <span className="op">+=</span> <span className="num">1</span></span></div>
              <div className="code-line"><span className="line-num">15</span><span className="line-code">      <span className="kw">else</span><span className="op">:</span></span></div>
              <div className="code-line"><span className="line-num">16</span><span className="line-code">        <span className="var">max_right</span> <span className="op">=</span> <span className="fn">max</span><span className="op">(</span><span className="var">max_right</span><span className="op">,</span> <span className="var">height</span><span className="op">[</span><span className="var">right</span><span className="op">])</span></span></div>
              <div className="code-line"><span className="line-num">17</span><span className="line-code">        <span className="var">water</span> <span className="op">+=</span> <span className="var">max_right</span> <span className="op">-</span> <span className="var">height</span><span className="op">[</span><span className="var">right</span><span className="op">]</span></span></div>
              <div className="code-line"><span className="line-num">18</span><span className="line-code">        <span className="var">right</span> <span className="op">-=</span> <span className="num">1</span></span></div>
              <div className="code-line"><span className="line-num">19</span><span className="line-code">    <span className="kw">return</span> <span className="var">water</span></span></div>
            </div>
            <div className="code-toolbar">
              <button className="code-btn code-btn-run" onClick={() => onShowToast('▶ Running test cases…','All 3 sample cases passed!','✅')}>▶ Run</button>
              <button className="code-btn code-btn-submit" onClick={() => onShowToast('🎉 Accepted!','Runtime: 48ms  |  Memory: 16.2MB','🏆')}>Submit</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
