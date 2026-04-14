import React, { useCallback, useEffect, useState } from 'react';
import { Spinner, Button } from '../ui';
import { getSectionReport, type SectionReportRow } from '../../services/grades.service';
import { exportSectionCSV } from '../../services/export.service';

interface MarksReportProps {
  sectionId: string;
  semesterId: string;
  sectionName: string;
}

const MarksReport: React.FC<MarksReportProps> = ({ sectionId, semesterId, sectionName }) => {
  const [rows, setRows] = useState<SectionReportRow[]>([]);
  const [semesterNumber, setSemesterNumber] = useState<7 | 8 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSectionReport(sectionId, semesterId);
      setRows(data);
      if (data.length > 0) {
        setSemesterNumber(data[0].components.semesterNumber);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [sectionId, semesterId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSectionCSV(sectionId, semesterId, sectionName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const isFYP1 = semesterNumber === 7;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          {sectionName} — {semesterNumber === 7 ? 'FYP-I' : semesterNumber === 8 ? 'FYP-II' : 'Marks Report'}
        </h2>
        <Button
          onClick={handleExport}
          disabled={exporting || loading || rows.length === 0}
          variant="secondary"
          size="sm"
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>

      {error && <p className="px-5 py-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No students found in this section.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Registration Number</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                {isFYP1 ? (
                  <>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Project Approval</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">SRS</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">SDD</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Final Documentation</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Final Project Code</th>
                  </>
                )}
                <th className="px-4 py-3 text-left font-medium text-gray-600">Meeting Marks</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(({ student, components, total, grade }) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-800">{student.reg_number}</td>
                  <td className="px-4 py-3 text-gray-800">{student.student_name}</td>
                  {isFYP1 ? (
                    <>
                      <td className="px-4 py-3 text-gray-700">{components.projectApproval ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700">{components.srs ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700">{components.sdd ?? 0}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-gray-700">{components.finalDocumentation ?? 0}</td>
                      <td className="px-4 py-3 text-gray-700">{components.finalProjectCode ?? 0}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-gray-700">{components.meetingMarks}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{total}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      grade === 'A' ? 'bg-green-100 text-green-700' :
                      grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      grade === 'C' ? 'bg-yellow-100 text-yellow-700' :
                      grade === 'D' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarksReport;
