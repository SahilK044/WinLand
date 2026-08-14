import React from 'react';
import { Mic, User } from 'lucide-react';

export default function DiscordWidget({ data }) {
  if (!data) return null;

  const isSpeaking = data.speaking;
  const ringColor = isSpeaking ? '#43b581' : '#ffffff33';

  return (
    <div className="activity-expanded discord-expanded">
      <div 
        className="discord-avatar-wrapper"
        style={{
          boxShadow: isSpeaking ? `0 0 12px ${ringColor}` : 'none',
          borderColor: ringColor
        }}
      >
        {/* Placeholder avatar, normally we would fetch the user's avatar from Discord API if we had the ID */}
        <User size={24} color="#fff" />
      </div>
      <div className="discord-info">
        <div className="discord-title">Discord Voice</div>
        <div className="discord-subtitle">{isSpeaking ? 'Someone is speaking...' : 'Voice Connected'}</div>
      </div>
      <div className="discord-status-icon">
        <Mic size={20} color={isSpeaking ? '#43b581' : '#fff'} />
      </div>
    </div>
  );
}
