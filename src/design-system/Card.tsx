import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'glass' | 'glowing';
  elevateOnHover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'standard',
  elevateOnHover = false,
  children,
  className = '',
  ...props
}) => {
  const cardClasses = [
    'card',
    variant === 'glass' ? 'card-glass' : '',
    variant === 'glowing' ? 'card-glowing' : '',
    elevateOnHover ? 'card-hover-elevate' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};
