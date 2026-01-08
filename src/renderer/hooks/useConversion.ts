import { useState, useEffect, useCallback } from 'react';
import type { FileInfo, ConversionSettings, ProgressInfo, ConversionResult } from '../../shared/types';

export function useConversion(
  files: FileInfo[],
  setFiles: React.Dispatch<React.SetStateAction<FileInfo[]>>,
  setIsConverting: React.Dispatch<React.SetStateAction<boolean>>
) {
  const [currentFileId, setCurrentFileId] = useState<string | undefined>();
  const [overallProgress, setOverallProgress] = useState(0);

  // 進捗イベントのリスナー
  useEffect(() => {
    const unsubProgress = window.electronAPI.onProgress((progress: ProgressInfo) => {
      setCurrentFileId(progress.fileId);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === progress.fileId
            ? { ...f, status: 'converting', progress: progress.progress }
            : f
        )
      );

      // 全体の進捗を計算
      setFiles((prev) => {
        const totalFiles = prev.filter((f) => f.status !== 'completed' && f.status !== 'error').length;
        const completedCount = prev.filter((f) => f.status === 'completed').length;
        const currentProgress = progress.progress / 100;
        const overall = ((completedCount + currentProgress) / (totalFiles + completedCount)) * 100;
        setOverallProgress(overall);
        return prev;
      });
    });

    const unsubComplete = window.electronAPI.onComplete((result: ConversionResult) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.path === result.inputPath
            ? { ...f, status: 'completed', progress: 100 }
            : f
        )
      );
    });

    const unsubError = window.electronAPI.onError((error: { fileId: string; error: string }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === error.fileId
            ? { ...f, status: 'error', error: error.error }
            : f
        )
      );
    });

    return () => {
      unsubProgress();
      unsubComplete();
      unsubError();
    };
  }, [setFiles]);

  // 変換開始
  const startConversion = useCallback(
    async (outputDir: string, settings: ConversionSettings) => {
      const pendingFiles = files.filter((f) => f.status === 'pending');
      if (pendingFiles.length === 0) return;

      setIsConverting(true);
      setOverallProgress(0);

      try {
        await window.electronAPI.startConversion(pendingFiles, outputDir, settings);
      } catch (error) {
        console.error('変換エラー:', error);
      } finally {
        setIsConverting(false);
        setCurrentFileId(undefined);
        setOverallProgress(100);
      }
    },
    [files, setIsConverting]
  );

  // 変換キャンセル
  const cancelConversion = useCallback(async () => {
    try {
      await window.electronAPI.cancelConversion();
    } catch (error) {
      console.error('キャンセルエラー:', error);
    } finally {
      setIsConverting(false);
      setCurrentFileId(undefined);
    }
  }, [setIsConverting]);

  return {
    startConversion,
    cancelConversion,
    overallProgress,
    currentFileId,
  };
}
