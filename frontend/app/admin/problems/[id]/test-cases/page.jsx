'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../../../lib/adminApi';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TestCaseManager() {
  const { id: problemId } = useParams();
  const router = useRouter();
  const [testCases, setTestCases] = useState([]);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newTC, setNewTC] = useState({ input: '', expected_output: '', is_sample: false, explanation: '', order_index: 0 });
  const [bulkJson, setBulkJson] = useState('');

  useEffect(() => {
    Promise.all([
      adminApi.getProblem(problemId),
      adminApi.getTestCases(problemId),
    ]).then(([probRes, tcRes]) => {
      setProblem(probRes.data);
      setTestCases(tcRes.data);
      setLoading(false);
    }).catch(err => {
      alert('Failed to load: ' + err.message);
      router.push('/admin/problems');
    });
  }, [problemId, router]);

  const refresh = async () => {
    const res = await adminApi.getTestCases(problemId);
    setTestCases(res.data);
  };

  const handleAdd = async () => {
    if (!newTC.input.trim() || !newTC.expected_output.trim()) {
      alert('Input and expected output are required');
      return;
    }
    try {
      await adminApi.createTestCase(problemId, { ...newTC, order_index: testCases.length });
      setNewTC({ input: '', expected_output: '', is_sample: false, explanation: '', order_index: 0 });
      setShowAdd(false);
      refresh();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
      await adminApi.bulkImportTestCases(problemId, parsed);
      setBulkJson('');
      setShowBulk(false);
      refresh();
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };

  const handleDelete = async (tcId) => {
    if (!confirm('Delete this test case?')) return;
    try {
      await adminApi.deleteTestCase(tcId);
      refresh();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleUpdate = async (tcId, updates) => {
    try {
      await adminApi.updateTestCase(tcId, updates);
      setEditingId(null);
      refresh();
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="admin-loading"><div className="admin-spinner"></div>Loading test cases...</div>;
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Test Cases</h1>
          <p className="admin-page-subtitle">
            {problem?.title} · {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`/admin/problems/${problemId}/edit`} className="admin-btn admin-btn-ghost">← Back to Problem</Link>
          <button className="admin-btn admin-btn-ghost" onClick={() => setShowBulk(!showBulk)}>Bulk Import</button>
          <button className="admin-btn admin-btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Test Case</button>
        </div>
      </div>

      {/* Bulk Import */}
      {showBulk && (
        <div className="admin-section-card" style={{ marginBottom: '20px' }}>
          <div className="admin-section-title">📦 Bulk Import Test Cases</div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Paste a JSON array: [{`{ "input": "...", "expected_output": "...", "is_sample": false }`}]
          </p>
          <textarea className="admin-textarea" style={{ minHeight: '120px' }} value={bulkJson} onChange={e => setBulkJson(e.target.value)} placeholder='[{"input": "1 2", "expected_output": "3", "is_sample": true}]' />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button className="admin-btn admin-btn-primary" onClick={handleBulkImport}>Import</button>
            <button className="admin-btn admin-btn-ghost" onClick={() => setShowBulk(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="admin-section-card" style={{ marginBottom: '20px' }}>
          <div className="admin-section-title">➕ New Test Case</div>
          <div className="admin-grid-2">
            <div className="admin-form-group">
              <label className="admin-form-label">Input *</label>
              <textarea className="admin-textarea" style={{ minHeight: '80px', fontFamily: 'var(--font-code)' }} value={newTC.input} onChange={e => setNewTC(tc => ({ ...tc, input: e.target.value }))} />
            </div>
            <div className="admin-form-group">
              <label className="admin-form-label">Expected Output *</label>
              <textarea className="admin-textarea" style={{ minHeight: '80px', fontFamily: 'var(--font-code)' }} value={newTC.expected_output} onChange={e => setNewTC(tc => ({ ...tc, expected_output: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input type="checkbox" className="admin-checkbox" checked={newTC.is_sample} onChange={e => setNewTC(tc => ({ ...tc, is_sample: e.target.checked }))} />
              Public (visible to users)
            </label>
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Explanation (optional)</label>
            <input className="admin-input" value={newTC.explanation} onChange={e => setNewTC(tc => ({ ...tc, explanation: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="admin-btn admin-btn-primary" onClick={handleAdd}>Add Test Case</button>
            <button className="admin-btn admin-btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Test Cases Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>Input</th>
              <th>Expected Output</th>
              <th>Visibility</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {testCases.length === 0 ? (
              <tr><td colSpan="5"><div className="admin-empty"><div className="admin-empty-icon">📋</div><div className="admin-empty-text">No test cases yet</div></div></td></tr>
            ) : testCases.map((tc, idx) => (
              <TestCaseRow
                key={tc.id}
                tc={tc}
                idx={idx}
                isEditing={editingId === tc.id}
                onEdit={() => setEditingId(tc.id)}
                onCancel={() => setEditingId(null)}
                onSave={(updates) => handleUpdate(tc.id, updates)}
                onDelete={() => handleDelete(tc.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TestCaseRow({ tc, idx, isEditing, onEdit, onCancel, onSave, onDelete }) {
  const [editData, setEditData] = useState({ input: tc.input, expected_output: tc.expected_output, is_sample: tc.is_sample });

  if (isEditing) {
    return (
      <tr>
        <td>{idx + 1}</td>
        <td><textarea className="admin-textarea" style={{ minHeight: '60px', fontSize: '12px' }} value={editData.input} onChange={e => setEditData(d => ({ ...d, input: e.target.value }))} /></td>
        <td><textarea className="admin-textarea" style={{ minHeight: '60px', fontSize: '12px' }} value={editData.expected_output} onChange={e => setEditData(d => ({ ...d, expected_output: e.target.value }))} /></td>
        <td>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <input type="checkbox" className="admin-checkbox" checked={editData.is_sample} onChange={e => setEditData(d => ({ ...d, is_sample: e.target.checked }))} />
            Public
          </label>
        </td>
        <td>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="admin-btn admin-btn-success admin-btn-sm" onClick={() => onSave(editData)}>Save</button>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onCancel}>Cancel</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{idx + 1}</td>
      <td><code style={{ fontSize: '11px', whiteSpace: 'pre-wrap', maxWidth: '250px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc.input?.substring(0, 100)}{tc.input?.length > 100 ? '...' : ''}</code></td>
      <td><code style={{ fontSize: '11px', whiteSpace: 'pre-wrap', maxWidth: '250px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tc.expected_output?.substring(0, 100)}{tc.expected_output?.length > 100 ? '...' : ''}</code></td>
      <td>
        <span className={`admin-badge ${tc.is_sample ? 'badge-published' : 'badge-draft'}`}>
          {tc.is_sample ? 'Public' : 'Hidden'}
        </span>
      </td>
      <td>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onEdit}>Edit</button>
          <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={onDelete}>Del</button>
        </div>
      </td>
    </tr>
  );
}
