import React, { useState, useEffect } from 'react';
import { FileText, File, Trash2, HardDrive } from 'lucide-react';

const CustomFolderIcon = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}>
    <defs>
      <linearGradient id="folderTabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffe082" />
        <stop offset="100%" stopColor="#ffb300" />
      </linearGradient>
      <linearGradient id="folderBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffc107" />
        <stop offset="100%" stopColor="#ff8f00" />
      </linearGradient>
    </defs>
    {/* Tab Back */}
    <path d="M4 8C4 6.89543 4.89543 6 6 6H13.1716C13.702 6 14.2107 6.21071 14.5858 6.58579L17.4142 9.41421C17.7893 9.78929 18.298 10 18.8284 10H30C31.1046 10 32 10.8954 32 12V27C32 28.1046 31.1046 29 30 29H6C4.89543 29 4 28.1046 4 27V8Z" fill="url(#folderTabGrad)" />
    {/* Front Flap */}
    <path d="M4 13C4 11.8954 4.89543 11 6 11H30C31.1046 11 32 11.8954 32 13V27C32 28.1046 31.1046 29 30 29H6C4.89543 29 4 28.1046 4 27V13Z" fill="url(#folderBodyGrad)" />
    <path d="M4 14H32" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
  </svg>
);

const ShelfTileItem = ({ item, idx, onOpenItem, onRemoveItem }) => {
  const [liveIcon, setLiveIcon] = useState(item.iconUrl || null);

  useEffect(() => {
    let isMounted = true;
    if (!item.iconUrl && item.type !== 'folder' && !item.type?.includes('folder') && item.path && window.electronAPI?.getFileIcon) {
      window.electronAPI.getFileIcon(item.path).then((url) => {
        if (isMounted && url) {
          setLiveIcon(url);
        }
      }).catch(() => {});
    }
    return () => { isMounted = false; };
  }, [item.path, item.type, item.iconUrl]);

  const renderVisual = () => {
    if (item.type === 'folder' || item.type?.includes('folder')) {
      return <CustomFolderIcon size={32} />;
    }
    if (liveIcon) {
      return (
        <img
          src={liveIcon}
          alt={item.name}
          style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
        />
      );
    }
    if (item.type?.startsWith('text/')) {
      return <FileText size={26} color="var(--ok)" />;
    }
    return <File size={26} color="var(--text-2)" />;
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onOpenItem?.(item);
      }}
      className="shelf-tile-card"
      style={{
        position: 'relative',
        height: 86,
        padding: '8px 6px',
        background: 'rgba(255, 255, 255, 0.07)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 12,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxSizing: 'border-box',
        transition: 'background 0.2s ease, transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 34 }}>
        {renderVisual()}
      </div>

      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#ffffff',
          textAlign: 'center',
          width: '100%',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: '0 4px',
          boxSizing: 'border-box',
        }}
        title={item.name || item.text}
      >
        {item.name || item.text || `Item ${idx + 1}`}
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemoveItem?.(idx);
        }}
        className="tile-trash-btn"
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'rgba(0, 0, 0, 0.6)',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          transition: 'background 0.2s ease, color 0.2s ease',
        }}
        title="Remove item"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
};

export default function ShelfWidget({ isCompact, shelvedItems = [], onRemoveItem, onClearAll, onOpenItem }) {
  if (isCompact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HardDrive size={14} color="var(--text-2)" />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Shelf</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
          {shelvedItems.length} {shelvedItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '12px 14px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HardDrive size={15} color="var(--text-1)" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Shelf</div>
            <div style={{ fontSize: 10, color: 'var(--text-2)' }}>
              {shelvedItems.length > 0 ? `${shelvedItems.length} held ${shelvedItems.length === 1 ? 'item' : 'items'}` : 'Drop files here to hold them'}
            </div>
          </div>
        </div>

        {shelvedItems.length > 0 && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClearAll?.();
            }}
            style={{
              position: 'relative',
              zIndex: 100,
              pointerEvents: 'auto',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: 8,
              padding: '5px 10px',
              color: 'var(--text-1)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'background 0.2s ease, border-color 0.2s ease',
            }}
          >
            <Trash2 size={12} style={{ pointerEvents: 'none' }} />
            <span style={{ pointerEvents: 'none' }}>Clear</span>
          </button>
        )}
      </div>

      {/* Grid Tile Format Content Area */}
      {shelvedItems.length === 0 ? (
        <div style={{
          flex: 1, margin: '6px 0', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6,
          border: '1px dashed var(--glass-border-hover)', borderRadius: 12,
          color: 'var(--text-3)', fontSize: 11, fontWeight: 600,
        }}>
          <HardDrive size={18} color="var(--text-3)" />
          <span>Drag files or shortcuts onto the island</span>
        </div>
      ) : (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          margin: '4px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          padding: '2px 0',
          scrollbarWidth: 'none',
        }}>
          {shelvedItems.map((item, idx) => (
            <ShelfTileItem
              key={item.path || idx}
              item={item}
              idx={idx}
              onOpenItem={onOpenItem}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
