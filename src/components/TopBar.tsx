import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Users, Share, Download, Undo, Redo, X, Copy, Check, Palette, ChevronDown, Save, Maximize, Minimize, Settings, LogOut, Video, VideoOff, Bot, RotateCcw } from 'lucide-react';
import { RootState } from '../store';
import {
  setBackgroundType,
  setBackgroundColor,
  undo,
  redo,
  setRoomId,
  toggleVideoPanel,
  toggleStudyBotPanel
} from '../store/whiteboardSlice';
import { useSocket } from '../hooks/useSocket';
import { BackgroundType } from '../types';

interface TopBarProps {
  onChangeRoom: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onChangeRoom }) => {
  const dispatch = useDispatch();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showRoomMenu, setShowRoomMenu] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [gridLineColor, setGridLineColor] = useState('#e5e7eb');
  const [ruledLineColor, setRuledLineColor] = useState('#d1d5db');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { users, elements, roomId } = useSelector((state: RootState) => state.whiteboard);
  const {
    backgroundColor,
    backgroundType,
    zoom,
    pan
  } = useSelector((state: RootState) => state.whiteboard.canvas);
  const { past, future } = useSelector((state: RootState) => state.whiteboard.history);
  const videoPanelOpen = useSelector((state: RootState) => state.whiteboard.ui?.videoPanelOpen ?? false);
  const studyBotPanelOpen = useSelector((state: RootState) => state.whiteboard.ui?.studyBotPanelOpen ?? false);
  const aiState = useSelector((state: RootState) => state.whiteboard.ai);

  const { undoAI } = useSocket(roomId || 'room-1');

  const backgroundOptions = [
    { type: 'white' as BackgroundType, label: 'White', color: '#FFFFFF' },
    { type: 'black' as BackgroundType, label: 'Black', color: '#000000' },
    { type: 'grid' as BackgroundType, label: 'Grid', color: '#F8F9FA' },
    { type: 'lined' as BackgroundType, label: 'Lined', color: '#FFFFFF' },
    { type: 'custom' as BackgroundType, label: 'Custom', color: backgroundColor },
  ];

  const saveOptions = [
    { format: 'png', label: 'Save as PNG', description: 'High quality image', icon: '🖼️' },
    { format: 'pdf', label: 'Save as PDF', description: 'Document format', icon: '📄' },
    { format: 'svg', label: 'Save as SVG', description: 'Vector graphics', icon: '🎨' },
    { format: 'json', label: 'Save Project', description: 'Complete project data', icon: '💾' },
  ];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.background-dropdown') && !target.closest('.background-button')) {
        setShowBackgroundMenu(false);
      }
      if (!target.closest('.room-dropdown') && !target.closest('.room-button')) {
        setShowRoomMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Enhanced keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+Z or Cmd+Shift+Z for redo
              handleRedo();
            } else {
              // Ctrl+Z or Cmd+Z for undo
              handleUndo();
            }
            break;
          case 'y':
            // Ctrl+Y or Cmd+Y for redo (Windows style)
            e.preventDefault();
            handleRedo();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const handleBackgroundChange = (type: BackgroundType, color?: string) => {
    dispatch(setBackgroundType(type));
    if (color) {
      dispatch(setBackgroundColor(color));
    }
    setShowBackgroundMenu(false);
  };

  const handleCustomColorChange = (color: string) => {
    dispatch(setBackgroundType('custom'));
    dispatch(setBackgroundColor(color));
  };

  const getCanvasDataURL = (format: 'png' | 'jpg' = 'png') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Set canvas size based on content bounds or default size
    canvas.width = 1920;
    canvas.height = 1080;

    // Fill background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid or lines if applicable
    if (backgroundType === 'grid') {
      drawGridOnCanvas(ctx, canvas, 20, gridLineColor);
    } else if (backgroundType === 'lined') {
      drawLinesOnCanvas(ctx, canvas, 30, ruledLineColor);
    }

    // Draw all elements
    elements.forEach((element) => {
      ctx.save();
      ctx.globalAlpha = element.opacity;
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      switch (element.type) {
        case 'pen':
        case 'pencil':
        case 'brush':
          if (element.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(element.points[0].x, element.points[0].y);
            for (let i = 1; i < element.points.length; i++) {
              ctx.lineTo(element.points[i].x, element.points[i].y);
            }
            ctx.stroke();
          }
          break;

        case 'rectangle':
          if (element.points.length >= 2) {
            const [start, end] = element.points;
            const width = end.x - start.x;
            const height = end.y - start.y;
            ctx.strokeRect(start.x, start.y, width, height);
          }
          break;

        case 'circle':
          if (element.points.length >= 2) {
            const [start, end] = element.points;
            const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
            ctx.beginPath();
            ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case 'line':
          if (element.points.length >= 2) {
            const [start, end] = element.points;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
          }
          break;

        case 'arrow':
          if (element.points.length >= 2) {
            const [start, end] = element.points;
            const headLength = 15;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle - Math.PI / 6),
              end.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLength * Math.cos(angle + Math.PI / 6),
              end.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
          }
          break;

        case 'text':
          if (element.text && element.points.length > 0) {
            ctx.font = `${element.fontStyle || 'normal'} ${element.fontWeight || 'normal'} ${element.fontSize || 16}px ${element.fontFamily || 'Arial'}`;
            ctx.textAlign = (element.textAlign || 'left') as CanvasTextAlign;
            ctx.fillText(element.text, element.points[0].x, element.points[0].y);
          }
          break;
      }

      ctx.restore();
    });

    return canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
  };

  const drawGridOnCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gridSize: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const drawLinesOnCanvas = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, lineSpacing: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    for (let y = 0; y < canvas.height; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    ctx.restore();
  };

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = (format: string) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

    switch (format) {
      case 'png':
        const pngDataUrl = getCanvasDataURL('png');
        downloadFile(pngDataUrl, `whiteboard-${timestamp}.png`);
        break;

      case 'pdf':
        // For PDF, we'll use the PNG data and create a simple PDF
        const pdfCanvas = document.createElement('canvas');
        const pdfCtx = pdfCanvas.getContext('2d');
        if (pdfCtx) {
          pdfCanvas.width = 1920;
          pdfCanvas.height = 1080;

          // Create a simple PDF-like layout
          pdfCtx.fillStyle = backgroundColor;
          pdfCtx.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);

          // Draw grid or lines if applicable
          if (backgroundType === 'grid') {
            drawGridOnCanvas(pdfCtx, pdfCanvas, 20, gridLineColor);
          } else if (backgroundType === 'lined') {
            drawLinesOnCanvas(pdfCtx, pdfCanvas, 30, ruledLineColor);
          }

          // Draw elements (simplified for PDF)
          elements.forEach((element) => {
            pdfCtx.save();
            pdfCtx.globalAlpha = element.opacity;
            pdfCtx.strokeStyle = element.color;
            pdfCtx.fillStyle = element.color;
            pdfCtx.lineWidth = element.strokeWidth;

            // Simplified rendering for PDF
            if (element.points.length > 1) {
              pdfCtx.beginPath();
              pdfCtx.moveTo(element.points[0].x, element.points[0].y);
              for (let i = 1; i < element.points.length; i++) {
                pdfCtx.lineTo(element.points[i].x, element.points[i].y);
              }
              pdfCtx.stroke();
            }

            pdfCtx.restore();
          });

          const pdfDataUrl = pdfCanvas.toDataURL('image/png');
          downloadFile(pdfDataUrl, `whiteboard-${timestamp}.pdf.png`);
        }
        break;

      case 'svg':
        // Create SVG representation
        let svgContent = `<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">`;
        svgContent += `<rect width="100%" height="100%" fill="${backgroundColor}"/>`;

        // Add grid or lines if applicable
        if (backgroundType === 'grid') {
          for (let x = 0; x < 1920; x += 20) {
            svgContent += `<line x1="${x}" y1="0" x2="${x}" y2="1080" stroke="${gridLineColor}" stroke-width="1"/>`;
          }
          for (let y = 0; y < 1080; y += 20) {
            svgContent += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="${gridLineColor}" stroke-width="1"/>`;
          }
        } else if (backgroundType === 'lined') {
          for (let y = 0; y < 1080; y += 30) {
            svgContent += `<line x1="0" y1="${y}" x2="1920" y2="${y}" stroke="${ruledLineColor}" stroke-width="1"/>`;
          }
        }

        elements.forEach((element) => {
          if (element.points.length > 1) {
            const pathData = `M ${element.points[0].x} ${element.points[0].y} ` +
              element.points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
            svgContent += `<path d="${pathData}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" opacity="${element.opacity}"/>`;
          }
        });

        svgContent += '</svg>';
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        downloadFile(svgUrl, `whiteboard-${timestamp}.svg`);
        break;

      case 'json':
        const jsonData = {
          version: '1.0',
          timestamp,
          canvas: {
            backgroundColor,
            backgroundType,
            zoom,
            pan,
            gridLineColor: backgroundType === 'grid' ? gridLineColor : undefined,
            ruledLineColor: backgroundType === 'lined' ? ruledLineColor : undefined
          },
          elements: elements.map(el => ({
            ...el,
            created: new Date(el.created).toISOString(),
            updated: new Date(el.updated).toISOString()
          }))
        };
        const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
        const jsonUrl = URL.createObjectURL(jsonBlob);
        downloadFile(jsonUrl, `whiteboard-project-${timestamp}.json`);
        break;
    }

    setShowSaveModal(false);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleUndo = () => {
    dispatch(undo());
  };

  const handleRedo = () => {
    dispatch(redo());
  };

  const getCurrentBackgroundLabel = () => {
    const option = backgroundOptions.find(opt => opt.type === backgroundType);
    return option ? option.label : 'Custom';
  };

  const handleLeaveRoom = () => {
    dispatch(setRoomId(''));
    setShowRoomMenu(false);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-xl border border-gray-200 px-2 py-1 flex items-center gap-2 z-20 max-w-6xl">

        {/* Room Info */}
        <div className="relative">
          <button
            className="room-button flex items-center gap-2 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            onClick={() => setShowRoomMenu(!showRoomMenu)}
            title="Room settings"
          >

            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-medium">{roomId}</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${showRoomMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Room Dropdown */}
          {showRoomMenu && (
            <div className="room-dropdown absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-64 z-30 animate-slideDown">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Room: {roomId}
              </div>

              <div className="space-y-2">
                <button
                  onClick={onChangeRoom}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                >
                  <Settings size={16} className="text-gray-600" />
                  <span className="font-medium">Change Room</span>
                </button>

                <button
                  onClick={handleLeaveRoom}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 transition-all duration-200"
                >
                  <LogOut size={16} />
                  <span className="font-medium">Leave Room</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Metrics */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
          <Users size={14} className="text-gray-600" />
          <div className="flex -space-x-1">
            {users.slice(0, 4).map((user) => (
              <div
                key={user.id}
                className="w-5 h-5 rounded-full border-1 border-white flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >

                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length > 4 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                +{users.length - 4}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600 font-medium">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        </div>

        {/* Undo/Redo Controls - Clean icons only */}
        <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
          <button
            onClick={handleUndo}
            disabled={past.length === 0}
            className={`p-2 rounded-lg transition-all duration-200 ${past.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
            title="Undo (Ctrl+Z / Cmd+Z)"
          >
            <Undo size={16} />
          </button>

          <button
            onClick={handleRedo}
            disabled={future.length === 0}
            className={`p-2 rounded-lg transition-all duration-200 ${future.length === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
            title="Redo (Ctrl+Y / Cmd+Shift+Z)"
          >
            <Redo size={16} />
          </button>

          {aiState.lastCommandId && (
            <button
              onClick={() => undoAI()}
              className="p-1 px-2 text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-all duration-200 flex items-center gap-1 font-medium ml-1"
              title="Undo last AI diagram"
            >
              <RotateCcw size={13} />
              <span>Undo AI</span>
            </button>
          )}
        </div>

        {/* Background Controls */}
        <div className="relative border-l border-gray-200 pl-2">
          <button
            className="background-button flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            onClick={() => setShowBackgroundMenu(!showBackgroundMenu)}
            title="Change background"
          >
            <Palette size={16} />
            <span>Background: {getCurrentBackgroundLabel()}</span>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showBackgroundMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Background Dropdown */}
          {showBackgroundMenu && (
            <div className="background-dropdown absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-3 min-w-64 z-30 animate-slideDown">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Background Options
              </div>

              {/* Background Type Options */}
              <div className="space-y-2 mb-4">
                {backgroundOptions.map((option) => (
                  <button
                    key={option.type}
                    onClick={() => handleBackgroundChange(option.type, option.color)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${backgroundType === option.type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <div
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: option.color }}
                    />
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Background Color - Always Available */}
              <div className="border-t border-gray-200 pt-3 mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                  Background Color
                </label>
                <div className="flex items-center gap-3"> {/* Modified User Metrics div */}

                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 font-mono">
                    {backgroundColor.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Grid Line Color - Only when Grid is selected */}
              {backgroundType === 'grid' && (
                <div className="border-t border-gray-200 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                    Grid Line Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gridLineColor}
                      onChange={(e) => setGridLineColor(e.target.value)}
                      className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 font-mono">
                      {gridLineColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Rule Line Color - Only when Lined is selected */}
              {backgroundType === 'lined' && (
                <div className="border-t border-gray-200 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
                    Rule Line Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={ruledLineColor}
                      onChange={(e) => setRuledLineColor(e.target.value)}
                      className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600 font-mono">
                      {ruledLineColor.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
          <button
            onClick={handleShare}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Share whiteboard"
          >
            <Share size={16} />
          </button>

          {/* Save Button */}
          <button
            onClick={() => setShowSaveModal(true)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Save whiteboard"
          >
            <Save size={16} />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          {/* Study Room Button */}
          <button
            onClick={() => dispatch(toggleVideoPanel())}
            className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1 ${videoPanelOpen
              ? 'bg-teal-500 text-white hover:bg-teal-600'
              : 'text-gray-600 hover:bg-gray-100'
              }`}
            title={videoPanelOpen ? "Close Study Room" : "Open Study Room"}
          >
            {videoPanelOpen ? <VideoOff size={16} /> : <Video size={16} />}
            <span className="text-xs font-medium hidden sm:inline">
              {videoPanelOpen ? 'Leave' : 'Study Room'}
            </span>
          </button>

          {/* StudyBot Button */}
          <button
            onClick={() => dispatch(toggleStudyBotPanel())}
            className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
              studyBotPanelOpen
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                : aiState.status === 'thinking' || aiState.status === 'drawing'
                ? 'bg-purple-100 text-purple-700 animate-pulse border border-purple-300'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            title="Ask StudyBot AI to draw diagrams"
          >
            <Bot size={16} />
            <span className="text-xs font-medium hidden sm:inline">
              {aiState.status === 'thinking'
                ? 'Thinking...'
                : aiState.status === 'drawing'
                ? 'Drawing...'
                : 'StudyBot'}
            </span>
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSaveModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-full max-w-md mx-4 animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Save size={20} />
                Save Whiteboard
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Save Options */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-3">
                Choose your preferred format:
              </div>
              {saveOptions.map((option) => (
                <button
                  key={option.format}
                  onClick={() => handleSave(option.format)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="font-medium text-gray-800 group-hover:text-gray-900">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg">
              💡 <strong>Tip:</strong> PNG format provides the best quality for images, while JSON saves your complete project for later editing.
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowShareModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 w-full max-w-md mx-4 animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Share Whiteboard</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* URL Display */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share this URL with others to collaborate:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2 ${urlCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                >
                  {urlCopied ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <p className="font-medium text-blue-800 mb-1">How to collaborate:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• Share this URL with team members</li>
                <li>• Everyone can draw and edit in real-time</li>
                <li>• Changes are automatically synchronized</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;