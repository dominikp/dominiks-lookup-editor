import React, { useState } from 'react';
import { uploadLookupFile } from '../../api/grail';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (res: any) => void;
};

export const UploadModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files && e.target.files[0];
    setFile(f ?? null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Bitte eine Datei auswählen.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const res = await uploadLookupFile(file, {
        filePath: `/lookups/grail/pm/${file.name}`,
        displayName: fileName,
        description: `Uploaded via Lookup Editor`,
        columns: ['Column1'], // Default column, will be overwritten by actual CSV headers
      });
      setUploading(false);
      onSuccess?.(res);
      onClose();
    } catch (err: any) {
      setUploading(false);
      setError(err?.message ?? 'Upload fehlgeschlagen');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{ background: 'white', padding: 20, width: 480, borderRadius: 6 }}>
        <h3>Lookup-Datei hochladen</h3>
        <p>Wähle eine CSV/TSV/Excel Datei aus, um die Lookup‑Tabelle zu aktualisieren.</p>
        <input type="file" accept=".csv,.tsv,.xlsx,.xls" onChange={handleFileChange} />
        {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} disabled={uploading}>Abbrechen</button>
          <button onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Lädt...' : 'Hochladen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
