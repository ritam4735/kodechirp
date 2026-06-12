'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../../../lib/adminApi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import SignatureBuilder from '../../components/SignatureBuilder';
import { JUDGE_MODES } from '../../../../../lib/typeSystem';

export default function EditProblem() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [validation, setValidation] = useState(null);

  // Reference solution state
  const [refSolution, setRefSolution] = useState(null);
  const [refLanguage, setRefLanguage] = useState('cpp');
  const [refCode, setRefCode] = useState('');
  const [refSaving, setRefSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);

  // Test generation state
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  useEffect(() => {
    Promise.all([
      adminApi.getProblem(id),
      adminApi.validateProblem(id).catch(() => null),
      adminApi.getReferenceSolution(id).catch(() => ({ data: null })),
    ]).then(([probRes, valRes, refRes]) => {
      const p = probRes.data;
      setForm({
        title: p.title || '',
        description: p.description || '',
        difficulty: p.difficulty || 'Medium',
        input_format: p.input_format || '',
        output_format: p.output_format || '',
        constraints: p.constraints || '',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
        time_limit_ms: p.time_limit_ms || 2000,
        memory_limit_mb: p.memory_limit_mb || 256,
        source: p.source || 'kodechirp',
        status: p.status,
        slug: p.slug || '',
        judge_mode: p.judge_mode || JUDGE_MODES.STDIN_STDOUT,
        signature_metadata: p.signature_metadata || { name: '', params: [], returnType: 'Void' },
      });
      if (valRes) setValidation(valRes);
      if (refRes.data) {
        setRefSolution(refRes.data);
        setRefLanguage(refRes.data.language);
        setRefCode(refRes.data.source_code);
        if (refRes.data.verification_result) {
          setVerifyResult(refRes.data.verification_result);
        }
      }
      setLoading(false);
    }).catch(err => {
      alert('Failed to load: ' + err.message);
      router.push('/admin/problems');
    });
  }, [id, router]);

  if (loading || !form) {
    return <div className="admin-loading"><div className="admin-spinner"></div>Loading problem...</div>;
  }

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async (publish = null) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      };
      if (publish !== null) payload.status = publish ? 'Published' : 'Draft';
      await adminApi.updateProblem(id, payload);
      // Re-validate after save
      const valRes = await adminApi.validateProblem(id).catch(() => null);
      if (valRes) setValidation(valRes);
      if (publish !== null) {
        setForm(f => ({ ...f, status: publish ? 'Published' : 'Draft' }));
      }
      alert('Saved successfully');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRefSolution = async () => {
    if (!refCode.trim()) return alert('Source code is required');
    setRefSaving(true);
    try {
      const result = await adminApi.upsertReferenceSolution(id, {
        language: refLanguage,
        source_code: refCode,
      });
      setRefSolution(result.data);
      setVerifyResult(null); // Reset verification on code change
      // Re-validate problem
      const valRes = await adminApi.validateProblem(id).catch(() => null);
      if (valRes) setValidation(valRes);
      alert('Reference solution saved');
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setRefSaving(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await adminApi.verifyReferenceSolution(id);
      setVerifyResult(result.data);
      // Refresh solution to get updated status
      const refRes = await adminApi.getReferenceSolution(id).catch(() => ({ data: null }));
      if (refRes.data) setRefSolution(refRes.data);
      // Re-validate
      const valRes = await adminApi.validateProblem(id).catch(() => null);
      if (valRes) setValidation(valRes);
    } catch (err) {
      alert('Verification failed: ' + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteRef = async () => {
    if (!confirm('Delete the reference solution?')) return;
    try {
      await adminApi.deleteReferenceSolution(id);
      setRefSolution(null);
      setRefCode('');
      setVerifyResult(null);
      const valRes = await adminApi.validateProblem(id).catch(() => null);
      if (valRes) setValidation(valRes);
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleGenerateTests = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await adminApi.generateTests(id, {
        visible_count: 10,
        hidden_count: 50,
      });
      setGenResult(result.data);
    } catch (err) {
      alert('Test generation failed: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const canPublish = validation?.valid === true;
  const refStatus = refSolution?.compile_status;
  const isVerified = refStatus === 'verified';

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Edit Problem</h1>
          <p className="admin-page-subtitle">
            {form.slug}
            <span className={`admin-badge ${form.status === 'Published' ? 'badge-published' : 'badge-draft'}`} style={{ marginLeft: '8px' }}>
              {form.status}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => router.push('/admin/problems')}>Back</button>
          <Link href={`/admin/problems/${id}/test-cases`} className="admin-btn admin-btn-ghost">Manage Tests</Link>
          <button className="admin-btn admin-btn-ghost" onClick={() => handleSave(null)} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
          {form.status === 'Published' ? (
            <button className="admin-btn admin-btn-danger" onClick={() => handleSave(false)} disabled={saving}>Unpublish</button>
          ) : (
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => handleSave(true)}
              disabled={saving || !canPublish}
              title={canPublish ? 'Publish this problem' : 'Fix validation errors before publishing'}
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Publish Validation Status */}
      {validation && !validation.valid && form.status !== 'Published' && (
        <div style={{
          background: 'rgba(248,81,73,0.08)',
          border: '1px solid rgba(248,81,73,0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
        }}>
          <div style={{ color: '#f85149', fontWeight: 600, marginBottom: '6px' }}>⚠️ Cannot Publish — Fix the following:</div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            {validation.errors.map((err, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {validation && validation.valid && form.status !== 'Published' && (
        <div style={{
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#4ade80',
        }}>
          ✅ This problem is ready to be published.
        </div>
      )}

      <div className="admin-grid-2">
        <div>
          <div className="admin-form-group">
            <label className="admin-form-label">Title</label>
            <input className="admin-input" value={form.title} onChange={e => updateField('title', e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Slug</label>
            <input className="admin-input" value={form.slug} onChange={e => updateField('slug', e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Description (Markdown)</label>
            <textarea className="admin-textarea" style={{ minHeight: '300px' }} value={form.description} onChange={e => updateField('description', e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Constraints</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} value={form.constraints} onChange={e => updateField('constraints', e.target.value)} />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Judge Mode</label>
            <select className="admin-select" style={{ width: '100%' }} value={form.judge_mode} onChange={e => updateField('judge_mode', e.target.value)}>
              {Object.values(JUDGE_MODES).map(mode => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Select FUNCTION for modern DSA problems, STDIN_STDOUT for competitive programming.</p>
          </div>

          {(form.judge_mode === JUDGE_MODES.FUNCTION || form.judge_mode === JUDGE_MODES.CLASS) && (
            <SignatureBuilder 
              signature={form.signature_metadata} 
              onChange={(sig) => updateField('signature_metadata', sig)} 
            />
          )}
        </div>
        <div>
          <div className="admin-grid-2">
            <div className="admin-form-group">
              <label className="admin-form-label">Difficulty</label>
              <select className="admin-select" style={{ width: '100%' }} value={form.difficulty} onChange={e => updateField('difficulty', e.target.value)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Status</label>
              <select className="admin-select" style={{ width: '100%' }} value={form.status} onChange={e => updateField('status', e.target.value)}>
                <option value="Draft">Draft</option>
                <option value="Review">Review</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Tags (comma-separated)</label>
            <input className="admin-input" value={form.tags} onChange={e => updateField('tags', e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Source</label>
            <input className="admin-input" value={form.source} onChange={e => updateField('source', e.target.value)} />
          </div>
          <div className="admin-grid-2">
            <div className="admin-form-group">
              <label className="admin-form-label">Time Limit (ms)</label>
              <input className="admin-input" type="number" value={form.time_limit_ms} onChange={e => updateField('time_limit_ms', parseInt(e.target.value) || 2000)} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Memory Limit (MB)</label>
              <input className="admin-input" type="number" value={form.memory_limit_mb} onChange={e => updateField('memory_limit_mb', parseInt(e.target.value) || 256)} />
            </div>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Input Format</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} value={form.input_format} onChange={e => updateField('input_format', e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Output Format</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} value={form.output_format} onChange={e => updateField('output_format', e.target.value)} />
          </div>
        </div>
      </div>

      {/* ── Reference Solution Section ──────────────────────────────────── */}
      <div className="admin-section-card" style={{ marginTop: '28px' }}>
        <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🔑 Reference Solution</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {refSolution && (
              <span className={`admin-badge ${isVerified ? 'badge-published' : refStatus === 'compile_error' || refStatus === 'example_failed' ? 'badge-draft' : 'badge-queued'}`} style={{ fontSize: '10px' }}>
                {isVerified ? '✓ Verified' : refStatus === 'compile_error' ? '✗ Compile Error' : refStatus === 'example_failed' ? '✗ Example Failed' : '◌ Pending'}
              </span>
            )}
          </div>
        </div>

        {!refSolution && (
          <div style={{
            background: 'rgba(251,191,36,0.08)',
            border: '1px solid rgba(251,191,36,0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#fbbf24',
          }}>
            ⚠️ A reference solution is required to publish this problem and to generate tests.
          </div>
        )}

        <div className="admin-grid-2" style={{ marginBottom: '12px' }}>
          <div className="admin-form-group" style={{ marginBottom: 0 }}>
            <label className="admin-form-label">Language</label>
            <select
              className="admin-select"
              style={{ width: '100%' }}
              value={refLanguage}
              onChange={e => setRefLanguage(e.target.value)}
            >
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
            <button
              className="admin-btn admin-btn-primary admin-btn-sm"
              onClick={handleSaveRefSolution}
              disabled={refSaving}
            >
              {refSaving ? 'Saving...' : refSolution ? 'Update Solution' : 'Save Solution'}
            </button>
            {refSolution && (
              <>
                <button
                  className="admin-btn admin-btn-success admin-btn-sm"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? '⏳ Verifying...' : '🔬 Verify'}
                </button>
                <button
                  className="admin-btn admin-btn-danger admin-btn-sm"
                  onClick={handleDeleteRef}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        <div className="admin-form-group" style={{ marginBottom: 0 }}>
          <label className="admin-form-label">Source Code</label>
          <textarea
            className="admin-textarea"
            style={{ minHeight: '280px', fontFamily: 'var(--font-code, monospace)', fontSize: '13px', lineHeight: '1.5' }}
            value={refCode}
            onChange={e => setRefCode(e.target.value)}
            placeholder={`// Paste your ${refLanguage} reference solution here...`}
          />
        </div>

        {/* Verification Results */}
        {verifyResult && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Verification Results
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
              <span className={`quality-flag ${verifyResult.compileOk ? 'flag-ok' : 'flag-error'}`}>
                {verifyResult.compileOk ? '✓' : '✗'} Compilation
              </span>
              <span className={`quality-flag ${verifyResult.examplesOk ? 'flag-ok' : 'flag-error'}`}>
                {verifyResult.examplesOk ? '✓' : '✗'} Examples
              </span>
            </div>

            {verifyResult.errors && verifyResult.errors.length > 0 && (
              <div style={{ fontSize: '12px', color: '#f87171', marginBottom: '8px' }}>
                {verifyResult.errors.map((e, i) => <div key={i}>• {e}</div>)}
              </div>
            )}

            {verifyResult.exampleResults && verifyResult.exampleResults.length > 0 && (
              <div className="admin-table-wrap" style={{ marginTop: '8px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Test</th>
                      <th>Input</th>
                      <th>Expected</th>
                      <th>Actual</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifyResult.exampleResults.map((r, i) => (
                      <tr key={i}>
                        <td>#{i + 1}</td>
                        <td><code style={{ fontSize: '11px' }}>{r.input}</code></td>
                        <td><code style={{ fontSize: '11px' }}>{r.expected}</code></td>
                        <td><code style={{ fontSize: '11px' }}>{r.actual ?? '—'}</code></td>
                        <td>
                          <span className={`admin-badge ${r.passed ? 'badge-accepted' : 'badge-wrong'}`}>
                            {r.passed ? 'Pass' : r.timedOut ? 'TLE' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Test Generation Section ─────────────────────────────────────── */}
      <div className="admin-section-card" style={{ marginTop: '20px' }}>
        <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🧪 Automated Test Generation</span>
        </div>

        {!isVerified ? (
          <div style={{
            background: 'rgba(139,148,158,0.08)',
            border: '1px solid rgba(139,148,158,0.2)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#8b949e',
          }}>
            A verified reference solution is required before generating tests. Save and verify a reference solution above.
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              Generate 10 visible + 50 hidden test cases using AI-generated inputs and your verified reference solution.
              Tests are categorized by type (edge cases, random, adversarial).
            </p>
            <button
              className="admin-btn admin-btn-primary"
              onClick={handleGenerateTests}
              disabled={generating}
            >
              {generating ? '⏳ Generating Tests...' : '🚀 Generate Tests'}
            </button>

            {genResult && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                  Generation Report
                </div>

                {/* Summary stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'Generated', value: genResult.summary.totalGenerated, color: '#4d9fff' },
                    { label: 'Valid', value: genResult.summary.totalValid, color: '#fbbf24' },
                    { label: 'Visible Saved', value: genResult.summary.visibleSaved, color: '#4ade80' },
                    { label: 'Hidden Saved', value: genResult.summary.hiddenSaved, color: '#f59e0b' },
                    { label: 'Failures', value: genResult.summary.failures, color: '#f87171' },
                  ].map(s => (
                    <div key={s.label} className="admin-section-card" style={{ padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Coverage flags */}
                {genResult.quality && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Coverage</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {Object.entries(genResult.quality.coverageFlags).map(([key, val]) => (
                        <span key={key} className={`quality-flag ${val ? 'flag-ok' : 'flag-warn'}`}>
                          {val ? '✓' : '✗'} {key.replace('has', '').replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      ))}
                    </div>
                    {genResult.quality.allOutputsIdentical && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#fbbf24' }}>
                        ⚠️ All outputs are identical — this may indicate a problem with test diversity.
                      </div>
                    )}
                  </div>
                )}

                {/* Category distribution */}
                {genResult.quality?.categoryDistribution && (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Category Distribution</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {Object.entries(genResult.quality.categoryDistribution).map(([cat, count]) => (
                        <span key={cat} className="admin-tag">{cat}: {count}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
