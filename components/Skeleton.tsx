
import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div className={`animate-pulse rounded-lg bg-muted/50 ${className}`} />
  );
};

export default Skeleton;
