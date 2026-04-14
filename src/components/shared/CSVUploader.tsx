import React, { useRef, useState } from 'react';
import { RowError } from '../../types';
import { parseCSV, validateRow } from '../../utils/csv';
import Spinner from '../ui/Spinner';

interface CSVUploaderProps {
  columns: string[];
  onParsed: (rows: Record<string, string>[]) => void;
  onError: (errors: RowError[]) => void;
  label?: string;
}

const CSVUploader: React.FC<CSVUploaderProps> = ({
  columns,
  onParsed,
  onError,
  label = 'Upload CSV',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [failures, setFailures] = useState<RowError[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFailures([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;

      const { successes, failures: errs } = parseCSV<Record<string, string>>(
        text,
        columns,
        (row) => {
          validateRow(row, columns);
          return row;
        }
      );

      setLoading(false);

      if (errs.length > 0) {
        setFailures(errs);
        onError(errs);
      }

      onParsed(successes);

      // Reset input so the same file can be re-uploaded if needed
      if (inputRef.current) inputRef.current.value = '';
    };

    reader.onerror = () => {
      setLoading(false);
      onError([{ row: 0, reason: 'Failed to read file' }]);
      if (inputRef.current) inputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50">
          {loading ? (
            <>
              <Spinner size="sm" />
              Processing…
            </>
          ) : (
            label
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            disabled={loading}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {failures.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="mb-2 text-sm font-medium text-red-700">
            {failures.length} row{failures.length !== 1 ? 's' : ''} failed to import:
          </p>
          <table className="w-full text-xs text-red-800">
            <thead>
              <tr className="border-b border-red-200">
                <th className="pb-1 pr-4 text-left font-semibold">Row</th>
                <th className="pb-1 text-left font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {failures.map((f) => (
                <tr key={f.row} className="border-b border-red-100 last:border-0">
                  <td className="py-1 pr-4">{f.row}</td>
                  <td className="py-1">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CSVUploader;
