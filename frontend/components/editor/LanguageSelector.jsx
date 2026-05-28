import { SUPPORTED_LANGUAGES } from '../../lib/constants';
import { useEditor } from '../../hooks/useEditor';

export const LanguageSelector = () => {
  const { language, setLanguage } = useEditor();

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262d] bg-[#161b22]">
      <select 
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-[#0d1117] border border-[#30363d] text-sm text-[#e6edf3] rounded px-3 py-1.5 focus:outline-none focus:border-[#58a6ff] transition-colors"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>{lang.name}</option>
        ))}
      </select>
    </div>
  );
};
