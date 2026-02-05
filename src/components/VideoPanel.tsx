import React, { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2, Users, X, ChevronUp } from 'lucide-react';

// Declare Jitsi API on window
declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface VideoPanelProps {
    onClose?: () => void;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const apiRef = useRef<any>(null);

    const roomId = useSelector((state: RootState) => state.whiteboard.roomId);
    const currentUser = useSelector((state: RootState) => state.whiteboard.currentUser);

    const [isAudioMuted, setIsAudioMuted] = React.useState(false);
    const [isVideoMuted, setIsVideoMuted] = React.useState(false);
    const [isMinimized, setIsMinimized] = React.useState(false);
    const [participantCount, setParticipantCount] = React.useState(1);
    const [headerVisible, setHeaderVisible] = React.useState(true);

    // Initialize Jitsi Meet
    useEffect(() => {
        if (!containerRef.current || !roomId) return;

        // Clean room ID for Jitsi (alphanumeric only)
        const cleanRoomId = roomId.replace(/[^a-zA-Z0-9]/g, '');

        // JaaS App ID - for production use
        const JAAS_APP_ID = 'vpaas-magic-cookie-a5b475e7f96e499f9b1341c6f13ae96a';
        const jitsiRoomName = `${JAAS_APP_ID}/StudyRoom_${cleanRoomId}`;

        // Wait for Jitsi API to load
        const initJitsi = () => {
            if (!window.JitsiMeetExternalAPI) {
                setTimeout(initJitsi, 100);
                return;
            }

            try {
                // Using JaaS (8x8) - production Jitsi service
                apiRef.current = new window.JitsiMeetExternalAPI('8x8.vc', {
                    roomName: jitsiRoomName,
                    parentNode: containerRef.current,
                    width: '100%',
                    height: '100%',
                    configOverwrite: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        disableDeepLinking: true,
                        prejoinPageEnabled: false,
                        enableClosePage: false,
                        disableInviteFunctions: true,
                        // Disable lobby to allow immediate joining
                        hideLobbyButton: true,
                        requireDisplayName: false,
                        enableWelcomePage: false,
                        // Allow guests to start meetings
                        enableInsecureRoomNameWarning: false,
                        toolbarButtons: [
                            'microphone',
                            'camera',
                            'desktop',
                            'fullscreen',
                            'hangup',
                            'chat',
                            'raisehand',
                            'tileview',
                            'settings',
                        ],
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                        SHOW_BRAND_WATERMARK: false,
                        SHOW_POWERED_BY: false,
                        TOOLBAR_ALWAYS_VISIBLE: true,
                        FILM_STRIP_MAX_HEIGHT: 120,
                        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                        MOBILE_APP_PROMO: false,
                    },
                    userInfo: {
                        displayName: currentUser?.name || 'Anonymous',
                    },
                });

                // Event listeners
                apiRef.current.addListener('audioMuteStatusChanged', (data: { muted: boolean }) => {
                    setIsAudioMuted(data.muted);
                });

                apiRef.current.addListener('videoMuteStatusChanged', (data: { muted: boolean }) => {
                    setIsVideoMuted(data.muted);
                });

                apiRef.current.addListener('participantJoined', () => {
                    updateParticipantCount();
                });

                apiRef.current.addListener('participantLeft', () => {
                    updateParticipantCount();
                });

                apiRef.current.addListener('readyToClose', () => {
                    onClose?.();
                });

            } catch (error) {
                console.error('Failed to initialize Jitsi:', error);
            }
        };

        initJitsi();

        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, [roomId, currentUser?.name, onClose]);

    const updateParticipantCount = useCallback(() => {
        if (apiRef.current) {
            const participants = apiRef.current.getParticipantsInfo();
            setParticipantCount(participants?.length || 1);
        }
    }, []);

    const toggleAudio = useCallback(() => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleAudio');
        }
    }, []);

    const toggleVideo = useCallback(() => {
        if (apiRef.current) {
            apiRef.current.executeCommand('toggleVideo');
        }
    }, []);

    const hangUp = useCallback(() => {
        if (apiRef.current) {
            apiRef.current.executeCommand('hangup');
        }
        onClose?.();
    }, [onClose]);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    return (
        <div
            className={`video-panel ${isMinimized ? 'video-panel-minimized' : ''}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#f9fafb',
                borderLeft: '1px solid #e5e7eb',
                position: 'relative',
            }}
        >
            {/* Collapsible Header */}
            {headerVisible ? (
                <div
                    className="video-panel-header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        borderBottom: '1px solid #e5e7eb',
                        minHeight: '44px',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Video size={18} color="#14b8a6" />
                        <span style={{ color: '#374151', fontWeight: 600, fontSize: '13px' }}>
                            Study Room
                        </span>
                        <span
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#14b8a622',
                                padding: '2px 6px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                color: '#14b8a6',
                            }}
                        >
                            <Users size={10} />
                            {participantCount}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                            onClick={toggleMinimize}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title={isMinimized ? 'Expand' : 'Minimize'}
                        >
                            {isMinimized ? (
                                <Maximize2 size={16} color="#888" />
                            ) : (
                                <Minimize2 size={16} color="#888" />
                            )}
                        </button>
                        <button
                            onClick={() => setHeaderVisible(false)}
                            style={{
                                background: '#6b7280',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            title="Hide header"
                        >
                            <X size={16} color="#fff" />
                        </button>
                    </div>
                </div>
            ) : (
                /* Collapsed header - just a small toggle button */
                <button
                    onClick={() => setHeaderVisible(true)}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 100,
                        background: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #14b8a6',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#14b8a6',
                        fontSize: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    title="Show header"
                >
                    <Video size={14} />
                    <span>{participantCount}</span>
                </button>
            )}

            {/* Video Container */}
            {!isMinimized && (
                <div
                    ref={containerRef}
                    className="jitsi-container"
                    style={{
                        flex: 1,
                        backgroundColor: '#f3f4f6',
                        overflow: 'hidden',
                    }}
                />
            )}

            {/* Controls (shown when minimized) */}
            {isMinimized && (
                <div
                    style={{
                        padding: '16px',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '12px',
                    }}
                >
                    <button
                        onClick={toggleAudio}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isAudioMuted ? '#e74c3c' : '#333',
                            transition: 'background-color 0.2s',
                        }}
                        title={isAudioMuted ? 'Unmute' : 'Mute'}
                    >
                        {isAudioMuted ? (
                            <MicOff size={20} color="#fff" />
                        ) : (
                            <Mic size={20} color="#fff" />
                        )}
                    </button>

                    <button
                        onClick={toggleVideo}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isVideoMuted ? '#e74c3c' : '#333',
                            transition: 'background-color 0.2s',
                        }}
                        title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                    >
                        {isVideoMuted ? (
                            <VideoOff size={20} color="#fff" />
                        ) : (
                            <Video size={20} color="#fff" />
                        )}
                    </button>

                    <button
                        onClick={hangUp}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#e74c3c',
                            transition: 'transform 0.2s',
                        }}
                        title="Leave call"
                    >
                        <PhoneOff size={20} color="#fff" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default VideoPanel;
