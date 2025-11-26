export type UploadOptions = {
  lookupField?: string;
  filePath: string;
  displayName?: string;
  description?: string;
  columns: string[];
};

export type UploadResult = {
  success: boolean;
  message?: string;
  details?: any;
};

// Uploads a lookup file to the Grail resource API using the current browser session.
// Assumes the app is embedded in Dynatrace and the user is already authenticated.
export async function uploadLookupFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const url = new URL('/platform/storage/resource-store/v1/files/tabular/lookup:upload', window.location.origin).toString();

  // Generate parsePattern from columns: LD:col1',' LD:col2',' ...
  const parsePattern = options.columns
    .map((col, idx) => `LD:${col}${idx < options.columns.length - 1 ? '\',\'' : ''}`)
    .join(' ');

  const requestBody = {
    lookupField: options.lookupField || options.columns[0] || 'id',
    filePath: options.filePath,
    overwrite: true,
    displayName: options.displayName || options.filePath.split('/').pop()?.replace('.csv', '') || 'Lookup Table',
    skippedRecords: 0,
    autoFlatten: true,
    timezone: 'UTC',
    locale: 'en_US',
    description: options.description || '',
    parsePattern: parsePattern,
  };

  const form = new FormData();
  form.append('content', file);
  form.append('request', JSON.stringify(requestBody));

  const resp = await fetch(url, {
    method: 'POST',
    body: form,
    credentials: 'include',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => undefined);
    throw new Error(`Upload failed (${resp.status})${text ? `: ${text}` : ''}`);
  }

  const json = await resp.json().catch(() => undefined);

  return {
    success: true,
    message: resp.statusText,
    details: json,
  };
}

// Deletes a lookup file from the Grail resource API using the current browser session.
export async function deleteLookupFile(filePath: string): Promise<UploadResult> {
  const url = new URL('/platform/storage/resource-store/v1/files:delete', window.location.origin).toString();

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath }),
    credentials: 'include',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => undefined);
    throw new Error(`Delete failed (${resp.status})${text ? `: ${text}` : ''}`);
  }

  const json = await resp.json().catch(() => undefined);

  return {
    success: true,
    message: resp.statusText,
    details: json,
  };
}
