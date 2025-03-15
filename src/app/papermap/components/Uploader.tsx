import React, { useState } from 'react';

// Interface for the FileUploader props
interface UploaderProps {
  onFileUpload: (file: File) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const Uploader: React.FC<UploaderProps> = ({ onFileUpload, loading, error }) => {
  // Handle file upload
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await onFileUpload(file);
  };

  return (
    <div className="flex-1">
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-full file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
      />
      {loading && <p className="mt-2 text-blue-600">Analyzing paper...</p>}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
};

export default Uploader; 