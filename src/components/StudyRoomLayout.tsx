import React, { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setVideoPanelOpen } from '../store/whiteboardSlice';
import Canvas from './Canvas';
import VideoPanel from './VideoPanel';
import Toolbar from './Toolbar';
import TopBar from './TopBar';
import BottomBar from './BottomBar';
import { GripVertical } from 'lucide-react';

interface StudyRoomLayoutProps {
    onChangeRoom: () => void;
}

const StudyRoomLayout: React.FC<StudyRoomLayoutProps> = ({ onChangeRoom }) => {
    const dispatch = useDispatch();
    const videoPanelOpen = useSelector((state: RootState) => state.whiteboard.ui?.videoPanelOpen ?? false);

    const [panelWidth, setPanelWidth] = useState(400);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(400);

    const MIN_PANEL_WIDTH = 200;
    const MAX_PANEL_WIDTH = 800;

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.clientX);
        setStartWidth(panelWidth);
        e.preventDefault();
    }, [panelWidth]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const diff = startX - e.clientX;
        const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startWidth + diff));
        setPanelWidth(newWidth);
    }, [isDragging, startX, startWidth]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add global mouse event listeners for drag
    React.useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleCloseVideoPanel = useCallback(() => {
        dispatch(setVideoPanelOpen(false));
    }, [dispatch]);

    return (
        <div
            className="study-room-layout"
            style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            {/* Whiteboard Canvas Section */}
            <div
                className="canvas-section"
                style={{
                    flex: 1,
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: isDragging ? 'none' : 'all 0.2s ease',
                }}
            >
                <Canvas />
                <Toolbar />
                <TopBar onChangeRoom={onChangeRoom} />
                <BottomBar />
            </div>

            {/* Video Panel */}
            {videoPanelOpen && (
                <>
                    {/* Resizable Divider */}
                    <div
                        className="resize-handle"
                        onMouseDown={handleMouseDown}
                        style={{
                            width: '12px',
                            cursor: 'col-resize',
                            backgroundColor: isDragging ? '#14b8a6' : '#d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: isDragging ? 'none' : 'background-color 0.2s',
                            zIndex: 50,
                            position: 'relative',
                        }}
                        title="Drag to resize panels"
                        onMouseEnter={(e) => {
                            if (!isDragging) {
                                e.currentTarget.style.backgroundColor = '#9ca3af';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isDragging) {
                                e.currentTarget.style.backgroundColor = '#d1d5db';
                            }
                        }}
                    >
                        <GripVertical
                            size={16}
                            color={isDragging ? '#fff' : '#6b7280'}
                            style={{ opacity: 1 }}
                        />
                    </div>

                    {/* Video Panel */}
                    <div
                        className="video-section"
                        style={{
                            width: `${panelWidth}px`,
                            height: '100%',
                            flexShrink: 0,
                            transition: isDragging ? 'none' : 'width 0.2s ease',
                        }}
                    >
                        <VideoPanel onClose={handleCloseVideoPanel} />
                    </div>
                </>
            )}
        </div>
    );
};

export default StudyRoomLayout;
