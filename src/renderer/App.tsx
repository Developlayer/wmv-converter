import React, { useState, useEffect, useCallback } from 'react';
import DropZone from './components/DropZone';
import FileQueue from './components/FileQueue';
import ProgressBar from './components/ProgressBar';
import SettingsModal from './components/SettingsModal';
import { useConversion } from './hooks/useConversion';
import type { ConversionSettings, FileInfo } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

declare global {
  interface Window {
    electronAPI: {
      selectFiles: () => Promise<string[]>;
      selectOutputDir: () => Promise<string | null>;
      startConversion: (files: FileInfo[], outputDir: string, settings: ConversionSettings) => Promise<void>;
      cancelConversion: () => Promise<void>;
      getSettings: () => Promise<ConversionSettings>;
      saveSettings: (settings: ConversionSettings) => Promise<void>;
      onProgress: (callback: (progress: { fileId: string; progress: number }) => void) => () => void;
      onComplete: (callback: (result: { success: boolean; inputPath: string; outputPath?: string }) => void) => () => void;
      onError: (callback: (error: { fileId: string; error: string }) => void) => () => void;
    };
  }
}

function App() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [outputDir, setOutputDir] = useState<string>('');
  const [settings, setSettings] = useState<ConversionSettings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const { startConversion, cancelConversion, overallProgress, currentFileId } = useConversion(
    files,
    setFiles,
    setIsConverting
  );

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.electronAPI.getSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
      }
    };
    loadSettings();
  }, []);

  // ファイルを追加
  const handleFilesAdded = useCallback((filePaths: string[]) => {
    const newFiles: FileInfo[] = filePaths.map((filePath) => ({
      id: crypto.randomUUID(),
      path: filePath,
      name: filePath.split('/').pop() || filePath.split('\\').pop() || filePath,
      size: 0, // ファイルサイズは後で取得
      status: 'pending',
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...newFiles]);

    // 最初のファイルの親ディレクトリをデフォルト出力先に設定
    if (filePaths.length > 0 && !outputDir) {
      const firstFilePath = filePaths[0];
      const dirPath = firstFilePath.substring(0, firstFilePath.lastIndexOf('/')) ||
                      firstFilePath.substring(0, firstFilePath.lastIndexOf('\\'));
      setOutputDir(dirPath);
    }
  }, [outputDir]);

  // ファイル選択ダイアログを開く
  const handleSelectFiles = async () => {
    const filePaths = await window.electronAPI.selectFiles();
    if (filePaths.length > 0) {
      handleFilesAdded(filePaths);
    }
  };

  // 出力先を選択
  const handleSelectOutputDir = async () => {
    const dir = await window.electronAPI.selectOutputDir();
    if (dir) {
      setOutputDir(dir);
    }
  };

  // ファイルを削除
  const handleRemoveFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // 全てのファイルをクリア
  const handleClearAll = () => {
    setFiles([]);
  };

  // 変換開始
  const handleStartConversion = async () => {
    if (files.length === 0 || !outputDir) return;
    await startConversion(outputDir, settings);
  };

  // 変換キャンセル
  const handleCancelConversion = async () => {
    await cancelConversion();
  };

  // 設定を保存
  const handleSaveSettings = async (newSettings: ConversionSettings) => {
    setSettings(newSettings);
    await window.electronAPI.saveSettings(newSettings);
    setIsSettingsOpen(false);
  };

  const pendingFiles = files.filter((f) => f.status === 'pending' || f.status === 'converting');
  const completedFiles = files.filter((f) => f.status === 'completed');
  const hasErrors = files.some((f) => f.status === 'error');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">WMV Converter</h1>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            disabled={isConverting}
          >
            ⚙ 設定
          </button>
        </div>

        {/* ドロップゾーン */}
        <DropZone onFilesAdded={handleFilesAdded} onSelectFiles={handleSelectFiles} disabled={isConverting} />

        {/* ファイルキュー */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-700">変換キュー</h2>
              {!isConverting && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-red-500 hover:text-red-700"
                >
                  すべてクリア
                </button>
              )}
            </div>
            <FileQueue
              files={files}
              onRemoveFile={handleRemoveFile}
              disabled={isConverting}
              currentFileId={currentFileId}
            />
          </div>
        )}

        {/* 全体の進捗 */}
        {isConverting && (
          <div className="mt-6">
            <ProgressBar progress={overallProgress} label="全体の進捗" />
          </div>
        )}

        {/* 出力先 */}
        {files.length > 0 && (
          <div className="mt-6 flex items-center gap-4">
            <span className="text-gray-600">出力先:</span>
            <span className="flex-1 text-gray-800 truncate bg-white px-3 py-2 rounded border">
              {outputDir || '未選択'}
            </span>
            <button
              onClick={handleSelectOutputDir}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              disabled={isConverting}
            >
              変更
            </button>
          </div>
        )}

        {/* アクションボタン */}
        {files.length > 0 && (
          <div className="mt-6 flex justify-end gap-4">
            {isConverting ? (
              <button
                onClick={handleCancelConversion}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
              >
                キャンセル
              </button>
            ) : (
              <button
                onClick={handleStartConversion}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={pendingFiles.length === 0 || !outputDir}
              >
                変換開始
              </button>
            )}
          </div>
        )}

        {/* 完了メッセージ */}
        {!isConverting && completedFiles.length > 0 && (
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-700">
              {completedFiles.length}件のファイルの変換が完了しました
              {hasErrors && ' (一部エラーあり)'}
            </p>
          </div>
        )}

        {/* 設定モーダル */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={handleSaveSettings}
        />
      </div>
    </div>
  );
}

export default App;
