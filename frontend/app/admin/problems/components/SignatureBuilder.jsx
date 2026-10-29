'use client';

import React from 'react';
import { DATA_TYPES } from '../../../../lib/typeSystem';

export default function SignatureBuilder({ signature, onChange }) {
  const currentSignature = signature || { name: '', params: [], returnType: 'Void' };

  const updateName = (name) => {
    onChange({ ...currentSignature, name });
  };

  const updateReturnType = (returnType) => {
    onChange({ ...currentSignature, returnType });
  };

  const addParam = () => {
    onChange({
      ...currentSignature,
      params: [...currentSignature.params, { name: '', type: DATA_TYPES.INTEGER }]
    });
  };

  const updateParam = (index, field, value) => {
    const newParams = [...currentSignature.params];
    newParams[index][field] = value;
    onChange({ ...currentSignature, params: newParams });
  };

  const removeParam = (index) => {
    const newParams = [...currentSignature.params];
    newParams.splice(index, 1);
    onChange({ ...currentSignature, params: newParams });
  };

  return (
    <div className="signature-builder border border-[var(--kc-border)] p-4 rounded-lg bg-[var(--kc-surface)] mb-4">
      <h3 className="text-sm font-semibold text-[var(--kc-text-primary)] mb-3">Function Signature Builder</h3>
      
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--kc-text-secondary)] mb-1">Function Name</label>
          <input 
            type="text" 
            className="w-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] px-3 py-1.5 rounded-md text-sm focus:outline-none focus:border-[var(--kc-accent)] transition-colors"
            value={currentSignature.name} 
            onChange={(e) => updateName(e.target.value)} 
            placeholder="e.g. two_sum"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-[var(--kc-text-secondary)] mb-1">Return Type</label>
          <select 
            className="w-full bg-[var(--kc-surface-subtle)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] px-3 py-1.5 rounded-md text-sm focus:outline-none focus:border-[var(--kc-accent)] transition-colors"
            value={currentSignature.returnType} 
            onChange={(e) => updateReturnType(e.target.value)}
          >
            <option value="Void">Void</option>
            {Object.values(DATA_TYPES).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-medium text-[var(--kc-text-secondary)]">Parameters</label>
          <button 
            type="button" 
            onClick={addParam}
            className="text-xs bg-[var(--kc-accent)] hover:opacity-90 text-[var(--kc-on-primary)] px-2.5 py-1 rounded-md transition-opacity"
          >
            + Add Parameter
          </button>
        </div>
        
        {currentSignature.params.length === 0 ? (
          <p className="text-xs text-[var(--kc-text-muted)] italic">No parameters defined.</p>
        ) : (
          <div className="space-y-2">
            {currentSignature.params.map((param, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-[var(--kc-surface-subtle)] p-2 rounded-md border border-[var(--kc-border)]">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border border-[var(--kc-border)] text-[var(--kc-text-primary)] px-2 py-1 rounded text-xs focus:outline-none focus:border-[var(--kc-accent)]"
                  value={param.name} 
                  onChange={(e) => updateParam(idx, 'name', e.target.value)} 
                  placeholder="Param name (e.g. nums)"
                />
                <select 
                  className="flex-1 bg-[var(--kc-surface)] border border-[var(--kc-border)] text-[var(--kc-text-primary)] px-2 py-1 rounded text-xs focus:outline-none focus:border-[var(--kc-accent)]"
                  value={param.type} 
                  onChange={(e) => updateParam(idx, 'type', e.target.value)}
                >
                  {Object.values(DATA_TYPES).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => removeParam(idx)}
                  className="text-[var(--kc-error-text)] hover:opacity-80 px-2 font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-[var(--kc-surface-subtle)] rounded-md border border-[var(--kc-border)] font-mono text-xs text-[var(--kc-text-secondary)]">
        <span className="text-[var(--kc-accent-text)] font-semibold">def</span> <span className="text-amber-600 dark:text-amber-400 font-semibold">{currentSignature.name || 'function_name'}</span>(
        {currentSignature.params.map(p => `${p.name}: ${p.type}`).join(', ')}
        ) -&gt; {currentSignature.returnType}
      </div>
    </div>
  );
}
