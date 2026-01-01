import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Business } from '../../types';

interface BusinessHeaderProps {
  business: Business;
  statusConfig: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  };
}

export function BusinessHeader({
  business,
  statusConfig,
}: BusinessHeaderProps) {
  const navigate = useNavigate();
  const StatusIcon = statusConfig.icon;

  return (
    <div className='flex items-center gap-4'>
      <button
        onClick={() => navigate('/businesses')}
        className='rounded-lg p-2 hover:bg-muted transition-colors'
      >
        <ArrowLeft className='h-5 w-5' />
      </button>

      <div className='flex-1'>
        <h1 className='text-2xl font-bold'>{business.name}</h1>
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium ${statusConfig.className}`}
      >
        <StatusIcon className='h-4 w-4' />
        {statusConfig.label}
      </div>
    </div>
  );
}
