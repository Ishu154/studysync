import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { RootState } from '../store';
import { setZoom, setPan } from '../store/whiteboardSlice';

const BottomBar: React.FC = () => {
  const dispatch = useDispatch();
  const { zoom } = useSelector((state: RootState) => state.whiteboard.canvas);

  const handleZoomIn = () => {
    dispatch(setZoom(Math.min(4, zoom * 1.2)));
  };

  const handleZoomOut = () => {
    dispatch(setZoom(Math.max(0.25, zoom / 1.2)));
  };

  const handleZoomReset = () => {
    dispatch(setZoom(1));
    dispatch(setPan({ x: 0, y: 0 }));
  };

  const handleFitToScreen = () => {
    dispatch(setZoom(1));
    dispatch(setPan({ x: 0, y: 0 }));
  };

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 px-4 py-2 flex items-center gap-4 z-20">
      {/* Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.25}
          className={`p-2 rounded-lg transition-all duration-200 ${zoom <= 0.25
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>

        <button
          onClick={handleZoomReset}
          className="px-4 py-2 text-sm font-mono text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 min-w-[60px]"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          onClick={handleZoomIn}
          disabled={zoom >= 4}
          className={`p-2 rounded-lg transition-all duration-200 ${zoom >= 4
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
            }`}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* View Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleFitToScreen}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          title="Fit to Screen"
        >
          <Maximize2 size={16} />
        </button>

        <button
          onClick={handleZoomReset}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
          title="Reset View"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};

export default BottomBar;