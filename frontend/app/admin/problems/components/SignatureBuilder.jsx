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
    <div className="signature-builder border p-4 rounded bg-[#0d1117] mb-4">
      <h3 className="text-lg font-bold text-white mb-4">Function Signature Builder</h3>
      
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Function Name</label>
          <input 
            type="text" 
            className="w-full bg-[#161b22] border border-[#30363d] text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500"
            value={currentSignature.name} 
            onChange={(e) => updateName(e.target.value)} 
            placeholder="e.g. two_sum"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">Return Type</label>
          <select 
            className="w-full bg-[#161b22] border border-[#30363d] text-white px-3 py-2 rounded focus:outline-none focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-300">Parameters</label>
          <button 
            type="button" 
            onClick={addParam}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
          >
            + Add Parameter
          </button>
        </div>
        
        {currentSignature.params.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No parameters defined.</p>
        ) : (
          <div className="space-y-2">
            {currentSignature.params.map((param, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-[#161b22] p-2 rounded border border-[#30363d]">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border border-[#30363d] text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500"
                  value={param.name} 
                  onChange={(e) => updateParam(idx, 'name', e.target.value)} 
                  placeholder="Param name (e.g. nums)"
                />
                <select 
                  className="flex-1 bg-transparent border border-[#30363d] text-white px-2 py-1 rounded focus:outline-none focus:border-blue-500"
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
                  className="text-red-500 hover:text-red-400 px-2 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-3 bg-[#161b22] rounded border border-[#30363d] font-mono text-sm text-gray-300">
        <span className="text-blue-400">def</span> <span className="text-yellow-200">{currentSignature.name || 'function_name'}</span>(
        {currentSignature.params.map(p => `${p.name}: ${p.type}`).join(', ')}
        ) -&gt; {currentSignature.returnType}
      </div>
    </div>
  );
}
