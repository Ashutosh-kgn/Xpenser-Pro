import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  iconOnly?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  iconOnly = false,
  children,
  className = '',
  ...props
}) => {
  const btnClasses = [
    'btn',
    `btn-${variant}`,
    iconOnly ? 'btn-icon-only' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={btnClasses} {...props}>
      {children}
    </button>
  );
};
