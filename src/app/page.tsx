'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, joinRoom } from '../lib/firebase';
import { CreateRoomData, JoinRoomData } from '../types';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [createData, setCreateData] = useState<CreateRoomData>({
    roomName: '',
    username: '',
    budget: 0
  });

  const [joinData, setJoinData] = useState<JoinRoomData>({
    roomId: '',
    username: ''
  });

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!createData.roomName.trim() || !createData.username.trim() || createData.budget <= 0) {
      setError('Please fill in all fields with valid values');
      setLoading(false);
      return;
    }

    try {
      const roomId = await createRoom(createData);
      router.push(`/room/${roomId}?username=${encodeURIComponent(createData.username)}`);
    } catch {
      setError('Failed to create room. Please try again.');
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!joinData.roomId.trim() || !joinData.username.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const success = await joinRoom(joinData.roomId, joinData.username);
      if (success) {
        router.push(`/room/${joinData.roomId}?username=${encodeURIComponent(joinData.username)}`);
      } else {
        setError('Room not found or you cannot join this room');
        setLoading(false);
      }
    } catch {
      setError('Failed to join room. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-3xl text-center mb-8">SpeedSanta</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}

        {!isCreating && !isJoining && (
          <div className="space-y-4">
            <button
              onClick={() => setIsCreating(true)}
              className="w-full p-4 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors"
            >
              Create Room
            </button>
            <button
              onClick={() => setIsJoining(true)}
              className="w-full p-4 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors"
            >
              Join Room
            </button>
            <button
              onClick={() => router.push('/help')}
              className="w-full p-4 border border-green-300 rounded text-center hover:bg-green-50 transition-colors"
            >
              How to Play
            </button>
          </div>
        )}

        {isCreating && (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block mb-2">Your Name</label>
              <input
                type="text"
                value={createData.username}
                onChange={(e) => setCreateData({...createData, username: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Room Name</label>
              <input
                type="text"
                value={createData.roomName}
                onChange={(e) => setCreateData({...createData, roomName: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter room name"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Budget</label>
              <input
                type="number"
                value={createData.budget || ''}
                onChange={(e) => setCreateData({...createData, budget: parseInt(e.target.value) || 0})}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter budget amount"
                min="1"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 p-3 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Room'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setError('');
                  setCreateData({ roomName: '', username: '', budget: 0 });
                }}
                className="flex-1 p-3 border border-gray-300 rounded text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {isJoining && (
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block mb-2">Your Name</label>
              <input
                type="text"
                value={joinData.username}
                onChange={(e) => setJoinData({...joinData, username: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block mb-2">Room ID</label>
              <input
                type="text"
                value={joinData.roomId}
                onChange={(e) => setJoinData({...joinData, roomId: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter room ID"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 p-3 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join Room'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsJoining(false);
                  setError('');
                  setJoinData({ roomId: '', username: '' });
                }}
                className="flex-1 p-3 border border-gray-300 rounded text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
