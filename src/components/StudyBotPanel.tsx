import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Bot, Send, RotateCcw, X, MessageSquare, Loader2, AlertCircle, Cpu, Cloud, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../store';
import {
  setStudyBotPanelOpen,
  setProviderMode,
  setActiveBackend,
  setDownloadProgress,
  setAIStatus,
  addChatMessage,
} from '../store/whiteboardSlice';
import { useSocket } from '../hooks/useSocket';
import { LocalProvider, isWebGPUSupported } from '../shared/localProvider';
import { BoardContext } from '../shared/aiTypes';

export const StudyBotPanel: React.FC = () => {
  const dispatch = useDispatch();
  const [prompt, setPrompt] = useState('');
  const [webGpuSupported, setWebGpuSupported] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localProviderRef = useRef<LocalProvider | null>(null);

  const roomId = useSelector((state: RootState) => state.whiteboard.roomId);
  const isOpen = useSelector((state: RootState) => state.whiteboard.ui?.studyBotPanelOpen ?? false);
  const aiState = useSelector((state: RootState) => state.whiteboard.ai);
  const chatMessages = useSelector((state: RootState) => state.whiteboard.chatMessages);
  const selectedElements = useSelector((state: RootState) => state.whiteboard.canvas.selectedElements);
  const elements = useSelector((state: RootState) => state.whiteboard.elements);

  const { sendAICommand, sendClientOps, undoAI } = useSocket(roomId || 'room-1');

  const isBusy = aiState.status === 'thinking' || aiState.status === 'drawing';

  // Check WebGPU capability on mount
  useEffect(() => {
    isWebGPUSupported().then((supported) => {
      setWebGpuSupported(supported);
    });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, aiState.statusMessage]);

  if (!isOpen) return null;

  const getOrCreateLocalProvider = () => {
    if (!localProviderRef.current) {
      localProviderRef.current = new LocalProvider();
    }
    return localProviderRef.current;
  };

  const executeLocalGeneration = async (userPrompt: string): Promise<boolean> => {
    const provider = getOrCreateLocalProvider();
    const commandId = `cmd-local-${uuidv4().slice(0, 8)}`;

    dispatch(
      setAIStatus({
        status: 'thinking',
        commandId,
        message: 'Local WebLLM (WebGPU) is generating diagram...',
      })
    );
    dispatch(setActiveBackend('local'));

    const boardContext: BoardContext = {
      elementsCount: elements.length,
      selectedElements: selectedElements.length
        ? elements
            .filter((el) => selectedElements.includes(el.id))
            .map((el) => ({ id: el.id, type: el.type, text: el.text }))
        : undefined,
    };

    try {
      // Set a 20-second timeout to prevent hanging on slow CDN model downloads
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('Local model download timed out (>20s). Falling back to Cloud.')),
          20000
        );
      });

      const generationPromise = provider.generate(
        userPrompt,
        boardContext,
        commandId,
        (report) => {
          const percent = Math.round(report.progress * 100);
          dispatch(setDownloadProgress(percent));
          dispatch(
            setAIStatus({
              status: 'thinking',
              commandId,
              message: report.text || `Loading model: ${percent}%`,
            })
          );
        }
      );

      const ops = await Promise.race([generationPromise, timeoutPromise]);

      dispatch(setDownloadProgress(null));

      // Broadcast validated ops through the socket so all room participants see the same live diagram
      sendClientOps(ops, userPrompt, commandId);
      return true;
    } catch (err: unknown) {
      dispatch(setDownloadProgress(null));
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[StudyBotPanel] Local generation failed:', msg);
      return false;
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;

    setPrompt('');

    const mode = aiState.providerMode;

    if (mode === 'local') {
      if (webGpuSupported === false) {
        dispatch(
          setAIStatus({
            status: 'error',
            message: 'WebGPU is not supported in this browser. Please use Chrome/Edge or switch to Cloud mode.',
          })
        );
        return;
      }
      const success = await executeLocalGeneration(trimmed);
      if (!success) {
        dispatch(
          addChatMessage({
            id: uuidv4(),
            roomId,
            senderId: 'studybot',
            senderName: 'StudyBot 🤖',
            text: 'Local generation took too long or encountered an error. Automatically switching to Cloud API...',
            timestamp: Date.now(),
            isSystem: true,
          })
        );
        dispatch(setDownloadProgress(null));
        dispatch(
          setAIStatus({
            status: 'thinking',
            message: 'Generating diagram via Cloud API...',
          })
        );
        dispatch(setActiveBackend('cloud'));
        sendAICommand(trimmed, selectedElements.length > 0 ? selectedElements : undefined);
      }
    } else if (mode === 'cloud') {
      dispatch(setDownloadProgress(null));
      dispatch(
        setAIStatus({
          status: 'thinking',
          message: 'Generating diagram via Cloud API...',
        })
      );
      dispatch(setActiveBackend('cloud'));
      sendAICommand(trimmed, selectedElements.length > 0 ? selectedElements : undefined);
    } else {
      // Auto Mode:
      // If the local model is ALREADY downloaded/cached in WebGPU memory, use it!
      // Otherwise, use Cloud immediately for instant diagram drawing (<1s) without forcing a 350 MB download.
      const localProv = getOrCreateLocalProvider();
      if (webGpuSupported && localProv.isLoaded()) {
        const success = await executeLocalGeneration(trimmed);
        if (success) return;
      }

      // Fast Cloud Generation
      dispatch(setDownloadProgress(null));
      dispatch(
        setAIStatus({
          status: 'thinking',
          message: 'Designing diagram via Cloud API...',
        })
      );
      dispatch(setActiveBackend('cloud'));
      sendAICommand(trimmed, selectedElements.length > 0 ? selectedElements : undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickTemplate = (templatePrompt: string) => {
    if (isBusy) return;
    setPrompt(templatePrompt);
  };

  const templates = [
    'Draw a flowchart for user login and JWT verification',
    'Create a microservices architecture with API Gateway and Kafka',
    'Draw a mind map of photosynthesis and cellular respiration',
    'Create a sequence diagram for online payment processing',
  ];

  return (
    <div className="fixed top-20 right-6 w-96 max-h-[calc(100vh-6.5rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 flex flex-col overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide flex items-center gap-2">
              StudyBot AI
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/25 font-normal uppercase">
                {aiState.status}
              </span>
            </h3>
            <p className="text-xs text-purple-200 flex items-center gap-1">
              <span>Backend:</span>
              <span className="font-medium text-white underline decoration-white/40">
                {aiState.activeBackend === 'local' ? 'WebLLM (WebGPU)' : 'Cloud API'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {aiState.lastCommandId && (
            <button
              onClick={() => undoAI()}
              title="Undo last AI diagram"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-xs"
            >
              <RotateCcw size={15} />
              Undo
            </button>
          )}
          <button
            onClick={() => dispatch(setStudyBotPanelOpen(false))}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Backend Settings Toggle (Cloud | Local | Auto) */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase">Engine:</span>
          <div className="inline-flex rounded-lg bg-gray-200/80 p-0.5 border border-gray-300/50">
            {(['auto', 'cloud', 'local'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => dispatch(setProviderMode(mode))}
                disabled={isBusy}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide transition-all ${
                  aiState.providerMode === mode
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode === 'auto' ? 'Auto' : mode === 'cloud' ? 'Cloud' : 'Local'}
              </button>
            ))}
          </div>
        </div>

        {/* WebGPU Status Pill */}
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
            webGpuSupported === true
              ? 'bg-green-100 text-green-700 border border-green-200'
              : webGpuSupported === false
              ? 'bg-gray-200 text-gray-600'
              : 'bg-yellow-50 text-yellow-700'
          }`}
          title={
            webGpuSupported === true
              ? 'WebGPU is supported on this browser'
              : 'WebGPU unavailable; Auto mode will use Cloud'
          }
        >
          {webGpuSupported === true ? <Cpu size={11} /> : <Cloud size={11} />}
          {webGpuSupported === true ? 'WebGPU ✓' : webGpuSupported === false ? 'No WebGPU' : 'Checking...'}
        </span>
      </div>

      {/* Download / Caching Progress Bar */}
      {aiState.downloadProgress !== null && (
        <div className="bg-indigo-50 px-3 py-2 border-b border-indigo-100 text-[11px] text-indigo-800">
          <div className="flex justify-between items-center font-medium mb-1">
            <span>Loading model weights into WebGPU cache...</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{aiState.downloadProgress}%</span>
              <button
                type="button"
                onClick={() => {
                  dispatch(setDownloadProgress(null));
                  dispatch(setProviderMode('cloud'));
                  dispatch(setActiveBackend('cloud'));
                  dispatch(setAIStatus({ status: 'idle', message: 'Switched to Cloud API.' }));
                }}
                className="text-[10px] text-indigo-600 hover:text-indigo-900 underline font-semibold cursor-pointer"
              >
                Skip to Cloud
              </button>
            </div>
          </div>
          <div className="w-full bg-indigo-200/80 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 transition-all duration-300"
              style={{ width: `${Math.max(5, aiState.downloadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Status banner */}
      {isBusy && (
        <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 flex items-center justify-between text-xs text-purple-700">
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-purple-600 flex-shrink-0" />
            <span className="font-medium truncate max-w-[210px]">
              {aiState.statusMessage || (aiState.status === 'thinking' ? 'Designing graph...' : 'Drawing on canvas...')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch(setAIStatus({ status: 'idle', message: 'Cancelled.' }));
              dispatch(setDownloadProgress(null));
            }}
            className="px-2 py-0.5 rounded bg-purple-200/80 hover:bg-purple-300 text-purple-800 text-[10px] font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {aiState.status === 'error' && aiState.statusMessage && (
        <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <span>{aiState.statusMessage}</span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[160px] max-h-[280px] bg-gray-50/50">
        {chatMessages.length === 0 ? (
          <div className="text-center py-6 text-gray-400 text-xs space-y-2">
            <MessageSquare size={28} className="mx-auto opacity-50" />
            <p>Ask StudyBot to draw any diagram, flowchart, or architecture directly on the canvas.</p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-xl text-xs ${
                msg.isSystem
                  ? 'bg-purple-50 border border-purple-100 text-purple-900'
                  : 'bg-white border border-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center justify-between font-semibold text-[11px] mb-1 opacity-75">
                <span>{msg.senderName}</span>
                <span className="font-normal text-[10px]">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="px-3 py-2 border-t border-gray-100 bg-white">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
          <Sparkles size={11} className="text-purple-600" />
          Diagram Templates
        </p>
        <div className="flex flex-wrap gap-1.5">
          {templates.map((tpl, i) => (
            <button
              key={i}
              onClick={() => handleQuickTemplate(tpl)}
              disabled={isBusy}
              className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-600 rounded-lg transition-colors border border-gray-200/60 text-left truncate max-w-full"
            >
              {tpl.split(' ')[2]} {tpl.split(' ')[3] || 'Diagram'}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white flex items-end gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask StudyBot to draw a diagram... (Enter to send)"
          disabled={isBusy}
          rows={2}
          className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none disabled:bg-gray-100 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isBusy || !prompt.trim()}
          className="p-2.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center"
        >
          {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};

export default StudyBotPanel;
