import { useState, useMemo } from 'react';
import { 
  Download, 
  Table, 
  FileJson, 
  Terminal, 
  ChevronDown, 
  ChevronUp,
  Search,
  X
} from 'lucide-react';
import { exportToCSV, exportToJSON } from '../../lib/duckdb';

interface ResultsViewerProps {
  results: QueryResults | null;
}

export interface QueryResults {
  type: 'sql' | 'python';
  success: boolean;
  data?: any[];
  columns?: string[];
  output?: string;
  result?: any;
  plot?: string;
  error?: string;
  executionTime: number;
  rowCount?: number;
}

const ResultsViewer = ({ results }: ResultsViewerProps) => {
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'text'>('table');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 100;

  if (!results) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        <div className="text-center">
          <Terminal size={32} className="mx-auto mb-2 opacity-50" />
          <p>Run a query to see results</p>
        </div>
      </div>
    );
  }

  if (results.error) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
          <h3 className="text-red-500 font-medium mb-2 flex items-center gap-2">
            <X size={16} />
            Error
          </h3>
          <pre className="text-red-400 text-sm whitespace-pre-wrap font-mono">
            {results.error}
          </pre>
        </div>
        <div className="text-text-secondary text-xs mt-2 text-right">
          Execution time: {(results.executionTime / 1000).toFixed(3)}s
        </div>
      </div>
    );
  }

  // Determine view mode based on results type
  const effectiveViewMode = useMemo(() => {
    if (results.type === 'python') {
      if (results.plot) return 'plot';
      if (results.output) return 'text';
      if (Array.isArray(results.result) && results.result.length > 0) return 'json';
      return 'text';
    }
    return viewMode;
  }, [results, viewMode]);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let data: any[] = results.data || results.result || [];
    
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    // Filter
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      data = data.filter((row: any) => 
        Object.values(row).some(val => 
          String(val).toLowerCase().includes(lowerFilter)
        )
      );
    }
    
    // Sort
    if (sortColumn && results.columns) {
      data = [...data].sort((a: any, b: any) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return data;
  }, [results, filterText, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / rowsPerPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Export handlers
  const handleExportCSV = () => {
    if (results.columns && results.data) {
      const csv = exportToCSV(results.data, results.columns);
      downloadFile(csv, 'results.csv', 'text/csv');
    }
  };

  const handleExportJSON = () => {
    const data = results.data || results.result;
    if (data) {
      const json = exportToJSON(Array.isArray(data) ? data : [data]);
      downloadFile(json, 'results.json', 'application/json');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns = results.columns || (processedData.length > 0 ? Object.keys(processedData[0]) : []);
  const rowCount = processedData.length;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border-color bg-secondary">
        <div className="flex items-center gap-2">
          {results.type === 'sql' && (
            <>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-accent text-white' : 'hover:bg-tertiary'
                }`}
              >
                <Table size={14} />
                Table
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                  viewMode === 'json' ? 'bg-accent text-white' : 'hover:bg-tertiary'
                }`}
              >
                <FileJson size={14} />
                JSON
              </button>
            </>
          )}
          {(results.type === 'python' || results.output) && (
            <button
              onClick={() => setViewMode('text')}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'text' ? 'bg-accent text-white' : 'hover:bg-tertiary'
              }`}
            >
              <Terminal size={14} />
              Output
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filter input */}
          {viewMode === 'table' && (
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Filter..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="pl-7 pr-3 py-1 text-xs bg-tertiary rounded border-none outline-none focus:ring-1 focus:ring-accent w-32"
              />
            </div>
          )}

          {/* Export buttons */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-tertiary transition-colors"
            title="Export as CSV"
          >
            <Download size={14} />
            CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-tertiary transition-colors"
            title="Export as JSON"
          >
            <Download size={14} />
            JSON
          </button>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-auto">
        {effectiveViewMode === 'table' && columns.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-tertiary sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="text-left px-3 py-2 font-medium text-text-secondary cursor-pointer hover:bg-active select-none whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      {sortColumn === col && (
                        sortDirection === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row: any, idx: number) => (
                <tr 
                  key={idx} 
                  className={idx % 2 === 0 ? 'bg-primary' : 'bg-secondary'}
                >
                  {columns.map((col) => (
                    <td 
                      key={col} 
                      className="px-3 py-2 border-t border-border-color whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                      title={String(row[col])}
                    >
                      {row[col] === null || row[col] === undefined ? (
                        <span className="text-text-secondary italic">null</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : effectiveViewMode === 'plot' && results.plot ? (
          <div className="flex items-center justify-center h-full p-4">
            <img 
              src={`data:image/png;base64,${results.plot}`} 
              alt="Plot"
              className="max-w-full max-h-full"
            />
          </div>
        ) : effectiveViewMode === 'json' ? (
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(results.result || results.data, null, 2)}
          </pre>
        ) : (
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
            {results.output || (results.result !== undefined ? String(results.result) : 'No output')}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-color bg-secondary text-xs text-text-secondary">
        <div>
          {rowCount > 0 && (
            <span>
              {rowCount} {rowCount === 1 ? 'row' : 'rows'}
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-0.5 rounded hover:bg-tertiary disabled:opacity-30"
              >
                ←
              </button>
              <span className="px-2">{currentPage}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-0.5 rounded hover:bg-tertiary disabled:opacity-30"
              >
                →
              </button>
            </div>
          )}
          <span>{(results.executionTime / 1000).toFixed(3)}s</span>
        </div>
      </div>
    </div>
  );
};

export default ResultsViewer;