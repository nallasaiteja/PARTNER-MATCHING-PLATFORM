import React from 'react';
import './YouTubeEmbed.css';

interface YouTubeEmbedProps {
  url?: string | null;
  title?: string;
  autoplay?: boolean;
}

/**
 * Safely extracts the YouTube video ID from various supported URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 * 
 * Rejects arbitrary URLs to prevent XSS / malicious iframe injection.
 */
export function extractYouTubeId(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();

  // Pattern strictly checking YouTube domains and alphanumeric video IDs (11 chars)
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;

  const match = trimmed.match(regex);
  return match && match[1] ? match[1] : null;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  url,
  title = 'Platform Video Showcase',
  autoplay = false,
}) => {
  const videoId = extractYouTubeId(url);

  if (!videoId) {
    return (
      <div className="youtube-embed-fallback">
        <span className="fallback-icon">🎬</span>
        <p className="fallback-text">
          {url ? 'Invalid or unsupported YouTube URL format.' : 'No introductory video available.'}
        </p>
      </div>
    );
  }

  // Use privacy-enhanced YouTube-NoCookie domain
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1${
    autoplay ? '&autoplay=1' : ''
  }`;

  return (
    <div className="youtube-embed-responsive">
      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
};
