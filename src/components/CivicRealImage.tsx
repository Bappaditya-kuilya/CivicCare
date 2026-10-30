import React, { useState, useEffect } from 'react';
import { IssueCategory } from '../types';
import {
  getRealPhotoForCategory,
  getFallbackPhotoForCategory,
} from '../lib/syntheticAssets';

interface CivicRealImageProps {
  category: IssueCategory;
  photoUrl?: string | null;
  alt: string;
  className?: string;
}

/**
 * Generates an offline-resilient photographic canvas texture if both primary and secondary
 * internet photo CDNs are unreachable on a restricted connection.
 */
function buildOfflinePhotographicCanvas(category: IssueCategory, label: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 520;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const palettes: Record<IssueCategory, [string, string, string]> = {
      Road: ['#1e2229', '#374151', '#f59e0b'],
      Water: ['#0c2d48', '#145da0', '#38bdf8'],
      Electricity: ['#1f1d36', '#3f3351', '#fbbf24'],
      Sanitation: ['#1b2e20', '#2d4a34', '#34d399'],
      Other: ['#27272a', '#3f3f46', '#a78bfa'],
    };

    const [bg1, bg2, accent] = palettes[category] || palettes.Road;
    const grad = ctx.createLinearGradient(0, 0, 800, 520);
    grad.addColorStop(0, bg1);
    grad.addColorStop(1, bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 520);

    // Subtle photographic grain & field grid
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 400; i++) {
      const x = (i * 97) % 800;
      const y = (i * 53) % 520;
      ctx.fillRect(x, y, 3, 3);
    }

    // Horizon / road / infrastructure silhouette
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, 360);
    ctx.lineTo(800, 320);
    ctx.lineTo(800, 520);
    ctx.lineTo(0, 520);
    ctx.closePath();
    ctx.fill();

    // Accent marker ring
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(400, 230, 54, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`CivicCare Haldia · ${category} Field Capture`, 400, 340);

    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '16px monospace';
    ctx.fillText(label.slice(0, 52), 400, 375);

    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return '';
  }
}

export const CivicRealImage: React.FC<CivicRealImageProps> = ({
  category,
  photoUrl,
  alt,
  className = 'w-full h-full object-cover',
}) => {
  const primarySrc = getRealPhotoForCategory(category, photoUrl);
  const secondarySrc = getFallbackPhotoForCategory(category);
  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc);
  const [fallbackStage, setFallbackStage] = useState<number>(0);

  useEffect(() => {
    setCurrentSrc(getRealPhotoForCategory(category, photoUrl));
    setFallbackStage(0);
  }, [category, photoUrl]);

  const handleImageError = () => {
    if (fallbackStage === 0 && currentSrc !== secondarySrc) {
      setFallbackStage(1);
      setCurrentSrc(secondarySrc);
    } else if (fallbackStage <= 1) {
      setFallbackStage(2);
      const offlineDataUrl = buildOfflinePhotographicCanvas(category, alt);
      if (offlineDataUrl) {
        setCurrentSrc(offlineDataUrl);
      }
    }
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={handleImageError}
      className={className}
    />
  );
};
