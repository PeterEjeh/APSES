import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import axios from 'axios';

export default function DocumentViewer({ fileUrl, title }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPdf = fileUrl?.toLowerCase().endsWith('.pdf');
  const isDocx = fileUrl?.toLowerCase().endsWith('.docx');
  const isDoc = fileUrl?.toLowerCase().endsWith('.doc');

  useEffect(() => {
    if (!fileUrl) return;

    if (isDocx) {
      loadDocx(fileUrl);
    } else {
      setError('');
      setLoading(false);
    }
  }, [fileUrl, isDocx]);

  async function loadDocx(url) {
    setLoading(true);
    setError('');

    try {
      // Fetch binary arrayBuffer
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          Authorization: localStorage.getItem('apses_token')
            ? `Bearer ${localStorage.getItem('apses_token')}`
            : undefined
        }
      });

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        await renderAsync(response.data, containerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: true,
          ignoreHeight: false,
          breakPages: true,
          className: 'docx-preview-doc'
        });
      }
    } catch (err) {
      console.error('Error rendering DOCX file:', err);
      setError('Unable to preview DOCX directly in browser. You can still open/download the file below.');
    } finally {
      setLoading(false);
    }
  }

  if (!fileUrl) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        No document URL provided.
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={fileUrl}
        title={title || 'Document Preview'}
        width="100%"
        height="100%"
        style={{ border: 'none', width: '100%', height: '100%', minHeight: '450px' }}
      />
    );
  }

  if (isDocx) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontSize: '1.8rem', animation: 'spin 1.5s infinite linear' }}>⏳</div>
            <span>Rendering Microsoft Word Document (.docx)...</span>
          </div>
        )}

        {error && (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <div className="alert alert-error" style={{ display: 'inline-block', maxWidth: '500px', textAlign: 'left', marginBottom: '1rem' }}>
              {error}
            </div>
            <div>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                Download Word Document
              </a>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            background: '#ffffff',
            display: loading || error ? 'none' : 'block'
          }}
        />
      </div>
    );
  }

  // Legacy .doc format or other formats
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
      <h4 style={{ color: 'var(--brand-primary)', marginBottom: '0.5rem' }}>
        {isDoc ? 'Legacy Word Document (.doc)' : 'File Preview'}
      </h4>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '450px', margin: '0 auto 1.25rem' }}>
        {isDoc
          ? 'Older binary (.doc) files cannot be rendered natively in web browsers without conversion. You can open and view it in Microsoft Word.'
          : 'This file format cannot be displayed directly in the web preview.'}
      </p>
      <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary" download>
        Download / Open Document
      </a>
    </div>
  );
}
