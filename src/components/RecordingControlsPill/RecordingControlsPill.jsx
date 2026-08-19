import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Square,
  Trash2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  ZoomIn,
  Settings,
  ChevronRight,
  ChevronLeft,
  GripVertical,
} from 'lucide-react';
import useRecordingState from './useRecordingState.js';
import styles from './RecordingControlsPill.module.css';

export default function RecordingControlsPill() {
  const {
    formattedTime,
    isPaused,
    micEnabled,
    webcamEnabled,
    smartFocusEnabled,
    pauseRecording,
    resumeRecording,
    stopRecording,
    discardRecording,
    toggleMic,
    toggleWebcam,
    toggleSmartFocus,
    openSettings,
  } = useRecordingState();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const pillRef = useRef(null);

  // Mouse passthrough management for companion window
  useEffect(() => {
    const handleMouseEnter = () => {
      window.electronAPI?.setIgnoreMouseEvents?.(false);
    };

    const handleMouseLeave = () => {
      if (!showDiscardConfirm) {
        window.electronAPI?.setIgnoreMouseEvents?.(true);
      }
    };

    const pillEl = pillRef.current;
    if (pillEl) {
      pillEl.addEventListener('mouseenter', handleMouseEnter);
      pillEl.addEventListener('mouseleave', handleMouseLeave);
    }

    const handleBlur = () => {
      setShowDiscardConfirm(false);
      window.electronAPI?.setIgnoreMouseEvents?.(true);
    };
    window.addEventListener('blur', handleBlur);

    return () => {
      if (pillEl) {
        pillEl.removeEventListener('mouseenter', handleMouseEnter);
        pillEl.removeEventListener('mouseleave', handleMouseLeave);
      }
      window.removeEventListener('blur', handleBlur);
      window.electronAPI?.setIgnoreMouseEvents?.(true);
    };
  }, [showDiscardConfirm]);

  const handleTogglePause = (e) => {
    e.stopPropagation();
    if (isPaused) {
      resumeRecording();
    } else {
      pauseRecording();
    }
  };

  const handleStop = (e) => {
    e.stopPropagation();
    stopRecording();
  };

  const handleDiscardClick = (e) => {
    e.stopPropagation();
    setShowDiscardConfirm(true);
  };

  const handleConfirmDiscard = (e) => {
    e.stopPropagation();
    setShowDiscardConfirm(false);
    discardRecording();
  };

  const handleCancelDiscard = (e) => {
    e.stopPropagation();
    setShowDiscardConfirm(false);
  };

  return (
    <div className={styles.stage}>
      <motion.div
        ref={pillRef}
        layout
        initial={{ scale: 0.8, opacity: 0, y: -10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: -10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={`${styles.pillContainer} ${isExpanded ? styles.expanded : styles.collapsed}`}
      >
        {/* Left Section: Drag Grip + Status Dot + Timer */}
        <div className={styles.leftSection}>
          <div className={styles.gripHandle}>
            <GripVertical size={13} />
          </div>
          <div
            className={`${styles.statusDot} ${isPaused ? styles.dotPaused : styles.dotRecording}`}
          />
          <span className={styles.timerText}>{formattedTime}</span>
          {isExpanded && (
            <span className={styles.statusLabel}>
              {isPaused ? 'PAUSED' : 'REC'}
            </span>
          )}
        </div>

        <div className={styles.divider} />

        {/* Action Controls */}
        <div className={styles.actionsSection}>
          {/* Pause / Resume Button */}
          <button
            onClick={handleTogglePause}
            className={`${styles.iconButton} ${isPaused ? styles.pauseButton : ''}`}
            title={isPaused ? 'Resume (Click)' : 'Pause (Click)'}
          >
            {isPaused ? (
              <Play size={11} fill="#f59e0b" color="#f59e0b" style={{ marginLeft: 1 }} />
            ) : (
              <Pause size={11} fill="#fff" color="#fff" />
            )}
          </button>

          {/* Stop & Save Button */}
          <button
            onClick={handleStop}
            className={`${styles.iconButton} ${styles.stopButton}`}
            title="Stop & Save Recording"
          >
            <Square size={10} fill="#fff" color="#fff" />
          </button>

          {/* Expanded Secondary Controls */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, originX: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'visible' }}
              >
                {/* Discard Button */}
                <button
                  onClick={handleDiscardClick}
                  className={`${styles.iconButton} ${styles.dangerButton}`}
                  title="Discard Recording"
                >
                  <Trash2 size={12} color="#ff453a" />
                </button>

                <div className={styles.divider} />

                {/* Mic Mute / Unmute Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleMic(); }}
                  className={`${styles.iconButton} ${micEnabled ? styles.activeButton : ''}`}
                  title={micEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
                  style={{ color: micEnabled ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {micEnabled ? <Mic size={12} /> : <MicOff size={12} color="#ff453a" />}
                </button>

                {/* Webcam Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleWebcam(); }}
                  className={`${styles.iconButton} ${webcamEnabled ? styles.activeButton : ''}`}
                  title={webcamEnabled ? 'Disable Webcam Overlay' : 'Enable Webcam Overlay'}
                  style={{ color: webcamEnabled ? '#30d158' : 'rgba(255,255,255,0.4)' }}
                >
                  {webcamEnabled ? <Video size={12} color="#30d158" /> : <VideoOff size={12} />}
                </button>

                {/* Smart Focus Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSmartFocus(); }}
                  className={`${styles.iconButton} ${smartFocusEnabled ? styles.activeButton : ''}`}
                  title={smartFocusEnabled ? 'Smart Focus Active (Click to disable)' : 'Smart Focus Inactive (Click to enable)'}
                  style={{
                    color: smartFocusEnabled ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                    background: smartFocusEnabled ? 'rgba(96, 165, 250, 0.22)' : undefined,
                  }}
                >
                  <ZoomIn size={12} />
                </button>

                {/* Settings Gear */}
                <button
                  onClick={(e) => { e.stopPropagation(); openSettings(); }}
                  className={styles.iconButton}
                  title="WinLand Settings"
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                >
                  <Settings size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand / Collapse Chevron */}
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className={styles.toggleExpandButton}
            title={isExpanded ? 'Collapse Controls' : 'Expand More Controls'}
          >
            {isExpanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>

        {/* Discard Confirmation Popover */}
        {showDiscardConfirm && (
          <div className={styles.confirmPopup}>
            <span className={styles.confirmText}>Discard recording?</span>
            <div className={styles.confirmActions}>
              <button onClick={handleCancelDiscard} className={`${styles.confirmBtn} ${styles.confirmCancelBtn}`}>
                Cancel
              </button>
              <button onClick={handleConfirmDiscard} className={`${styles.confirmBtn} ${styles.confirmDiscardBtn}`}>
                Discard
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
