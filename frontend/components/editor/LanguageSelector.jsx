import { SUPPORTED_LANGUAGES } from '../../lib/constants';
import { useEditor } from '../../hooks/useEditor';
import { Code2 } from 'lucide-react';

export const LanguageSelector = () => {
  const { language, setLanguage } = useEditor();

  return (
    <div className="flex items-center gap-3 px-5">
      <Code2 size={16} className="text-[#58a6ff]" />
      <div className="relative">
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="appearance-none bg-[#1c2128] border border-[#444c56] text-sm text-[#e6edf3] font-medium rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#58a6ff] hover:bg-[#22272e] transition-all cursor-pointer shadow-sm"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>{lang.name}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#8b949e]">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
          </svg>
        </div>
      </div>
    </div>
  );
};
