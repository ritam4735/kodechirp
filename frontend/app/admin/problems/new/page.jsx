'use client';

import { useState, useRef, useEffect } from 'react';
import { adminApi } from '../../../../lib/adminApi';
import { useRouter } from 'next/navigation';
import SignatureBuilder from '../components/SignatureBuilder';
import ExamplesEditor from '../components/ExamplesEditor';
import { JUDGE_MODES } from '../../../../lib/typeSystem';

export default function NewProblem() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', difficulty: 'Medium', status: 'Draft',
    input_format: '', output_format: '', constraints: '',
    tags: '', time_limit_ms: 2000, memory_limit_mb: 256, source: 'kodechirp',
    judge_mode: JUDGE_MODES.STDIN_STDOUT, signature_metadata: { name: '', params: [], returnType: 'Void' },
  });

  // Examples state
  const [examples, setExamples] = useState([
    { id: 'ex-1', input: '', output: '', explanation: '' },
  ]);
  const [examplesError, setExamplesError] = useState(null);
  const [examplesHighlighted, setExamplesHighlighted] = useState(false);
  const examplesRef = useRef(null);

  // AI status
  const [aiConfigured, setAiConfigured] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);

  useEffect(() => {
    adminApi.getAIStatus()
      .then(res => setAiConfigured(!!res?.data?.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  const updateField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleExamplesChange = (newExamples) => {
    setExamples(newExamples);
    // Clear highlight if at least one example now has input and output
    const hasValid = newExamples.some(e => e.input.trim() && e.output.trim());
    if (hasValid && examplesHighlighted) {
      setExamplesHighlighted(false);
      setExamplesError(null);
    }
  };

  const handleGenerateExamples = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      alert('Please enter a problem title or description first before generating examples.');
      return;
    }
    setGeneratingExamples(true);
    try {
      const res = await adminApi.generateExamples({
        title: form.title,
        description: form.description,
        constraints: form.constraints,
        input_format: form.input_format,
        output_format: form.output_format,
        judge_mode: form.judge_mode,
        signature_metadata: form.signature_metadata,
      });

      if (res.success && Array.isArray(res.examples) && res.examples.length > 0) {
        const newCards = res.examples.map((ex, idx) => ({
          id: 'ex-gen-' + Date.now() + '-' + idx,
          input: ex.input || '',
          output: ex.output || '',
          explanation: ex.explanation || '',
        }));

        const hasOnlyEmptyCard = examples.length === 1 && !examples[0].input.trim() && !examples[0].output.trim();
        if (hasOnlyEmptyCard) {
          setExamples(newCards);
        } else {
          setExamples(prev => [...prev, ...newCards]);
        }
        setExamplesError(null);
        setExamplesHighlighted(false);
        alert(`Successfully generated ${newCards.length} example(s) (${res.source === 'ai' ? 'AI' : 'parsed from description'})!`);
      } else {
        alert(res.message || 'No examples could be generated.');
      }
    } catch (err) {
      alert('Failed to generate examples: ' + err.message);
    } finally {
      setGeneratingExamples(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!form.title.trim() || !form.description.trim()) {
      alert('Title and description are required');
      return;
    }

    // Client-side validation for Publish: at least one example with input and output required
    if (publish) {
      const validExamples = examples.filter(ex => ex && ex.input.trim() && ex.output.trim());
      if (validExamples.length === 0) {
        setExamplesError('Problem requires at least one example with both Input and Output before publishing.');
        setExamplesHighlighted(true);
        if (examplesRef.current) {
          examplesRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      setExamplesError(null);
      setExamplesHighlighted(false);
    }

    setSaving(true);
    try {
      const formattedExamples = examples
        .filter(ex => ex && (ex.input.trim() || ex.output.trim()))
        .map(ex => ({
          input: ex.input.trim(),
          output: ex.output.trim(),
          explanation: ex.explanation ? ex.explanation.trim() : '',
        }));

      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        status: publish ? 'Published' : 'Draft',
        examples: formattedExamples,
      };

      const res = await adminApi.createProblem(payload);
      router.push(`/admin/problems/${res.data.id}/edit`);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Create New Problem</h1>
          <p className="admin-page-subtitle">Fill in the problem details below</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="admin-btn admin-btn-ghost" onClick={() => router.push('/admin/problems')}>Cancel</button>
          <button className="admin-btn admin-btn-ghost" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="admin-btn admin-btn-primary" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      <div className="admin-grid-2">
        <div>
          <div className="admin-form-group">
            <label className="admin-form-label">Title *</label>
            <input className="admin-input" value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="e.g. Two Sum" />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Description (Markdown) *</label>
            <textarea className="admin-textarea" style={{ minHeight: '300px' }} value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Problem description in markdown..." />
          </div>
          <div className="admin-form-group">
            <label className="admin-form-label">Constraints</label>
            <textarea className="admin-textarea" style={{ minHeight: '80px' }} value={form.constraints} onChange={e => updateField('constraints', e.target.value)} placeholder="1 <= n <= 10^5" />
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

          {form.judge_mode === JUDGE_MODES.FUNCTION && (
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
            <input className="admin-input" value={form.tags} onChange={e => updateField('tags', e.target.value)} placeholder="array, hash-table, sorting" />
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

      {/* Examples Section */}
      <ExamplesEditor
        examples={examples}
        onChange={handleExamplesChange}
        error={examplesError}
        isHighlighted={examplesHighlighted}
        sectionRef={examplesRef}
        onGenerateExamples={handleGenerateExamples}
        generatingExamples={generatingExamples}
        aiConfigured={aiConfigured}
      />
    </div>
  );
}
