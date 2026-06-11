'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../../lib/adminApi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

function formatReviewStatus(status) {
  return (status || 'imported').replace(/_/g, ' ');
}

function ConfidenceMeter({ value }) {
  const pct = Math.round((value || 0) * 100);
  const level = pct >= 70 ? 'high' : pct >= 40 ? 'medium' : 'low';
  return (
    <div className="confidence-meter">
      <div className="confidence-bar" style={{ maxWidth: '200px' }}>
        <div className={`confidence-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`confidence-value ${level}`}>{pct}%</span>
    </div>
  );
}

export default function ProblemReview() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState('');
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [editDescription, setEditDescription] = useState('');
  const [editExamples, setEditExamples] = useState('');
  const [editConstraints, setEditConstraints] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    fetchProblem();
  }, [id]);

  const fetchProblem = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getProblem(id);
      setProblem(res.data);
      // Initialize edit fields
      setEditDescription(res.data.description_md || '');
      setEditExamples(JSON.stringify(res.data.examples_json || [], null, 2));
      setEditConstraints(JSON.stringify(res.data.constraints_json || [], null, 2));
      setEditNotes(JSON.stringify(res.data.notes_json || [], null, 2));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParse = async () => {
    setProcessing('parsing');
    try {
      await adminApi.parseProblem(id);
      await fetchProblem();
    } catch (err) {
      alert('Parse failed: ' + err.message);
    } finally {
      setProcessing('');
    }
  };

  const handleNormalize = async () => {
    setProcessing('normalizing');
    try {
      await adminApi.normalizeProblem(id);
      await fetchProblem();
    } catch (err) {
      alert('Normalize failed: ' + err.message);
    } finally {
      setProcessing('');
    }
  };

  const handleApprove = async () => {
    setProcessing('approving');
    try {
      const data = {};
      if (editMode) {
        data.description_md = editDescription;
        try { data.examples = JSON.parse(editExamples); } catch {}
        try { data.constraints = JSON.parse(editConstraints); } catch {}
        try { data.notes = JSON.parse(editNotes); } catch {}
      }
      await adminApi.approveParsing(id, data);
      await fetchProblem();
      setEditMode(false);
    } catch (err) {
      alert('Approve failed: ' + err.message);
    } finally {
      setProcessing('');
    }
  };

  const handleMarkReady = async () => {
    setProcessing('marking');
    try {
      await adminApi.updateReviewStatus(id, 'ready_for_publication');
      await fetchProblem();
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setProcessing('');
    }
  };

  if (error) return <div style={{ color: '#f85149', padding: '40px' }}>Error: {error}</div>;
  if (loading) return <div className="admin-loading"><div className="admin-spinner"></div>Loading problem...</div>;
  if (!problem) return <div style={{ color: '#f85149', padding: '40px' }}>Problem not found</div>;

  const flags = problem.ai_quality_flags;
  const examples = problem.examples_json || [];
  const constraints = problem.constraints_json || [];
  const generatedConstraints = problem.generated_constraints || [];
  const notes = problem.notes_json || [];

  return (
    <div>
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Link href="/admin/normalize" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '13px' }}>
              ← Back to Queue
            </Link>
          </div>
          <h1 className="admin-page-title">{problem.title}</h1>
          <p className="admin-page-subtitle">
            <span className={`admin-badge badge-${problem.difficulty?.toLowerCase()}`} style={{ marginRight: '8px' }}>{problem.difficulty}</span>
            <span className={`admin-badge badge-${problem.review_status || 'imported'}`}>
              {formatReviewStatus(problem.review_status)}
            </span>
            {problem.source && (
              <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '12px' }}>Source: {problem.source}</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!editMode && (
            <button className="admin-btn admin-btn-ghost" onClick={() => setEditMode(true)}>✏️ Edit</button>
          )}
          {editMode && (
            <button className="admin-btn admin-btn-ghost" onClick={() => setEditMode(false)}>Cancel Edit</button>
          )}
        </div>
      </div>

      {/* Confidence & Quality */}
      <div className="admin-grid-2" style={{ marginBottom: '20px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title">📊 Parser Confidence</div>
          {problem.parser_confidence != null ? (
            <ConfidenceMeter value={problem.parser_confidence} />
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not yet parsed</span>
          )}
        </div>
        <div className="admin-section-card">
          <div className="admin-section-title">🏷️ AI Quality Flags</div>
          {flags ? (
            <div className="quality-flags">
              {Object.entries(flags).map(([key, val]) => (
                <span key={key} className={`quality-flag ${val ? 'flag-warn' : 'flag-ok'}`}>
                  {val ? '⚠' : '✓'} {key.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No AI analysis yet</span>
          )}
        </div>
      </div>

      {/* Split Pane: Raw vs Parsed */}
      <div className="norm-split-pane">
        {/* Raw Statement */}
        <div className="norm-pane">
          <div className="norm-pane-header">
            <span>📄 Raw Statement (Source of Truth)</span>
          </div>
          <div className="norm-pane-body">
            <pre>{problem.raw_statement || problem.description || 'No raw statement available'}</pre>
          </div>
        </div>

        {/* Parsed Description */}
        <div className="norm-pane">
          <div className="norm-pane-header">
            <span>✨ Parsed Description</span>
          </div>
          <div className="norm-pane-body">
            {editMode ? (
              <textarea
                className="admin-textarea"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                style={{ minHeight: '300px', width: '100%' }}
              />
            ) : (
              <pre>{problem.description_md || 'Not yet parsed'}</pre>
            )}
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="admin-section-card" style={{ marginBottom: '20px' }}>
        <div className="admin-section-title">📋 Examples ({examples.length})</div>
        {editMode ? (
          <textarea
            className="admin-textarea"
            value={editExamples}
            onChange={e => setEditExamples(e.target.value)}
            style={{ minHeight: '200px' }}
            placeholder='[{"input": "...", "output": "...", "explanation": "..."}]'
          />
        ) : examples.length > 0 ? (
          examples.map((ex, i) => (
            <div key={i} className="norm-example-card">
              <div className="norm-example-header">Example {i + 1}</div>
              <div className="norm-example-field">
                <div className="norm-example-label">Input</div>
                <div className="norm-example-value">{ex.input || '—'}</div>
              </div>
              <div className="norm-example-field">
                <div className="norm-example-label">Output</div>
                <div className="norm-example-value">{ex.output || '—'}</div>
              </div>
              {ex.explanation && (
                <div className="norm-example-field">
                  <div className="norm-example-label">Explanation</div>
                  <div className="norm-example-value">{ex.explanation}</div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="admin-empty" style={{ padding: '20px' }}>
            <div className="admin-empty-text">No examples extracted yet</div>
          </div>
        )}
      </div>

      {/* Constraints */}
      <div className="admin-grid-2" style={{ marginBottom: '20px' }}>
        <div className="admin-section-card">
          <div className="admin-section-title">🔒 Parsed Constraints ({constraints.length})</div>
          {editMode ? (
            <textarea
              className="admin-textarea"
              value={editConstraints}
              onChange={e => setEditConstraints(e.target.value)}
              style={{ minHeight: '120px' }}
              placeholder='["1 <= n <= 100", "-10^9 <= x <= 10^9"]'
            />
          ) : constraints.length > 0 ? (
            <ul className="norm-constraint-list">
              {constraints.map((c, i) => (
                <li key={i} className="norm-constraint-item">
                  <span className="norm-constraint-dot source-parsed"></span>
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
              No constraints found
            </div>
          )}
        </div>

        <div className="admin-section-card">
          <div className="admin-section-title">
            🤖 AI Generated Constraints ({generatedConstraints.length})
            {problem.constraint_source === 'ai_generated' && (
              <span className="admin-badge" style={{ marginLeft: '8px', background: 'rgba(168,85,247,0.15)', color: '#c084fc', fontSize: '9px' }}>
                AI Generated
              </span>
            )}
          </div>
          {generatedConstraints.length > 0 ? (
            <ul className="norm-constraint-list">
              {generatedConstraints.map((c, i) => (
                <li key={i} className="norm-constraint-item">
                  <span className="norm-constraint-dot source-ai"></span>
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>
              No AI-generated constraints
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {notes.length > 0 && (
        <div className="admin-section-card" style={{ marginBottom: '20px' }}>
          <div className="admin-section-title">📝 Notes</div>
          {editMode ? (
            <textarea
              className="admin-textarea"
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              style={{ minHeight: '80px' }}
            />
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {notes.map((n, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '4px' }}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="norm-action-bar">
        <div className="norm-action-bar-title">
          {processing ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="admin-spinner" style={{ width: '14px', height: '14px' }}></span>
              {processing === 'parsing' && 'Running parser...'}
              {processing === 'normalizing' && 'Running AI normalization...'}
              {processing === 'approving' && 'Approving...'}
              {processing === 'marking' && 'Updating status...'}
            </span>
          ) : (
            'Actions'
          )}
        </div>

        <button
          className="admin-btn admin-btn-primary admin-btn-sm"
          onClick={handleParse}
          disabled={!!processing}
        >
          🔬 {problem.description_md ? 'Re-parse' : 'Parse'}
        </button>

        <button
          className="admin-btn admin-btn-warning admin-btn-sm"
          onClick={handleNormalize}
          disabled={!!processing}
        >
          🤖 AI Normalize
        </button>

        {(['parsed', 'ai_normalized', 'review_required'].includes(problem.review_status)) && (
          <button
            className="admin-btn admin-btn-success admin-btn-sm"
            onClick={handleApprove}
            disabled={!!processing}
          >
            ✓ {editMode ? 'Save & Approve' : 'Approve Parsing'}
          </button>
        )}

        {problem.review_status === 'approved' && (
          <button
            className="admin-btn admin-btn-sm"
            onClick={handleMarkReady}
            disabled={!!processing}
            style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff', borderColor: 'rgba(0,212,255,0.3)' }}
          >
            🚀 Mark Ready for Publication
          </button>
        )}

        <Link
          href={`/admin/problems/${id}/edit`}
          className="admin-btn admin-btn-ghost admin-btn-sm"
        >
          Full Editor
        </Link>
      </div>
    </div>
  );
}
