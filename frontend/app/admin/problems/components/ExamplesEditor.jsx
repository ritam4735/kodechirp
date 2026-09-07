'use client';

import React, { useState } from 'react';
import { GripVertical, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, AlertCircle } from 'lucide-react';

/**
 * ExamplesEditor Component
 *
 * Dedicated editor for problem examples in Problem Authoring (New & Edit problem forms).
 * Supports:
 * - Input (required), Output (required), Explanation (optional)
 * - 1 empty card by default
 * - Add Example, Remove, Drag-to-reorder, and Up/Down reordering
 * - Error highlighting with pulse animation and smooth auto-scroll target
 * - AI Generate Examples trigger button
 */
export default function ExamplesEditor({
  examples = [],
  onChange,
  error = null,
  isHighlighted = false,
  sectionRef = null,
  onGenerateExamples = null,
  generatingExamples = false,
  aiConfigured = false,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Generate a client-side unique id
  const createEmptyExample = () => ({
    id: 'ex-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    input: '',
    output: '',
    explanation: '',
  });

  // Ensure there's at least one card by default if examples is empty
  const currentExamples = Array.isArray(examples) && examples.length > 0
    ? examples
    : [{ id: 'ex-default', input: '', output: '', explanation: '' }];

  const handleUpdateField = (index, field, value) => {
    const next = currentExamples.map((ex, i) => {
      if (i === index) {
        return { ...ex, [field]: value };
      }
      return ex;
    });
    onChange(next);
  };

  const handleAddExample = () => {
    const next = [...currentExamples, createEmptyExample()];
    onChange(next);
  };

  const handleRemoveExample = (index) => {
    const next = currentExamples.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleMove = (fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= currentExamples.length) return;
    const next = [...currentExamples];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  // Drag and Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch (_) {}
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // Only reset if leaving the card area
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...currentExamples];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      ref={sectionRef}
      id="examples-section"
      className={`admin-section-card author-examples-section ${isHighlighted ? 'highlight-error' : ''}`}
      style={{ marginTop: '24px', marginBottom: '24px' }}
    >
      {/* Header */}
      <div className="admin-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📋 Examples</span>
          <span className="admin-badge" style={{ fontSize: '11px', background: 'rgba(88, 166, 255, 0.15)', color: '#58a6ff' }}>
            {currentExamples.length}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-muted)' }}>
            (At least one example required to publish)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onGenerateExamples && (
            <button
              type="button"
              id="generate-examples-btn"
              className="admin-btn admin-btn-ghost admin-btn-sm"
              onClick={onGenerateExamples}
              disabled={generatingExamples}
              title={aiConfigured ? 'Generate examples with AI based on problem description' : 'Extract examples from problem description'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', borderColor: 'rgba(168, 85, 247, 0.3)', color: '#c084fc' }}
            >
              <Sparkles size={14} />
              {generatingExamples ? 'Generating...' : '✨ Generate Examples'}
            </button>
          )}

          <button
            type="button"
            id="add-example-btn"
            className="admin-btn admin-btn-primary admin-btn-sm"
            onClick={handleAddExample}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={14} />
            Add Example
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {(error || isHighlighted) && (
        <div
          id="examples-validation-alert"
          style={{
            background: 'rgba(248, 81, 73, 0.12)',
            border: '1px solid rgba(248, 81, 73, 0.35)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#f85149',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error || 'Problem requires at least one example with both Input and Output before publishing.'}</span>
        </div>
      )}

      {/* Examples List */}
      {currentExamples.length === 0 ? (
        <div className="admin-empty" style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>No examples added yet. At least one example is required to publish.</p>
          <button
            type="button"
            className="admin-btn admin-btn-primary admin-btn-sm"
            onClick={handleAddExample}
          >
            + Add Example
          </button>
        </div>
      ) : (
        <div className="author-examples-list">
          {currentExamples.map((ex, index) => {
            const isDragging = draggedIndex === index;
            const isOver = dragOverIndex === index;
            const missingInput = isHighlighted && !ex.input.trim();
            const missingOutput = isHighlighted && !ex.output.trim();

            return (
              <div
                key={ex.id || `example-${index}`}
                data-example-index={index}
                className={`author-example-card ${isDragging ? 'dragging' : ''} ${isOver ? 'drag-over' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* Card Header with Drag Handle, Index, and Controls */}
                <div className="author-example-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className="author-example-drag-handle"
                      title="Drag to reorder"
                    >
                      <GripVertical size={16} />
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Example {index + 1}
                    </span>
                    <span className="admin-badge" style={{ fontSize: '10px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' }}>
                      Sample Test Case
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => handleMove(index, index - 1)}
                      disabled={index === 0}
                      title="Move Up"
                      style={{ padding: '4px 6px', height: 'auto', minWidth: 'unset' }}
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => handleMove(index, index + 1)}
                      disabled={index === currentExamples.length - 1}
                      title="Move Down"
                      style={{ padding: '4px 6px', height: 'auto', minWidth: 'unset' }}
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-sm"
                      onClick={() => handleRemoveExample(index)}
                      title="Remove Example"
                      style={{ padding: '4px 8px', height: 'auto', minWidth: 'unset', color: '#f85149', marginLeft: '4px' }}
                    >
                      <Trash2 size={13} style={{ marginRight: '4px' }} />
                      Remove
                    </button>
                  </div>
                </div>

                {/* Card Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  {/* Input Field (Required) */}
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Input</span>
                      <span style={{ color: '#f85149' }}>*</span>
                      {missingInput && <span style={{ color: '#f85149', fontSize: '11px', fontWeight: 400 }}>(required)</span>}
                    </label>
                    <textarea
                      className="admin-textarea author-code-input"
                      style={{
                        minHeight: '80px',
                        borderColor: missingInput ? '#f85149' : undefined,
                      }}
                      value={ex.input}
                      onChange={(e) => handleUpdateField(index, 'input', e.target.value)}
                      placeholder="e.g. nums = [2,7,11,15], target = 9"
                    />
                  </div>

                  {/* Output Field (Required) */}
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label className="admin-form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>Output</span>
                      <span style={{ color: '#f85149' }}>*</span>
                      {missingOutput && <span style={{ color: '#f85149', fontSize: '11px', fontWeight: 400 }}>(required)</span>}
                    </label>
                    <textarea
                      className="admin-textarea author-code-input"
                      style={{
                        minHeight: '80px',
                        borderColor: missingOutput ? '#f85149' : undefined,
                      }}
                      value={ex.output}
                      onChange={(e) => handleUpdateField(index, 'output', e.target.value)}
                      placeholder="e.g. [0,1]"
                    />
                  </div>
                </div>

                {/* Explanation Field (Optional) */}
                <div className="admin-form-group" style={{ marginTop: '12px', marginBottom: 0 }}>
                  <label className="admin-form-label">
                    <span>Explanation</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 400, marginLeft: '4px' }}>(optional)</span>
                  </label>
                  <textarea
                    className="admin-textarea"
                    style={{ minHeight: '60px' }}
                    value={ex.explanation || ''}
                    onChange={(e) => handleUpdateField(index, 'explanation', e.target.value)}
                    placeholder="e.g. Because nums[0] + nums[1] == 9, we return [0, 1]."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
