import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Users, Plus, ArrowRight, X, Shuffle } from 'lucide-react';
import { setRoomId } from '../store/whiteboardSlice';

interface RoomSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RoomSelectionModal: React.FC<RoomSelectionModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [roomInput, setRoomInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const generateRandomRoomId = () => {
    const adjectives = ['Creative', 'Bright', 'Swift', 'Bold', 'Smart', 'Quick', 'Cool', 'Fresh'];
    const nouns = ['Studio', 'Space', 'Lab', 'Room', 'Board', 'Canvas', 'Workspace', 'Hub'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${adjective}-${noun}-${number}`;
  };

  const handleJoinRoom = async (roomId: string) => {
    if (!roomId.trim()) return;
    
    setIsJoining(true);
    
    // Simulate a brief loading state for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    dispatch(setRoomId(roomId.trim()));
    setIsJoining(false);
    onClose();
  };

  const handleCreateNewRoom = () => {
    const newRoomId = generateRandomRoomId();
    setRoomInput(newRoomId);
  };

  const handleQuickJoin = (roomId: string) => {
    handleJoinRoom(roomId);
  };

  const recentRooms = [
    'Design-Team-Alpha',
    'Project-Beta-2024',
    'Brainstorm-Session',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-scaleIn">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Join Whiteboard</h2>
                <p className="text-sm text-gray-600">Collaborate in real-time</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Create New Room */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Create New Whiteboard
            </h3>
            <button
              onClick={handleCreateNewRoom}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className="flex items-center justify-center gap-3 text-gray-600 group-hover:text-blue-600">
                <Plus size={20} />
                <span className="font-medium">Create New Room</span>
                <Shuffle size={16} className="opacity-60" />
              </div>
            </button>
          </div>

          {/* Join Existing Room */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Join Existing Room
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="Enter room ID..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinRoom(roomInput);
                    }
                  }}
                />
                <button
                  onClick={() => handleJoinRoom(roomInput)}
                  disabled={!roomInput.trim() || isJoining}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                    roomInput.trim() && !isJoining
                      ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isJoining ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Rooms */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Recent Rooms
            </h3>
            <div className="space-y-2">
              {recentRooms.map((roomId, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickJoin(roomId)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                        <Users size={14} className="text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-800">{roomId}</span>
                    </div>
                    <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 rounded-b-2xl">
          <div className="text-xs text-gray-500 text-center">
            <p className="mb-1">💡 <strong>Tip:</strong> Share the room ID with others to collaborate</p>
            <p>Anyone with the room ID can join and edit together</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomSelectionModal;