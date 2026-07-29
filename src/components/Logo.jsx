import React from 'react';

/** Comic Classifier mark: a panel frame that is also a nib. */
export default function Logo({ size = 34, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="Comic Classifier logo"
    >
      <path
        d="M4.5 5.5 C13 4.2 27 4.6 35.4 5.2 C36 13 36.2 27 35.2 35 C26 35.9 13 35.7 4.8 35 C4 26 4.1 13.6 4.5 5.5 Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* nib */}
      <path d="M13 30 C15.5 21 18.5 14.5 21.5 9.5 C24.5 14.5 27 21 29 30 Z" fill="currentColor" opacity="0.92" />
      <path d="M21.4 20.5 L21.5 30" stroke="#f4f0e6" strokeWidth="1.6" />
      {/* hatch marks */}
      <path d="M8.5 12.5 L12.5 8.6 M8.5 17 L15.5 9.6 M8.6 21.5 L12 17.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
    </svg>
  );
}
