import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { updateElement } from "../store/whiteboardSlice";
import { useSocket } from "../hooks/useSocket";

interface TextEditorProps {
  elementId: string;
  onComplete: () => void;
}

const TextEditor: React.FC<TextEditorProps> = ({ elementId, onComplete }) => {
  const dispatch = useDispatch();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const justMounted = useRef(true);

  const element = useSelector((state: RootState) =>
    state.whiteboard.elements.find((el) => el.id === elementId)
  );

  const {
    zoom,
    pan,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign,
    selectedColor,
  } = useSelector((state: RootState) => state.whiteboard.canvas);

  const { emitElementUpdated } = useSocket("room-1");

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [text, fontSize, zoom]);

  useEffect(() => {
    if (element && element.text !== undefined) {
      setText(element.text);
    }
    // Focus the input
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    justMounted.current = true;
    setTimeout(() => {
      justMounted.current = false;
    }, 100);
  }, [element]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleComplete();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleComplete = () => {
    if (element) {
      if (text.trim() === "") {
        // Remove empty text element
        dispatch({ type: "whiteboard/deleteElement", payload: element.id });
        emitElementUpdated({ ...element, text: "", updated: Date.now() }); // Optionally broadcast deletion
      } else {
        const updatedElement = {
          ...element,
          text: text.trim(),
          updated: Date.now(),
        };
        dispatch(updateElement(updatedElement));
        emitElementUpdated(updatedElement);
      }
    }
    onComplete();
  };

  const handleBlur = () => {
    if (justMounted.current) return;
    handleComplete();
  };

  if (!element || !element.points.length) {
    return null;
  }

  const point = element.points[0];
  const screenX = (point.x + pan.x) * zoom;
  const screenY = (point.y + pan.y) * zoom;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: screenX,
        top: screenY,
        transform: "translate(0, -50%)",
        minWidth: "100px",
        maxWidth: "400px",
      }}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Enter text..."
        className="pointer-events-auto bg-white border-2 border-blue-500 border-dashed rounded px-2 py-1 resize-none overflow-hidden shadow-lg focus:outline-none"
        style={{
          fontSize: `${fontSize * zoom}px`,
          fontFamily,
          fontWeight,
          fontStyle,
          textAlign,
          color: selectedColor,
          minWidth: "100px",
          minHeight: `${fontSize * zoom * 1.2}px`,
          maxWidth: "400px",
          background: "rgba(255,255,255,0.95)",
        }}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleComplete();
          }
        }}
      />
    </div>
  );
};

export default TextEditor;
