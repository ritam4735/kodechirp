'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '../../../../../lib/adminApi';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function EditProblem() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    adminApi.getProblem(id)
      .then(res => {
        const p = res.data;
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
        });
        setLoading(false);
      })
      .catch(err => {
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
      alert('Saved successfully');
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
            <button className="admin-btn admin-btn-primary" onClick={() => handleSave(true)} disabled={saving}>Publish</button>
          )}
        </div>
      </div>

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
    </div>
  );
}
