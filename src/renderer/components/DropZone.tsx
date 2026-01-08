import React, { useState, useCallback } from 'react';
import { SUPPORTED_EXTENSIONS } from '../../shared/types';

interface DropZoneProps {
  onFilesAdded: (filePaths: string[]) => void;
  onSelectFiles: () => void;
  disabled?: boolean;
}

function DropZone({ onFilesAdded, onSelectFiles, disabled = false }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(ext);
    });

    if (validFiles.length > 0) {
      // Electronのdrop eventからファイルパスを取得
      const filePaths = validFiles.map((file) => (file as any).path);
      onFilesAdded(filePaths);
    }
  }, [disabled, onFilesAdded]);

  return (
    <div
      className={`
        border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
        ${isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={disabled ? undefined : onSelectFiles}
    >
      <div className="text-gray-500">
        <div className="text-4xl mb-4">📁</div>
        <p className="text-lg mb-2">
          ファイルをドラッグ&ドロップ
        </p>
        <p className="text-gray-400 mb-4">または</p>
        <button
          className={`
            px-6 py-2 bg-blue-500 text-white rounded-lg transition-colors
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}
          `}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onSelectFiles();
          }}
        >
          ファイルを選択
        </button>
        <p className="text-xs text-gray-400 mt-4">
          対応形式: MP4, MOV, AVI, MKV, WebM, FLV, WMV
        </p>
      </div>
    </div>
  );
}

export default DropZone;
