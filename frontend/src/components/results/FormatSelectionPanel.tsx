/**
 * Format Selection Panel Component
 */

import type { SelectedFormats } from '../../types/results';

interface FormatSelectionPanelProps {
  selectedFormats: SelectedFormats;
  setSelectedFormats: (formats: SelectedFormats) => void;
}

export const FormatSelectionPanel = ({ selectedFormats, setSelectedFormats }: FormatSelectionPanelProps) => {
  const updateFormat = (format: keyof SelectedFormats, value: boolean) => {
    setSelectedFormats({ ...selectedFormats, [format]: value });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
          <span className="text-2xl">📄</span>
          Export Formats
        </h4>
        <span className="text-xs text-gray-500 bg-gray-700/50 px-3 py-1 rounded-full">
          Select all that apply
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
          <input 
            type="checkbox" 
            className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
            checked={selectedFormats.pdf}
            onChange={(e) => updateFormat('pdf', e.target.checked)}
          />
          <div className="text-center">
            <span className="text-2xl">📑</span>
            <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">
              PDF
            </span>
          </div>
        </label>
        
        <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
          <input 
            type="checkbox" 
            className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
            checked={selectedFormats.docx}
            onChange={(e) => updateFormat('docx', e.target.checked)}
          />
          <div className="text-center">
            <span className="text-2xl">📝</span>
            <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">
              DOCX
            </span>
          </div>
        </label>
        
        <label className="flex items-center justify-center p-4 bg-gray-700/30 rounded-xl hover:bg-gray-700/50 transition-all cursor-pointer group">
          <input 
            type="checkbox" 
            className="mr-2 h-4 w-4 text-cyan-500 rounded focus:ring-cyan-500" 
            checked={selectedFormats.html}
            onChange={(e) => updateFormat('html', e.target.checked)}
          />
          <div className="text-center">
            <span className="text-2xl">🌐</span>
            <span className="block text-sm font-medium text-gray-200 group-hover:text-cyan-400 transition-colors mt-1">
              HTML
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};