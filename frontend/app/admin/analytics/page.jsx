'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../lib/adminApi';
import { 
  BarChart3, 
  Target, 
  CheckSquare, 
  TrendingUp, 
  Calendar, 
  Flame, 
  CheckCircle2, 
  Users,
  GraduationCap,
  Award,
  Building2,
  Trophy,
} from 'lucide-react';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.getAnalytics()
      .then(res => { setData(res.data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <div className="admin-loading"><div className="admin-spinner"></div>Loading analytics...</div>;
  if (error || !data) return <div style={{ color: 'var(--kc-error, #f85149)', padding: '40px' }}>Failed to load analytics: {error || 'No data available'}</div>;

  // ── College Admin Institutional Analytics ──────────────────────────────────
  if (data.isCollegeAdmin) {
    const org = data.organization || {};
    const totalDeptStudents = (data.departmentBreakdown || []).reduce((a, b) => a + (b.count || 0), 0) || 1;
    const totalYearStudents = (data.academicYearBreakdown || []).reduce((a, b) => a + (b.count || 0), 0) || 1;
    const totalStatusStudents = (data.statusBreakdown || []).reduce((a, b) => a + (b.count || 0), 0) || 1;
    const maxDaily = Math.max(...(data.recentAttemptsTrend || []).map(d => d.count), 1);

    return (
      <div className="space-y-6">
        <div className="admin-page-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Building2 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="admin-page-title">{org.name || 'Institution'} Analytics</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                  {org.code || org.slug || 'INSTITUTION'}
                </span>
              </div>
              <p className="admin-page-subtitle">
                Student roster demographics, assessment pass rates, and academic performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Row 1: Depts, Years, and Status Demographics */}
        <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
          {/* Department Distribution */}
          <div className="admin-section-card">
            <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={15} style={{ color: 'var(--kc-accent)' }} /> Enrollment by Department
            </div>
            {(!data.departmentBreakdown || data.departmentBreakdown.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No department data</div></div>
            ) : (
              data.departmentBreakdown.map((d, i) => {
                const pct = (d.count / totalDeptStudents) * 100;
                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                const color = colors[i % colors.length];
                return (
                  <div key={d.department || i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{d.department}</span>
                      <span style={{ color, fontWeight: 600 }}>{d.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Academic Year Cohorts */}
          <div className="admin-section-card">
            <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} style={{ color: '#10b981' }} /> Academic Year Cohorts
            </div>
            {(!data.academicYearBreakdown || data.academicYearBreakdown.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No academic year data</div></div>
            ) : (
              data.academicYearBreakdown.map((y, i) => {
                const pct = (y.count / totalYearStudents) * 100;
                return (
                  <div key={y.academic_year || i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{y.academic_year}</span>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>{y.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#10b981', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Enrollment Status */}
          <div className="admin-section-card">
            <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={15} style={{ color: '#f59e0b' }} /> Enrollment Status
            </div>
            {(!data.statusBreakdown || data.statusBreakdown.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No status data</div></div>
            ) : (
              data.statusBreakdown.map((s, i) => {
                const pct = (s.count / totalStatusStudents) * 100;
                const color = s.enrollment_status === 'active' ? '#10b981' :
                              s.enrollment_status === 'graduated' ? '#3b82f6' : '#f59e0b';
                return (
                  <div key={s.enrollment_status || i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{s.enrollment_status}</span>
                      <span style={{ color, fontWeight: 600 }}>{s.count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Row 2: Assessment Performance & Daily Attempts */}
        <div className="admin-grid-2" style={{ marginBottom: '24px' }}>
          {/* Assessment Performance */}
          <div className="admin-section-card">
            <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={15} style={{ color: 'var(--kc-accent)' }} /> Campus Assessment Performance
            </div>
            {(!data.assessmentPerformance || data.assessmentPerformance.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No assessment attempts recorded yet</div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.assessmentPerformance.map((a, i) => {
                  const passRate = a.completed_attempts > 0 ? ((a.passed_count / a.completed_attempts) * 100).toFixed(0) : 0;
                  return (
                    <div key={a.id || i} style={{
                      padding: '10px 12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{a.title}</span>
                        <span className={`admin-badge ${a.status === 'Published' ? 'badge-published' : 'badge-draft'}`} style={{ fontSize: '10px' }}>
                          {a.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Attempts: <strong style={{ color: 'var(--text-primary)' }}>{a.total_attempts}</strong></span>
                        <span>Completed: <strong style={{ color: 'var(--text-primary)' }}>{a.completed_attempts}</strong></span>
                        <span>Pass Rate: <strong style={{ color: '#10b981' }}>{passRate}%</strong></span>
                        <span>Avg Score: <strong style={{ color: 'var(--kc-accent)' }}>{a.avg_score}%</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Attempts Trend */}
          <div className="admin-section-card">
            <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} style={{ color: '#10b981' }} /> Student Attempts (30 days)
            </div>
            {(!data.recentAttemptsTrend || data.recentAttemptsTrend.length === 0) ? (
              <div className="admin-empty"><div className="admin-empty-text">No attempt activity in past 30 days</div></div>
            ) : (
              <div className="admin-bar-chart">
                {data.recentAttemptsTrend.map((d, i) => (
                  <div key={i} className="admin-bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} title={`${d.date}: ${d.count} attempts`}>
                    {i % 5 === 0 && <span className="admin-bar-label">{new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Top Performing Students */}
        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={15} style={{ color: '#fbbf24' }} /> Top Performing Campus Students
          </div>
          {(!data.topStudents || data.topStudents.length === 0) ? (
            <div className="admin-empty"><div className="admin-empty-text">No student assessments completed yet</div></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Department</th>
                    <th>Tests Taken</th>
                    <th>Average Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topStudents.map((st, i) => (
                    <tr key={st.student_id_number || i}>
                      <td style={{ fontWeight: 700, color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#b45309' : 'var(--text-muted)' }}>
                        #{i + 1}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.student_name}</td>
                      <td style={{ fontSize: '12px', fontFamily: 'var(--kc-font-code)', color: 'var(--text-muted)' }}>
                        {st.student_id_number}
                      </td>
                      <td style={{ fontSize: '12px' }}>{st.department || '—'}</td>
                      <td style={{ fontSize: '12px' }}>{st.tests_taken}</td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{st.avg_score}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Super Admin Platform Analytics ─────────────────────────────────────────
  const diffMap = {};
  (data.problemsByDifficulty || []).forEach(d => { diffMap[d.difficulty] = d.count; });
  const totalProblems = Object.values(diffMap).reduce((a, b) => a + b, 0) || 1;

  const maxDaily = Math.max(...(data.dailySubmissions || []).map(d => d.count), 1);
  const maxWeekly = Math.max(...(data.weeklySubmissions || []).map(d => d.count), 1);

  const statusMap = {};
  (data.submissionsByStatus || []).forEach(s => { statusMap[s.status] = s.count; });
  const totalStatusSubs = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Platform Analytics</h1>
          <p className="admin-page-subtitle">Global platform insights and trends</p>
        </div>
      </div>

      {/* Row 1: Difficulty + Acceptance by Difficulty + Submission Status */}
      <div className="admin-grid-3" style={{ marginBottom: '24px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={15} style={{ color: 'var(--kc-accent)' }} /> Problems by Difficulty
          </div>
          {['Easy', 'Medium', 'Hard'].map(d => {
            const count = diffMap[d] || 0;
            const pct = (count / totalProblems) * 100;
            const color = d === 'Easy' ? '#4ade80' : d === 'Medium' ? '#fbbf24' : '#f87171';
            return (
              <div key={d} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d}</span>
                  <span style={{ color, fontWeight: 600 }}>{count} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={15} style={{ color: 'var(--kc-accent)' }} /> Acceptance by Difficulty
          </div>
          {(data.acceptanceByDifficulty || []).map(d => {
            const color = d.difficulty === 'Easy' ? '#4ade80' : d.difficulty === 'Medium' ? '#fbbf24' : '#f87171';
            return (
              <div key={d.difficulty} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{d.difficulty}</span>
                  <span style={{ color, fontWeight: 600 }}>{d.rate}%</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>{d.accepted} accepted / {d.total} total</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckSquare size={15} style={{ color: 'var(--kc-accent)' }} /> Submission Status
          </div>
          {Object.entries(statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
            const pct = (count / totalStatusSubs) * 100;
            const color = status === 'Accepted' ? '#4ade80' : status === 'Wrong Answer' ? '#f87171' :
              status === 'Time Limit Exceeded' ? '#fbbf24' : '#fb923c';
            return (
              <div key={status} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                  <span style={{ color, fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2: Daily Submissions Chart */}
      <div className="admin-grid-2" style={{ marginBottom: '24px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={15} style={{ color: 'var(--kc-accent)' }} /> Daily Submissions (30 days)
          </div>
          {(data.dailySubmissions || []).length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No submission data</div></div>
          ) : (
            <div className="admin-bar-chart">
              {(data.dailySubmissions || []).map((d, i) => (
                <div key={i} className="admin-bar" style={{ height: `${(d.count / maxDaily) * 100}%` }} title={`${d.date}: ${d.count} submissions`}>
                  {i % 5 === 0 && <span className="admin-bar-label">{new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={15} style={{ color: 'var(--kc-accent)' }} /> Weekly Submissions (12 weeks)
          </div>
          {(data.weeklySubmissions || []).length === 0 ? (
            <div className="admin-empty"><div className="admin-empty-text">No submission data</div></div>
          ) : (
            <div className="admin-bar-chart">
              {(data.weeklySubmissions || []).map((d, i) => (
                <div key={i} className="admin-bar" style={{ height: `${(d.count / maxWeekly) * 100}%`, background: 'rgba(59, 130, 246, 0.45)' }}
                  title={`Week of ${d.week}: ${d.count} submissions`}>
                  <span className="admin-bar-label">{new Date(d.week).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Most Attempted + Most Solved + Most Active Users */}
      <div className="admin-grid-3">
        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={15} style={{ color: '#f87171' }} /> Most Attempted
          </div>
          {(data.mostAttempted || []).map((p, i) => (
            <div key={p.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span className={`admin-badge badge-${p.difficulty?.toLowerCase()}`} style={{ fontSize: '10px' }}>{p.difficulty}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>{p.attempts}</span>
            </div>
          ))}
          {(data.mostAttempted || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: '#4ade80' }} /> Most Solved
          </div>
          {(data.mostSolved || []).map((p, i) => (
            <div key={p.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
              <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>{p.solved}</span>
            </div>
          ))}
          {(data.mostSolved || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={15} style={{ color: 'var(--kc-accent)' }} /> Most Active Users
          </div>
          {(data.mostActiveUsers || []).map((u, i) => (
            <div key={u.id} className="admin-activity-item">
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', width: '20px' }}>#{i + 1}</span>
              <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px' }}>{u.username}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{u.total_submissions} subs</span>
              <span style={{ color: '#4ade80', fontSize: '11px' }}>{u.accepted} acc</span>
            </div>
          ))}
          {(data.mostActiveUsers || []).length === 0 && <div className="admin-empty"><div className="admin-empty-text">No data</div></div>}
        </div>
      </div>
    </div>
  );
}
