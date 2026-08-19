import React from 'react';
import { UploadCloud, FileText, Trash2 } from 'lucide-react';

const TenderFileDropzone = ({
  title,
  subtitle,
  category,
  files,
  fileInputRef,
  onFilesSelected,
  onRemoveFile,
}) => {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', color: '#1e293b', marginBottom: '0.4rem' }}>
        {title}
      </label>

      <div
        className="file-upload-box mb-2"
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        style={{
          border: '2px dashed var(--pk-primary)',
          backgroundColor: 'var(--pk-primary-light)',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(e.target.files, category);
            }
          }}
        />
        <UploadCloud size={28} color="var(--pk-primary)" style={{ marginBottom: '0.3rem' }} />
        <div><strong style={{ fontSize: '0.9rem', color: 'var(--pk-primary)' }}>Нажмите для выбора файлов</strong></div>
        <div className="text-sec" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>{subtitle}</div>
      </div>

      {files && files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '0.4rem 0.75rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <FileText size={16} color="#64748b" />
                <span style={{ fontWeight: 600, color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {file.name}
                </span>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({file.size})</span>
              </div>
              <button
                type="button"
                className="btn btn-link text-danger p-0"
                onClick={() => onRemoveFile(file.id, category)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TenderFileDropzone;
