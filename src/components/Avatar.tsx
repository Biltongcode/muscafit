'use client';

import Image from 'next/image';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

const pxMap = {
  sm: 24,
  md: 32,
  lg: 40,
};

export default function Avatar({ name, avatarUrl, size = 'md', className = '' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = sizeMap[size];
  const px = pxMap[size];

  if (avatarUrl) {
    return (
      <div className={`${sizeClass} relative rounded-full overflow-hidden ring-2 ring-white/20 dark:ring-slate-600/50 flex-shrink-0 ${className}`}>
        <Image
          src={avatarUrl}
          alt={name}
          width={px}
          height={px}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center font-semibold text-white flex-shrink-0 ring-2 ring-white/20 dark:ring-slate-600/50 ${className}`}
    >
      {initials}
    </div>
  );
}
