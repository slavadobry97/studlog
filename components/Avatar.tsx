import React from 'react';
import { Avatar as ShadcnAvatar, AvatarImage, AvatarFallback } from './ui/avatar';

// A consistent, yet varied color palette for initials.
const COLORS = [
  'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-emerald-500'
];

/**
 * Generates a consistent color from a predefined palette based on the input string (e.g., a student's name).
 * @param name The string to hash for color selection.
 * @returns A Tailwind CSS background color class string.
 */
const getColorForName = (name: string): string => {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Ensure 32bit integer
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

/**
 * Extracts initials from a full name.
 * Handles single names, double names, and longer names.
 * @param name The full name string.
 * @returns A string of initials, typically 1-2 characters long.
 */
const getInitials = (name: string): string => {
  if (!name) return '?';
  const nameParts = name.trim().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return '?';
  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  return nameParts
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
};

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  className?: string;
  textClassName?: string;
}

/**
 * A versatile Avatar component that displays an image if a URL is provided,
 * otherwise falls back to displaying the user's initials on a colored background.
 * It also gracefully handles image loading errors by switching to the initials fallback.
 */
const Avatar: React.FC<AvatarProps> = ({ name, avatarUrl, className = 'w-10 h-10', textClassName = 'text-base' }) => {
  const initials = getInitials(name);
  const color = getColorForName(name);

  return (
    <ShadcnAvatar className={className} title={name}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className={`${color} text-white font-bold select-none`}>
        <span className={textClassName}>{initials}</span>
      </AvatarFallback>
    </ShadcnAvatar>
  );
};

export default Avatar;
