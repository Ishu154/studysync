import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const ConnectionStatus: React.FC = () => {
  const { connectionStatus } = useSelector((state: RootState) => state.whiteboard);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected - Real-time collaboration active';
      case 'connecting':
        return 'Connecting to server...';
      case 'disconnected':
        return 'Disconnected - Working offline';
      default:
        return 'Connection status unknown';
    }
  };

  return (
    <div className="fixed top-4 left-4 z-30 group">
      {/* Status Dot */}
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse cursor-pointer`} />

      {/* Hover Tooltip */}
      <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 animate-fadeIn">
        {getStatusText()}
        <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900" />
      </div>
    </div>
  );
};

export default ConnectionStatus;