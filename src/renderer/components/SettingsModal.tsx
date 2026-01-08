import React, { useState, useEffect } from 'react';
import type { ConversionSettings, VideoCodec, Resolution, FrameRate, AudioBitrate } from '../../shared/types';
import { DEFAULT_SETTINGS, VIDEO_CODEC_LABELS, RESOLUTION_LABELS, FRAME_RATE_LABELS, AUDIO_BITRATE_LABELS } from '../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversionSettings;
  onSave: (settings: ConversionSettings) => void;
}

function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ConversionSettings>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
  };

  const videoCodecs: VideoCodec[] = ['wmv1', 'wmv2'];
  const resolutions: Resolution[] = ['3840x2160', '1920x1080', '1280x720', '854x480'];
  const frameRates: FrameRate[] = [23.976, 25, 29.97, 30, 60];
  const audioBitrates: AudioBitrate[] = [64, 128, 192, 256];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        {/* ヘッダー */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 設定内容 */}
        <div className="px-6 py-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* 映像設定 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-4">映像設定</h3>

            {/* 映像コーデック（仕様書2.2章） */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">映像コーデック</label>
              <select
                value={localSettings.videoCodec}
                onChange={(e) => setLocalSettings({ ...localSettings, videoCodec: e.target.value as VideoCodec })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videoCodecs.map((codec) => (
                  <option key={codec} value={codec}>{VIDEO_CODEC_LABELS[codec]}</option>
                ))}
              </select>
            </div>

            {/* 解像度 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">解像度</label>
              <select
                value={localSettings.resolution}
                onChange={(e) => setLocalSettings({ ...localSettings, resolution: e.target.value as Resolution })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {resolutions.map((res) => (
                  <option key={res} value={res}>{RESOLUTION_LABELS[res]}</option>
                ))}
              </select>
            </div>

            {/* フレームレート */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">フレームレート</label>
              <select
                value={localSettings.frameRate}
                onChange={(e) => setLocalSettings({ ...localSettings, frameRate: parseFloat(e.target.value) as FrameRate })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {frameRates.map((rate) => (
                  <option key={rate} value={rate}>{FRAME_RATE_LABELS[rate]}</option>
                ))}
              </select>
            </div>

            {/* ビットレート */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                映像ビットレート: {localSettings.videoBitrate} Mbps
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={localSettings.videoBitrate}
                onChange={(e) => setLocalSettings({ ...localSettings, videoBitrate: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1 Mbps</span>
                <span>20 Mbps</span>
              </div>
            </div>
          </div>

          {/* 音声設定 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-4">音声設定</h3>

            {/* 音声ビットレート */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">音声ビットレート</label>
              <select
                value={localSettings.audioBitrate}
                onChange={(e) => setLocalSettings({ ...localSettings, audioBitrate: parseInt(e.target.value) as AudioBitrate })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {audioBitrates.map((rate) => (
                  <option key={rate} value={rate}>{AUDIO_BITRATE_LABELS[rate]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* その他設定 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-4">その他</h3>

            {/* 通知設定 */}
            <label className="flex items-center gap-3 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.showNotification}
                onChange={(e) => setLocalSettings({ ...localSettings, showNotification: e.target.checked })}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">変換完了後に通知を表示</span>
            </label>

            {/* 元ファイル削除設定 */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.moveToTrashAfterConversion}
                onChange={(e) => setLocalSettings({ ...localSettings, moveToTrashAfterConversion: e.target.checked })}
                className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">変換完了後に元ファイルをゴミ箱に移動</span>
            </label>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-between px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            デフォルトに戻す
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
