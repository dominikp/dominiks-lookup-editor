import React, { useState, useEffect } from "react";

import { Flex } from "@dynatrace/strato-components/layouts";
import { Heading, Paragraph } from "@dynatrace/strato-components/typography";
import { Button } from "@dynatrace/strato-components/buttons";
import Colors from "@dynatrace/strato-design-tokens/colors";
import { CriticalIcon } from "@dynatrace/strato-icons";
import { useDql } from "@dynatrace-sdk/react-hooks";
import EditableTable, { type TableData } from "../components/EditableTable";
import { uploadLookupFile, deleteLookupFile } from "../../api/grail";

export const Data = () => {
  const [lookupTableName, setLookupTableName] = useState<string>("");
  const [dqlQuery, setDqlQuery] = useState<string>("");
  const [tableData, setTableData] = useState<TableData>({ columns: [], rows: [] });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<string[]>([]);
  const [fileDetails, setFileDetails] = useState<Record<string, any>>({});
  const [selectedFileInfo, setSelectedFileInfo] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showTable, setShowTable] = useState(false);
  const [skipAutoLoad, setSkipAutoLoad] = useState(false);

  const { data, error, isLoading, refetch } = useDql({
    query: dqlQuery || 'fetch logs | limit 0',
  });

  // Fetch available files on mount
  const { data: filesData, refetch: refetchFiles } = useDql({
    query: 'fetch dt.system.files',
  });

  useEffect(() => {
    if (filesData?.records && filesData.records.length > 0) {
      // Extract file paths from the records
      const firstRecord = filesData.records[0];
      const pathKey = Object.keys(firstRecord).find(k => k.includes('path') || k.includes('file') || k.includes('name')) || Object.keys(firstRecord)[0];
      const files = filesData.records.map((r: any) => r[pathKey]).filter(Boolean);
      
      // If lookupTableName is set but not in the fetched files, keep it in the list
      if (lookupTableName && !files.includes(lookupTableName)) {
        setAvailableFiles([...files, lookupTableName]);
      } else {
        setAvailableFiles(files);
      }
      
      // Store full details for each file
      const details: Record<string, any> = {};
      filesData.records.forEach((record: any) => {
        const filePath = record[pathKey];
        if (filePath) {
          details[filePath] = record;
        }
      });
      setFileDetails(details);
    }
  }, [filesData, lookupTableName]);

  // Update selected file info when lookup table name changes
  useEffect(() => {
    if (lookupTableName && fileDetails[lookupTableName]) {
      setSelectedFileInfo(fileDetails[lookupTableName]);
    } else {
      setSelectedFileInfo(null);
    }
  }, [lookupTableName, fileDetails]);

  // Check if error is "file doesn't exist" and create empty table
  useEffect(() => {
    if (error && (error.message?.includes("doesn't exist") || error.message?.includes("UNKNOWN_TABULAR_FILE"))) {
      setTableData({ columns: ['Column1'], rows: [['']] });
      setUploadError(null); // Clear any previous upload errors
      setShowTable(false); // Don't show table for non-existent files unless creating new
    }
  }, [error]);

  // When DQL data loads, convert it to table format
  useEffect(() => {
    // Only process data if we actually have a valid query (not the dummy query)
    if (!dqlQuery || dqlQuery === 'fetch logs | limit 0') {
      return;
    }
    
    if (data?.records && data.records.length > 0) {
      // Extract columns from the first record
      const firstRecord = data.records[0];
      const columns = Object.keys(firstRecord);
      const rows = data.records.map((record: any) =>
        columns.map((col: string) => record[col] ?? '')
      );
      setTableData({ columns, rows });
      setShowTable(true); // Show table when data is loaded
    } else if (data?.records && data.records.length === 0) {
      // Empty result - create default table with 1 column and 1 row
      setTableData({ columns: ['Column1'], rows: [['']] });
      setShowTable(true); // Show table for empty results
    }
  }, [data, dqlQuery]);

  const handleLoadLookup = () => {
    if (!lookupTableName.trim()) {
      return;
    }
    const query = `load "${lookupTableName.trim()}"`;
    setDqlQuery(query);
    setUploadSuccess(false);
    setUploadError(null);
  };

  // Auto-load when a file is selected
  useEffect(() => {
    if (lookupTableName.trim() && !creatingNew && !skipAutoLoad) {
      handleLoadLookup();
    }
    if (skipAutoLoad) {
      setSkipAutoLoad(false); // Reset the flag after skipping once
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupTableName]);

  const handleCreateNew = () => {
    if (!newFileName.trim()) {
      setUploadError("Please enter a file name.");
      return;
    }
    const fileName = newFileName.trim();
    setSkipAutoLoad(true); // Skip auto-load for this new file
    setLookupTableName(fileName);
    setTableData({ columns: ['Column1'], rows: [['']] });
    setShowTable(true); // Show table when creating new file
    setCreatingNew(false);
    setNewFileName("");
    setUploadError(null);
    setUploadSuccess(false);
  };

  const handleCancelNew = () => {
    setCreatingNew(false);
    setNewFileName("");
  };

  const handleUpdateLookup = async () => {
    if (!lookupTableName.trim()) {
      setUploadError("Please enter a lookup table name.");
      return;
    }

    if (tableData.columns.length === 0 || tableData.rows.length === 0) {
      setUploadError("Table must have at least one column and one row.");
      return;
    }

    // Convert table data to CSV (without headers - only data rows)
    const csvLines = tableData.rows.map(row => row.map(cell => {
      const str = String(cell ?? '');
      // Simple CSV escaping: wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));
    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    
    const filePath = lookupTableName.trim();
    const fileName = filePath.split('/').pop() || filePath;
    const file = new File([blob], fileName, { type: 'text/csv' });

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await uploadLookupFile(file, {
        filePath: filePath,
        lookupField: tableData.columns[0],
        displayName: fileName.replace('.csv', ''),
        description: `Lookup table: ${filePath}`,
        columns: tableData.columns,
      });
      setUploading(false);
      setUploadSuccess(true);
      // Refresh file list after upload
      void refetchFiles();
      // Optionally refetch after upload
      if (dqlQuery) {
        void refetch();
      }
    } catch (err: any) {
      setUploading(false);
      setUploadError(err?.message ?? 'Upload failed');
    }
  };

  const handleDeleteLookup = async () => {
    if (!lookupTableName.trim()) {
      setUploadError("Please enter a lookup table name.");
      return;
    }

    if (!confirm(`Do you really want to delete the lookup table "${lookupTableName}"?`)) {
      return;
    }

    setDeleting(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      await deleteLookupFile(lookupTableName.trim());
      setDeleting(false);
      setUploadSuccess(true);
      setTableData({ columns: [], rows: [] });
      setLookupTableName('');
      setShowTable(false); // Hide table after deletion
      // Refresh file list after deletion
      void refetchFiles();
      // Optionally refetch data
      if (dqlQuery) {
        void refetch();
      }
    } catch (err: any) {
      setDeleting(false);
      setUploadError(err?.message ?? 'Delete failed');
    }
  };

  return (
    <>
      <Flex flexDirection="column" alignItems="center" padding={32}>
        <Heading level={2}>
          Lookup Table Editor
        </Heading>
      </Flex>
      <Flex flexDirection="column" padding={32} gap={16}>
        <Paragraph>Select a lookup table or enter a path:</Paragraph>
        <Flex gap={8} alignItems="flex-end">
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Lookup Table</label>
            {!creatingNew ? (
              <select
                value={lookupTableName}
                onChange={(e) => setLookupTableName(e.target.value)}
                style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                disabled={isLoading}
              >
                <option value="">-- Select file --</option>
                {availableFiles.map((file, idx) => (
                  <option key={idx} value={file}>{file}</option>
                ))}
              </select>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. /lookups/grail/pm/new_table.csv"
                  style={{ flex: 1, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                  autoFocus
                />
                <Button onClick={handleCreateNew}>Create</Button>
                <Button onClick={handleCancelNew}>Cancel</Button>
              </div>
            )}
          </div>
          {!creatingNew && (
            <Button onClick={() => setCreatingNew(true)}>+ New File</Button>
          )}
        </Flex>

        {selectedFileInfo && (
          <div style={{ 
            padding: 12, 
            background: '#f0f8ff', 
            border: '1px solid #b0d4f1', 
            borderRadius: 4,
            fontSize: 13
          }}>
            <strong>File Details:</strong>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
              {Object.entries(selectedFileInfo).map(([key, value]) => (
                <React.Fragment key={key}>
                  <div style={{ fontWeight: 500 }}>{key}:</div>
                  <div style={{ wordBreak: 'break-all' }}>{String(value)}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {error && !(error.message?.includes("doesn't exist") || error.message?.includes("UNKNOWN_TABULAR_FILE")) && (
          <Flex alignItems={"center"} style={{ color: Colors.Text.Critical.Default }}>
            <CriticalIcon />
            <Paragraph>{error.message}</Paragraph>
          </Flex>
        )}

        {error && (error.message?.includes("doesn't exist") || error.message?.includes("UNKNOWN_TABULAR_FILE")) && (
          <Flex alignItems={"center"} style={{ color: Colors.Text.Warning.Default }}>
            <Paragraph>ℹ️ The file does not exist. An empty table has been created.</Paragraph>
          </Flex>
        )}

        {uploadError && (
          <Flex alignItems={"center"} style={{ color: Colors.Text.Critical.Default }}>
            <CriticalIcon />
            <Paragraph>{uploadError}</Paragraph>
          </Flex>
        )}

        {uploadSuccess && (
          <Flex alignItems={"center"} style={{ color: 'green' }}>
            <Paragraph>✓ Lookup table successfully updated!</Paragraph>
          </Flex>
        )}

        {showTable && tableData.columns.length > 0 && (
          <>
            <EditableTable data={tableData} onChange={setTableData} />
            <Flex justifyContent="space-between">
              <Button 
                onClick={handleDeleteLookup} 
                disabled={deleting || uploading}
                style={{ background: '#d32f2f', color: 'white' }}
              >
                {deleting ? 'Deleting...' : 'Delete Lookup Table'}
              </Button>
              <Button onClick={handleUpdateLookup} disabled={uploading || deleting} style={{ background: '#2e7d32', color: 'white' }}>
                {uploading ? 'Uploading...' : 'Update Lookup Table'}
              </Button>
            </Flex>
          </>
        )}
      </Flex>
    </>
  );
};
