// 変換設定の型定義
export interface ConversionSettings {
  // 映像設定
  videoCodec: VideoCodec;
  resolution: Resolution;
  frameRate: FrameRate;
  videoBitrate: number; // Mbps

  // 音声設定
  audioBitrate: AudioBitrate;

  // その他設定
  showNotification: boolean;
  moveToTrashAfterConversion: boolean;
}

// 映像コーデックオプション（仕様書2.2章: WMV1 / WMV2）
export type VideoCodec = 'wmv1' | 'wmv2';

// 解像度プリセット
export type Resolution =
  | '3840x2160' // 4K
  | '1920x1080' // 1080p
  | '1280x720'  // 720p
  | '854x480';  // 480p

// フレームレートオプション
export type FrameRate = 23.976 | 25 | 29.97 | 30 | 60;

// 音声ビットレートオプション
export type AudioBitrate = 64 | 128 | 192 | 256;

// ファイル情報
export interface FileInfo {
  id: string;
  path: string;
  name: string;
  size: number; // bytes
  status: FileStatus;
  progress: number; // 0-100
  error?: string;
}

// ファイルステータス
export type FileStatus = 'pending' | 'converting' | 'completed' | 'error';

// 変換結果
export interface ConversionResult {
  success: boolean;
  inputPath: string;
  outputPath?: string;
  error?: string;
}

// 進捗情報
export interface ProgressInfo {
  fileId: string;
  progress: number;
  currentTime?: string;
  duration?: string;
}

// デフォルト設定（仕様書の付録参照）
export const DEFAULT_SETTINGS: ConversionSettings = {
  videoCodec: 'wmv2',  // WMV2 (WMV Ver.8) がデフォルト
  resolution: '1920x1080',
  frameRate: 29.97,
  videoBitrate: 8,
  audioBitrate: 128,
  showNotification: true,
  moveToTrashAfterConversion: false,
};

// 映像コーデックラベル
export const VIDEO_CODEC_LABELS: Record<VideoCodec, string> = {
  'wmv1': 'WMV1 (WMV Ver.7)',
  'wmv2': 'WMV2 (WMV Ver.8)',
};

// 解像度ラベル
export const RESOLUTION_LABELS: Record<Resolution, string> = {
  '3840x2160': '3840x2160 (4K)',
  '1920x1080': '1920x1080 (1080p)',
  '1280x720': '1280x720 (720p)',
  '854x480': '854x480 (480p)',
};

// フレームレートラベル
export const FRAME_RATE_LABELS: Record<FrameRate, string> = {
  23.976: '23.976 fps',
  25: '25 fps',
  29.97: '29.97 fps',
  30: '30 fps',
  60: '60 fps',
};

// 音声ビットレートラベル
export const AUDIO_BITRATE_LABELS: Record<AudioBitrate, string> = {
  64: '64 kbps',
  128: '128 kbps',
  192: '192 kbps',
  256: '256 kbps',
};

// サポートする入力形式
export const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];

// IPC チャンネル名
export const IPC_CHANNELS = {
  SELECT_FILES: 'select-files',
  SELECT_OUTPUT_DIR: 'select-output-dir',
  START_CONVERSION: 'start-conversion',
  CANCEL_CONVERSION: 'cancel-conversion',
  CONVERSION_PROGRESS: 'conversion-progress',
  CONVERSION_COMPLETE: 'conversion-complete',
  CONVERSION_ERROR: 'conversion-error',
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',
  SHOW_NOTIFICATION: 'show-notification',
} as const;
