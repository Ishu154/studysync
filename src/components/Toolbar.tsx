import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  MousePointer,
  Pen,
  Pencil,
  Paintbrush,
  Eraser,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Type,
  Grid,
  Move,
  Zap,
  X,
  Star,
  Triangle,
  Diamond,
  Heart,
  Hexagon,
  Palette,
  Sliders,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RootState } from "../store";
import {
  setSelectedTool,
  toggleGrid,
  toggleSnapToGrid,
  setPenType,
  setPencilType,
  setBrushType,
  setEraserType,
  setSelectedColor,
  setStrokeWidth,
  setOpacity,
  setEraserSize,
} from "../store/whiteboardSlice";
import {
  DrawingTool,
  PenType,
  PencilType,
  BrushType,
  EraserType,
} from "../types";

const Toolbar: React.FC = () => {
  const dispatch = useDispatch();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [dialogPosition, setDialogPosition] = useState({ left: 0, top: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const toolRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const {
    selectedTool,
    gridVisible,
    snapToGrid,
    penType,
    pencilType,
    brushType,
    eraserType,
    selectedColor,
    strokeWidth,
    opacity,
    recentColors,
    eraserSize,
  } = useSelector((state: RootState) => state.whiteboard.canvas);

  const tools = [
    {
      id: "select" as DrawingTool,
      icon: MousePointer,
      label: "Select",
      shortcut: "V",
    },
    {
      id: "pen" as DrawingTool,
      icon: Pen,
      label: "Pen",
      shortcut: "P",
      hasDialog: true,
    },
    {
      id: "pencil" as DrawingTool,
      icon: Pencil,
      label: "Pencil",
      shortcut: "",
      hasDialog: true,
    },
    {
      id: "brush" as DrawingTool,
      icon: Paintbrush,
      label: "Brush",
      shortcut: "B",
      hasDialog: true,
    },
    {
      id: "eraser" as DrawingTool,
      icon: Eraser,
      label: "Eraser",
      shortcut: "E",
      hasDialog: true,
    },
    { id: "text" as DrawingTool, icon: Type, label: "Text", shortcut: "T" },
  ];

  const shapes = [
    { id: "rectangle" as DrawingTool, icon: Square, label: "Rectangle" },
    { id: "circle" as DrawingTool, icon: Circle, label: "Circle" },
    { id: "line" as DrawingTool, icon: Minus, label: "Line" },
    { id: "arrow" as DrawingTool, icon: ArrowRight, label: "Arrow" },
    { id: "triangle" as DrawingTool, icon: Triangle, label: "Triangle" },
    { id: "diamond" as DrawingTool, icon: Diamond, label: "Diamond" },
    { id: "star" as DrawingTool, icon: Star, label: "Star" },
    { id: "heart" as DrawingTool, icon: Heart, label: "Heart" },
    { id: "hexagon" as DrawingTool, icon: Hexagon, label: "Hexagon" },
  ];

  const presetColors = [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#0000FF",
    "#00FF00",
    "#FFFF00",
    "#800080",
    "#FFA500",
    "#FF69B4",
    "#00FFFF",
    "#8B4513",
    "#808080",
    "#FFB6C1",
    "#98FB98",
    "#87CEEB",
    "#DDA0DD",
  ];

  // Close dialogs when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        setActiveDialog(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Enhanced tool selection with automatic switching and default settings
  const handleToolSelect = (tool: DrawingTool) => {
    dispatch(setSelectedTool(tool));

    // Automatically apply default or previous settings when switching tools
    switch (tool) {
      case "pen":
        // If no pen type is set or switching from another tool, use default
        if (!penType || selectedTool !== "pen") {
          dispatch(setPenType("ballpoint")); // Default pen type
        }
        break;
      case "pencil":
        // If no pencil type is set or switching from another tool, use default
        if (!pencilType || selectedTool !== "pencil") {
          dispatch(setPencilType("HB")); // Default pencil type
        }
        break;
      case "brush":
        // If no brush type is set or switching from another tool, use default
        if (!brushType || selectedTool !== "brush") {
          dispatch(setBrushType("watercolor")); // Default brush type
        }
        break;
      case "eraser":
        // If no eraser type is set or switching from another tool, use default
        if (!eraserType || selectedTool !== "eraser") {
          dispatch(setEraserType("precision")); // Default eraser type
        }
        break;
    }

    // Close dialog if tool doesn't have one
    if (!tools.find((t) => t.id === tool)?.hasDialog) {
      setActiveDialog(null);
    }
  };

  const calculateDialogPosition = (toolId: string) => {
    if (!toolbarRef.current) return { left: 16, top: 50 };

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Position dialog to the right of the toolbar
    let left = toolbarRect.right + 16;
    let top = toolbarRect.top;

    // Ensure dialog doesn't go off-screen horizontally
    const dialogWidth = toolId === "shapes" ? 600 : 800;
    if (left + dialogWidth > viewportWidth) {
      left = toolbarRect.left - dialogWidth - 16; // Position to the left instead
    }

    // Ensure dialog doesn't go off-screen vertically
    const maxTop = viewportHeight - 400; // assuming 400px dialog height
    top = Math.min(top, maxTop);
    top = Math.max(top, 16); // minimum top margin

    return { left, top };
  };

  const handleToolClick = (tool: any, event: React.MouseEvent) => {
    // Always select the tool first for immediate switching
    handleToolSelect(tool.id);

    if (tool.hasDialog) {
      const position = calculateDialogPosition(tool.id);
      setDialogPosition(position);
      setActiveDialog(activeDialog === tool.id ? null : tool.id);
    } else {
      setActiveDialog(null);
    }
  };

  const handleShapesClick = () => {
    const position = calculateDialogPosition("shapes");
    setDialogPosition(position);
    setActiveDialog(activeDialog === "shapes" ? null : "shapes");
  };

  const handleMouseEnter = (toolId: string) => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    const timeout = setTimeout(() => {
      setHoveredTool(toolId);
    }, 500);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setHoveredTool(null);
  };

  const getToolIcon = (tool: any) => {
    const Icon = tool.icon;
    const isLaser = selectedTool === "pen" && penType === "laser";
    const showLaserIcon = tool.id === "pen" && isLaser;

    return showLaserIcon ? <Zap size={20} /> : <Icon size={20} />;
  };

  const renderColorPicker = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
          Current Color
        </label>
        <div
          className="w-full h-10 rounded-lg border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
          style={{ backgroundColor: selectedColor }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "color";
            input.value = selectedColor;

            input.onchange = (e) => {
              const target = e.target as HTMLInputElement;
              dispatch(setSelectedColor(target.value));
            };
            input.click();
          }}
          title="Click to open custom color picker"
        />
        <p className="text-xs text-gray-500 mt-1 text-center">
          {selectedColor.toUpperCase()}
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
          Preset Colors
        </label>
        <div className="grid grid-cols-8 gap-2">
          {presetColors.map((color, index) => (
            <button
              key={index}
              className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${selectedColor === color
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-gray-300"
                }`}
              style={{ backgroundColor: color }}
              onClick={() => dispatch(setSelectedColor(color))}
              title={color}
            />
          ))}
        </div>
      </div>

      {recentColors.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
            Recent Colors
          </label>
          <div className="flex gap-2 flex-wrap">
            {recentColors.slice(0, 8).map((color, index) => (
              <button
                key={index}
                className="w-7 h-7 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                onClick={() => dispatch(setSelectedColor(color))}
                title={color}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPropertiesSection = (toolId: string) => (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
        <Sliders size={14} />
        Properties
      </h4>

      {/* Size Control */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
          {toolId === "eraser"
            ? `Size: ${eraserSize}px`
            : `Size: ${strokeWidth}px`}
        </label>
        <input
          type="range"
          min={toolId === "eraser" ? "5" : "1"}
          max={toolId === "eraser" ? "50" : "20"}
          value={toolId === "eraser" ? eraserSize : strokeWidth}
          onChange={(e) => {
            if (toolId === "eraser") {
              dispatch(setEraserSize(Number(e.target.value)));
            } else {
              dispatch(setStrokeWidth(Number(e.target.value)));
            }
          }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      {/* Opacity - Only for non-eraser tools */}
      {toolId !== "eraser" && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
            Opacity: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => dispatch(setOpacity(Number(e.target.value)))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      )}
    </div>
  );

  const renderToolDialog = (toolId: string) => {
    const tool = tools.find((t) => t.id === toolId);
    if (!tool || !tool.hasDialog) return null;

    let toolOptions = [];
    let currentType = "";

    switch (toolId) {
      case "pen":
        currentType = penType;
        toolOptions = [
          {
            id: "ballpoint" as PenType,
            label: "Ballpoint",
            desc: "Precise, consistent",
          },
          {
            id: "felt-tip" as PenType,
            label: "Felt-tip",
            desc: "Bold strokes",
          },
          { id: "gel" as PenType, label: "Gel", desc: "Smooth, vibrant" },
          {
            id: "fountain" as PenType,
            label: "Fountain",
            desc: "Pressure sensitive",
          },
          {
            id: "laser" as PenType,
            label: "Laser Pointer",
            desc: "Temporary marks",
          },
        ];
        break;
      case "pencil":
        currentType = pencilType;
        toolOptions = [
          { id: "HB" as PencilType, label: "HB", desc: "Medium hardness" },
          { id: "2B" as PencilType, label: "2B", desc: "Soft, darker" },
          { id: "4B" as PencilType, label: "4B", desc: "Very soft, rich" },
        ];
        break;
      case "brush":
        currentType = brushType;
        toolOptions = [
          {
            id: "watercolor" as BrushType,
            label: "Watercolor",
            desc: "Transparent, blendable",
          },
          { id: "marker" as BrushType, label: "Marker", desc: "Bold, opaque" },
        ];
        break;
      case "eraser":
        currentType = eraserType;
        toolOptions = [
          {
            id: "precision" as EraserType,
            label: "Precision",
            desc: "Small, accurate",
          },
          { id: "wide" as EraserType, label: "Wide", desc: "Large area" },
        ];
        break;
    }

    return (
      <div
        className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-slideDown"
        style={{
          left: `${dialogPosition.left}px`,
          top: `${dialogPosition.top}px`,
          width: `${Math.min(800, window.innerWidth - 32)}px`,
          maxHeight: `${Math.min(
            400,
            window.innerHeight - dialogPosition.top - 16
          )}px`,
        }}
      >
        {/* Connection indicator */}
        <div
          className="absolute bg-blue-500"
          style={{
            left: "50%",
            top: "-4px",
            transform: "translateX(-50%)",
            width: "40px",
            height: "4px",
            borderRadius: "2px",
          }}
        />

        {/* Scrollable content */}
        <div className="overflow-y-auto max-h-full">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h4 className="text-xl font-semibold text-gray-700 flex items-center gap-3">
                {getToolIcon(tool)}
                {tool.label} Settings
              </h4>
              <button
                onClick={() => setActiveDialog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Horizontal Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Tool Type Options */}
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  {getToolIcon(tool)}
                  {tool.label} Types
                </h5>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {toolOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        switch (toolId) {
                          case "pen":
                            dispatch(setPenType(option.id as PenType));
                            break;
                          case "pencil":
                            dispatch(setPencilType(option.id as PencilType));
                            break;
                          case "brush":
                            dispatch(setBrushType(option.id as BrushType));
                            break;
                          case "eraser":
                            dispatch(setEraserType(option.id as EraserType));
                            break;
                        }
                        // Tool is already selected from handleToolClick
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${currentType === option.id
                          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                    >
                      <div className="font-medium text-sm">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {option.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Section - Only for non-eraser tools */}
              {toolId !== "eraser" && (
                <div className="space-y-3">
                  <h5 className="text-sm font-medium text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Palette size={14} />
                    Colors
                  </h5>
                  {renderColorPicker()}
                </div>
              )}

              {/* Properties Section */}
              <div className="space-y-3">{renderPropertiesSection(toolId)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderShapesDialog = () => (
    <div
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-slideDown"
      style={{
        left: `${dialogPosition.left}px`,
        top: `${dialogPosition.top}px`,
        width: `${Math.min(600, window.innerWidth - 32)}px`,
        maxHeight: `${Math.min(
          400,
          window.innerHeight - dialogPosition.top - 16
        )}px`,
      }}
    >
      {/* Connection indicator */}
      <div
        className="absolute bg-blue-500"
        style={{
          left: "50%",
          top: "-4px",
          transform: "translateX(-50%)",
          width: "40px",
          height: "4px",
          borderRadius: "2px",
        }}
      />

      <div className="p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
          <h4 className="text-xl font-semibold text-gray-700 flex items-center gap-3">
            <Square size={20} />
            Shape Tools
          </h4>
          <button
            onClick={() => setActiveDialog(null)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Horizontal grid of shapes */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            return (
              <div key={shape.id} className="relative">
                <button
                  onClick={() => {
                    handleToolSelect(shape.id);
                    setActiveDialog(null);
                  }}
                  onMouseEnter={() => handleMouseEnter(shape.id)}
                  onMouseLeave={handleMouseLeave}
                  className={`w-full aspect-square p-4 rounded-xl transition-all duration-200 flex items-center justify-center ${selectedTool === shape.id
                      ? "bg-blue-500 text-white shadow-lg scale-105"
                      : "text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
                    }`}
                  title={shape.label}
                >
                  <Icon size={24} />
                </button>

                {/* Shape label */}
                <div className="text-xs text-center text-gray-600 mt-2 font-medium">
                  {shape.label}
                </div>

                {/* Hover tooltip */}
                {hoveredTool === shape.id && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-40 animate-fadeIn">
                    {shape.label}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={toolbarRef}
      className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20"
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-2">
        {/* Main Tools - Vertical Layout */}
        <div className="flex flex-col gap-1 mb-2">
          {tools.map((tool) => (
            <div key={tool.id} className="relative">
              <button
                ref={(el) => (toolRefs.current[tool.id] = el)}
                onClick={(e) => handleToolClick(tool, e)}
                onMouseEnter={() => handleMouseEnter(tool.id)}
                onMouseLeave={handleMouseLeave}
                className={`p-3 rounded-lg transition-all duration-300 relative ${selectedTool === tool.id
                    ? "bg-blue-500 text-white shadow-lg scale-105"
                    : "text-gray-600 hover:bg-gray-100"
                  } ${activeDialog === tool.id ? "ring-2 ring-blue-300" : ""}`}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""
                  }`}
              >
                {getToolIcon(tool)}
                {tool.hasDialog && (
                  <ChevronDown
                    size={10}
                    className={`absolute top-1 right-1 transition-all duration-300 ${activeDialog === tool.id ? "rotate-180" : ""
                      } ${selectedTool === tool.id ? "text-white" : "text-gray-400"
                      }`}
                  />
                )}
              </button>

              {/* Hover Label */}
              {hoveredTool === tool.id && !activeDialog && (
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-40 animate-fadeIn shadow-lg">
                  {tool.label}
                  {tool.shortcut && (
                    <span className="ml-2 opacity-75">({tool.shortcut})</span>
                  )}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Shapes Menu */}
        <div className="relative mb-2">
          <button
            ref={(el) => (toolRefs.current["shapes"] = el)}
            onClick={handleShapesClick}
            onMouseEnter={() => handleMouseEnter("shapes")}
            onMouseLeave={handleMouseLeave}
            className={`p-3 rounded-lg transition-all duration-300 relative ${shapes.some((s) => s.id === selectedTool)
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "text-gray-600 hover:bg-gray-100"
              } ${activeDialog === "shapes" ? "ring-2 ring-blue-300" : ""}`}
            title="Shapes"
          >
            {shapes.find((s) => s.id === selectedTool) ? (
              React.createElement(
                shapes.find((s) => s.id === selectedTool)!.icon,
                { size: 20 }
              )
            ) : (
              <Square size={20} />
            )}
            <ChevronDown
              size={10}
              className={`absolute top-1 right-1 transition-all duration-300 ${activeDialog === "shapes" ? "rotate-180" : ""
                } ${shapes.some((s) => s.id === selectedTool)
                  ? "text-white"
                  : "text-gray-400"
                }`}
            />
          </button>

          {/* Hover Label */}
          {hoveredTool === "shapes" && activeDialog !== "shapes" && (
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-40 animate-fadeIn shadow-lg">
              Shapes
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 my-2" />

        {/* Grid Controls */}
        <div className="flex flex-col gap-1">
          <button
            onClick={() => dispatch(toggleGrid())}
            onMouseEnter={() => handleMouseEnter("grid")}
            onMouseLeave={handleMouseLeave}
            className={`p-3 rounded-lg transition-all duration-300 ${gridVisible
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Toggle Grid"
          >
            <Grid size={20} />
          </button>

          <button
            onClick={() => dispatch(toggleSnapToGrid())}
            onMouseEnter={() => handleMouseEnter("snap")}
            onMouseLeave={handleMouseLeave}
            className={`p-3 rounded-lg transition-all duration-300 ${snapToGrid
                ? "bg-blue-500 text-white shadow-lg scale-105"
                : "text-gray-600 hover:bg-gray-100"
              }`}
            title="Snap to Grid"
          >
            <Move size={20} />
          </button>

          {/* Hover Labels for Grid Controls */}
          {hoveredTool === "grid" && (
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-40 animate-fadeIn shadow-lg">
              Toggle Grid
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900" />
            </div>
          )}
          {hoveredTool === "snap" && (
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-40 animate-fadeIn shadow-lg">
              Snap to Grid
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900" />
            </div>
          )}
        </div>
      </div>

      {/* Render dialogs outside toolbar container */}
      {activeDialog &&
        tools.find((t) => t.id === activeDialog) &&
        renderToolDialog(activeDialog)}
      {activeDialog === "shapes" && renderShapesDialog()}
    </div>
  );
};

export default Toolbar;
