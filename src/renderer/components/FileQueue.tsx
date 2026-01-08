import React from 'react';
import type { FileInfo } from '../../shared/types';
import ProgressBar from './ProgressBar';

interface FileQueueProps {
  files: FileInfo[];
  onRemoveFile: (fileId: string) => void;
  disabled?: boolean;
  currentFileId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getStatusLabel(status: FileInfo['status']): string {
  switch (status) {
    case 'pending':
      return '待機中';
    case 'converting':
      return '変換中';
    case 'completed':
      return '完了';
    case 'error':
      return 'エラー';
    default:
      return '';
  }
}

function getStatusColor(status: FileInfo['status']): string {
  switch (status) {
    case 'pending':
      return 'text-gray-500';
    case 'converting':
      return 'text-blue-500';
    case 'completed':
      return 'text-green-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
}

function FileQueue({ files, onRemoveFile, disabled = false, currentFileId }: FileQueueProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {files.map((file, index) => (
        <div
          key={file.id}
          className={`
            flex items-center gap-4 p-4
            ${index !== files.length - 1 ? 'border-b' : ''}
            ${file.id === currentFileId ? 'bg-blue-50' : ''}
          `}
        >
          {/* ファイルアイコン */}
          <div className="text-2xl">
            {file.status === 'completed' ? '✅' : file.status === 'error' ? '❌' : '🎬'}
          </div>

          {/* ファイル情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 truncate">{file.name}</span>
              {file.size > 0 && (
                <span className="text-sm text-gray-400">{formatFileSize(file.size)}</span>
              )}
            </div>

            {/* 進捗バー（変換中の場合のみ表示） */}
            {file.status === 'converting' && (
              <div className="mt-2">
                <ProgressBar progress={file.progress} showLabel={false} height="h-2" />
              </div>
            )}

            {/* エラーメッセージ */}
            {file.status === 'error' && file.error && (
              <p className="text-sm text-red-500 mt-1">{file.error}</p>
            )}
          </div>

          {/* ステータス */}
          <div className={`text-sm font-medium ${getStatusColor(file.status)}`}>
            {file.status === 'converting' ? `${file.progress}%` : getStatusLabel(file.status)}
          </div>

          {/* 削除ボタン */}
          {!disabled && file.status !== 'converting' && (
            <button
              onClick={() => onRemoveFile(file.id)}
              className="text-gray-400 hover:text-red-500 transition-colors"
              title="削除"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default FileQueue;
