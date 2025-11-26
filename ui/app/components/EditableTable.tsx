import React, { useState, useEffect } from 'react';

export type TableData = {
  columns: string[];
  rows: any[][];
};

type Props = {
  data: TableData;
  onChange: (data: TableData) => void;
};

export const EditableTable: React.FC<Props> = ({ data, onChange }) => {
  const [localData, setLocalData] = useState<TableData>(data);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...localData.rows];
    newRows[rowIndex] = [...newRows[rowIndex]];
    newRows[rowIndex][colIndex] = value;
    const updated = { ...localData, rows: newRows };
    setLocalData(updated);
    onChange(updated);
  };

  const handleColumnNameChange = (colIndex: number, newName: string) => {
    const newColumns = [...localData.columns];
    newColumns[colIndex] = newName;
    const updated = { ...localData, columns: newColumns };
    setLocalData(updated);
    onChange(updated);
  };

  const handleAddRow = () => {
    const newRow = new Array(localData.columns.length).fill('');
    const updated = { ...localData, rows: [...localData.rows, newRow] };
    setLocalData(updated);
    onChange(updated);
  };

  const handleDeleteRow = (rowIndex: number) => {
    const newRows = localData.rows.filter((_, i) => i !== rowIndex);
    const updated = { ...localData, rows: newRows };
    setLocalData(updated);
    onChange(updated);
  };

  const handleAddColumn = () => {
    const newColumns = [...localData.columns, `Column${localData.columns.length + 1}`];
    const newRows = localData.rows.map(row => [...row, '']);
    const updated = { columns: newColumns, rows: newRows };
    setLocalData(updated);
    onChange(updated);
  };

  const handleDeleteColumn = (colIndex: number) => {
    if (localData.columns.length <= 1) {
      alert('At least one column must exist.');
      return;
    }
    const newColumns = localData.columns.filter((_, i) => i !== colIndex);
    const newRows = localData.rows.map(row => row.filter((_, i) => i !== colIndex));
    const updated = { columns: newColumns, rows: newRows };
    setLocalData(updated);
    onChange(updated);
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr>
            {localData.columns.map((col, i) => (
              <th key={i} style={{ border: '1px solid #ccc', padding: 8, background: '#f5f5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={col}
                    onChange={(e) => handleColumnNameChange(i, e.target.value)}
                    style={{ flex: 1, border: '1px solid #ddd', padding: 4, fontWeight: 'bold' }}
                  />
                  <button
                    onClick={() => handleDeleteColumn(i)}
                    style={{ fontSize: 11, padding: '2px 6px' }}
                    title="Delete column"
                  >
                    ✕
                  </button>
                </div>
              </th>
            ))}
            <th style={{ border: '1px solid #ccc', padding: 8, background: '#f5f5f5', width: 100 }}>
              <button onClick={handleAddColumn} style={{ fontSize: 11, padding: '4px 8px' }}>
                + Add Column
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {localData.rows.length === 0 ? (
            <tr>
              <td colSpan={localData.columns.length + 1} style={{ textAlign: 'center', padding: 16, color: '#999' }}>
                No data available
              </td>
            </tr>
          ) : (
            localData.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid #ccc', padding: 4 }}>
                    <input
                      type="text"
                      value={cell ?? ''}
                      onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                      style={{ width: '100%', border: 'none', padding: 4 }}
                    />
                  </td>
                ))}
                <td style={{ border: '1px solid #ccc', padding: 4, textAlign: 'center' }}>
                  <button onClick={() => handleDeleteRow(rIdx)} style={{ fontSize: 12 }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <button onClick={handleAddRow} style={{ padding: '6px 12px' }}>
          + Add Row
        </button>
      </div>
    </div>
  );
};

export default EditableTable;
