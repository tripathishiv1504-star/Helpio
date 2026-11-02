import React from 'react';

export function EmptyState({
  icon = '🔍',
  title = 'No items found',
  description = 'There are no items to display at this time.',
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 ${className}`}
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}

export default EmptyState;
