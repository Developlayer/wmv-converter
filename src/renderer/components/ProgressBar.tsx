import React from 'react';

interface ProgressBarProps {
  progress: number;
  label?: string;
  showLabel?: boolean;
  height?: string;
}

function ProgressBar({
  progress,
  label = '',
  showLabel = true,
  height = 'h-4'
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-medium text-gray-700">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`bg-blue-500 ${height} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
