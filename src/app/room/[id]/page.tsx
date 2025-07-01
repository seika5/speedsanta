'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { subscribeToRoom, joinRoom, startGame, addGift, copyRoomId, revealGifts } from '../../../lib/firebase';
import { Room, Participant } from '../../../types';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  
  // Gift form state
  const [giftDescription, setGiftDescription] = useState('');
  const [giftAmount, setGiftAmount] = useState('');

  useEffect(() => {
    if (!roomId) return;

    // Get username from URL if available
    const urlUsername = searchParams.get('username');
    if (urlUsername && !username) {
      setUsername(urlUsername);
    }

    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
      
      // Check if current user is in the room
      if (roomData && username) {
        const user = roomData.participants.find(p => p.username === username);
        setCurrentUser(user || null);
      }
      
      // Check if gifts should be revealed
      if (roomData && roomData.gameStarted) {
        const allAtBudget = roomData.participants.every(p => p.received >= roomData.budget);
        if (allAtBudget) {
          revealGifts(roomId);
        }
      }
    });

    return () => unsubscribe();
  }, [roomId, username, searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Please enter your name');
      setLoading(false);
      return;
    }

    try {
      const success = await joinRoom(roomId, username);
      if (success) {
        setIsJoining(false);
        setCurrentUser(room?.participants.find(p => p.username === username) || null);
      } else {
        setError('Cannot join this room. It may not exist or the game has already started.');
        setLoading(false);
      }
    } catch {
      setError('Failed to join room. Please try again.');
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    setError('');
    setLoading(true);
    
    try {
      await startGame(roomId);
    } catch (error) {
      console.error('Start game error:', error);
      setError(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleAddGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!currentUser?.recipient || !giftDescription.trim() || !giftAmount) {
      setError('Please fill in all fields');
      return;
    }

    const amount = parseInt(giftAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (currentUser.spent + amount > room!.budget) {
      setError('This would exceed your budget');
      return;
    }

    setLoading(true);
    
    try {
      await addGift(roomId, currentUser.username, currentUser.recipient, giftDescription, amount);
      setGiftDescription('');
      setGiftAmount('');
    } catch {
      setError('Failed to add gift. Please try again.');
      setLoading(false);
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await copyRoomId(roomId);
      // Could add a toast notification here
    } catch {
      setError('Failed to copy room ID');
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4">Loading...</div>
        </div>
      </div>
    );
  }

  // Show join form if user is not in the room and no username has been provided
  if (!currentUser && !isJoining && !username) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <h1 className="text-2xl text-center mb-6">{room.name}</h1>
          <p className="text-center mb-6">Join this SpeedSanta room</p>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block mb-2">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter your name"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full p-3 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Room'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Show join form if user is joining
  if (isJoining) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <h1 className="text-2xl text-center mb-6">{room.name}</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
              {error}
            </div>
          )}
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block mb-2">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded"
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 p-3 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining...' : 'Join'}
              </button>
              <button
                type="button"
                onClick={() => setIsJoining(false)}
                className="flex-1 p-3 border border-gray-300 rounded text-center hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const currentGifters = room.participants.filter(p => p.isGifter);
  const visibleGifts = room.gifts.filter(gift => !gift.isHidden || gift.gifter === currentUser?.username);
  const allAtBudget = room.participants.every(p => p.received >= room.budget);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl mb-2">{room.name}</h1>
          <div className="flex items-center justify-between">
            <p>Budget: <span className="text-green-600">{room.budget}</span></p>
            <button
              onClick={handleCopyRoomId}
              className="p-2 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
            >
              Share Room
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}

        {/* Start Game Button */}
        {!room.gameStarted && (
          <div className="mb-6">
            <button
              onClick={handleStartGame}
              disabled={loading || room.participants.length < 2}
              className="w-full p-4 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start SpeedSanta'}
            </button>
          </div>
        )}

        {/* Game Interface */}
        {room.gameStarted && (
          <div className="space-y-6">
            {/* Current Gifters */}
            <div className="p-4 border border-gray-300 rounded">
              <h2 className="text-lg mb-3">Current Gifters</h2>
              {currentGifters.length > 0 ? (
                <div className="space-y-2">
                  {currentGifters.map(gifter => (
                    <div key={gifter.username} className="flex justify-between items-center">
                      <span>{gifter.username}</span>
                      <span className="text-green-600">Spent: {gifter.spent}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No active gifters</p>
              )}
            </div>

            {/* Your Assignment */}
            {currentUser?.isGifter && currentUser.recipient && (
              <div className="p-4 border border-gray-300 rounded">
                <h2 className="text-lg mb-3">You are gifting to: {currentUser.recipient}</h2>
                <form onSubmit={handleAddGift} className="space-y-3">
                  <div>
                    <label className="block mb-1">Gift Description</label>
                    <input
                      type="text"
                      value={giftDescription}
                      onChange={(e) => setGiftDescription(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded"
                      placeholder="Describe the gift"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1">Amount</label>
                    <input
                      type="number"
                      value={giftAmount}
                      onChange={(e) => setGiftAmount(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded"
                      placeholder="Enter amount"
                      min="1"
                      max={room.budget - currentUser.spent}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full p-3 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Adding...' : 'Add Gift'}
                  </button>
                </form>
              </div>
            )}

            {/* Balance Table */}
            <div className="p-4 border border-gray-300 rounded">
              <h2 className="text-lg mb-3">Balances</h2>
              <div className="space-y-2">
                {room.participants.map(participant => (
                  <div key={participant.username} className="flex justify-between items-center">
                    <span>{participant.username}</span>
                    <div className="flex space-x-4">
                      <span className="text-green-600">Spent: {participant.spent}</span>
                      <span className="text-green-600">Received: {participant.received}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Gifts */}
            {visibleGifts.length > 0 && (
              <div className="p-4 border border-gray-300 rounded">
                <h2 className="text-lg mb-3">Recent Gifts</h2>
                <div className="space-y-2">
                  {visibleGifts.slice(-10).reverse().map(gift => (
                    <div key={gift.id} className="flex justify-between items-center">
                      <div>
                        <span>{gift.gifter}</span>
                        <span className="mx-2">→</span>
                        <span>{gift.recipient}</span>
                        {!gift.isHidden && (
                          <span className="ml-2 text-gray-600">({gift.description})</span>
                        )}
                      </div>
                      <span className="text-green-600">{gift.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Game Status */}
            {allAtBudget && (
              <div className="p-4 bg-green-100 border border-green-300 rounded">
                <p className="text-center">All participants have reached their budget! Gifts are now visible.</p>
              </div>
            )}
          </div>
        )}

        {/* Participants List */}
        <div className="mt-6 p-4 border border-gray-300 rounded">
          <h2 className="text-lg mb-3">Participants ({room.participants.length})</h2>
          <div className="space-y-1">
            {room.participants.map(participant => (
              <div key={participant.username} className="flex justify-between items-center">
                <span>{participant.username}</span>
                {participant.isGifter && <span className="text-blue-600">Gifting</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 