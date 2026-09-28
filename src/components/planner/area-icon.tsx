'use client';

import * as React from 'react';
import {
  Folder,
  BookOpen,
  Briefcase,
  Dumbbell,
  Heart,
  Home,
} from 'lucide-react';

interface AreaIconProps {
  icon?: string | null;
  className?: string;
}

export function AreaIcon({ icon, className = 'h-3.5 w-3.5' }: AreaIconProps) {
  switch (icon) {
    case 'book':
      return <BookOpen className={className} />;
    case 'briefcase':
      return <Briefcase className={className} />;
    case 'dumbbell':
      return <Dumbbell className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'home':
      return <Home className={className} />;
    case 'folder':
    default:
      return <Folder className={className} />;
  }
}
