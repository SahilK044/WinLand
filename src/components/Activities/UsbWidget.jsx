import React, { useState } from 'react';

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes) || bytes <= 0) return null;
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

const EjectIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <polygon points="12,3 3,14 21,14" />
    <rect x="3" y="17" width="18" height="3.2" rx="1.6" />
  </svg>
);

const AppleDriveIcon = () => (
  <svg width="30" height="30" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      {/* Outer Case Gradient (Anodized Space Silver / Aluminum) */}
      <linearGradient id="driveBody" x1="0" y1="6" x2="36" y2="30" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="35%" stopColor="#64748B" />
        <stop offset="70%" stopColor="#334155" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>

      {/* Top Specular Rim */}
      <linearGradient id="driveHighlight" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#CBD5E1" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.75" />
      </linearGradient>

      {/* Precision Dark Recessed Face */}
      <linearGradient id="driveFace" x1="0" y1="10" x2="0" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0B1120" />
        <stop offset="100%" stopColor="#1E293B" />
      </linearGradient>

      {/* Classic Apple macOS Removable Media Orange Badge */}
      <linearGradient id="appleDriveStripe" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF9F0A" />
        <stop offset="100%" stopColor="#FF6900" />
      </linearGradient>

      {/* High-Gloss Bevel */}
      <linearGradient id="stripeShine" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* Drive Outer Case */}
    <rect x="3" y="7" width="30" height="22" rx="4.5" fill="url(#driveBody)" stroke="url(#driveHighlight)" strokeWidth="0.9" />

    {/* Precision Dark Recessed Front Face */}
    <rect x="5.5" y="9.5" width="25" height="17" rx="3" fill="url(#driveFace)" stroke="#090D16" strokeWidth="0.6" />

    {/* Apple macOS External Media Orange Indicator Tab */}
    <rect x="7.5" y="11.5" width="4.5" height="13" rx="1.5" fill="url(#appleDriveStripe)" />
    <rect x="7.5" y="11.5" width="2" height="13" rx="1" fill="url(#stripeShine)" />

    {/* High-Tech Drive Data Slot / Activity Vents */}
    <rect x="14.5" y="13.5" width="13.5" height="2.2" rx="1.1" fill="#050811" stroke="#334155" strokeWidth="0.5" />
    <rect x="14.5" y="18" width="8.5" height="2.2" rx="1.1" fill="#050811" stroke="#334155" strokeWidth="0.5" />

    {/* Active Glowing Emerald LED */}
    <circle cx="25.5" cy="19.1" r="1.3" fill="#30D158" />
    <circle cx="25.5" cy="19.1" r="2.8" fill="#30D158" opacity="0.4" />
  </svg>
);

export default function UsbWidget({ data }) {
  const [isEjecting, setIsEjecting] = useState(false);

  if (!data) return null;

  const displayName = data.volumeName && data.volumeName.trim()
    ? data.volumeName.trim()
    : 'USB Flash Drive';

  const totalFormatted = formatBytes(data.size);
  const freeFormatted = formatBytes(data.freeSpace);
  const hasCapacity = Boolean(data.size && data.size > 0);

  let usedRatio = 0;
  if (hasCapacity && data.freeSpace !== undefined) {
    usedRatio = Math.max(0.04, Math.min(1, (data.size - data.freeSpace) / data.size));
  }

  const handleEject = (e) => {
    e.stopPropagation();
    if (isEjecting) return;
    setIsEjecting(true);
    window.electronAPI?.ejectUsb?.(data.deviceId);
  };

  return (
    <div className="usb-premium-container">
      {/* Sleek Brushed Hardware Badge */}
      <div className="usb-hardware-badge">
        <AppleDriveIcon />
      </div>

      {/* Center Metadata & Storage Capacity Gauge */}
      <div className="usb-meta-stack">
        <div className="usb-headline">
          <span className="usb-name" title={`${displayName} (${data.deviceId})`}>
            {displayName}
          </span>
          <span className="usb-drive-tag">{data.deviceId}</span>
        </div>

        <div className="usb-capacity-row">
          {hasCapacity && freeFormatted && totalFormatted ? (
            <>
              <div className="usb-meter-track">
                <div
                  className="usb-meter-fill"
                  style={{ width: `${Math.round(usedRatio * 100)}%` }}
                />
              </div>
              <span className="usb-capacity-text">
                {freeFormatted} free of {totalFormatted}
              </span>
            </>
          ) : (
            <span className="usb-ready-pill">
              <span className="usb-ready-spark" />
              Removable Storage • Ready
            </span>
          )}
        </div>
      </div>

      {/* Apple-style Eject Action Button */}
      <button
        type="button"
        className={`usb-eject-btn ${isEjecting ? 'is-ejecting' : ''}`}
        onClick={handleEject}
        disabled={isEjecting}
        title="Safely remove hardware"
      >
        {isEjecting ? (
          <>
            <span className="usb-eject-spinner" />
            <span>Ejecting…</span>
          </>
        ) : (
          <>
            <EjectIcon />
            <span>Eject</span>
          </>
        )}
      </button>
    </div>
  );
}
