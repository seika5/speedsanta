'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { subscribeToRoom, joinRoom, startGame, addGift, copyRoomId, getRoom } from '../../../lib/firebase';
import { Room, Participant } from '../../../types';
import { QRCodeCanvas } from 'qrcode.react';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.id as string;
  
  const [room, setRoom] = useState<Room | null>(null);
  const [username, setUsername] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const router = useRouter();
  
  useEffect(() => {
    if (!roomId) return;

    // Get username from URL if available
    const urlUsername = searchParams.get('username');
    if (urlUsername && !username) {
      setUsername(urlUsername);
    }

    const unsubscribe = subscribeToRoom(roomId, (roomData) => {
      setRoom(roomData);
    });

    return () => unsubscribe();
  }, [roomId, username, searchParams]);

  useEffect(() => {
    if (room?.gameStarted) {
      setLoading(false);
    }
  }, [room?.gameStarted]);

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
      const updatedRoom = await getRoom(roomId);
      // If the game has started and the user is not already a participant, silently fail
      if (updatedRoom && updatedRoom.gameStarted && !updatedRoom.participants.find((p: any) => p.username === username)) {
        setLoading(false);
        return;
      }
      const success = await joinRoom(roomId, username);
      if (success) {
        setIsJoining(false);
        // Update the URL to include ?username=USERNAME
        router.replace(`/room/${roomId}?username=${encodeURIComponent(username)}`);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    setError('');
    setLoading(true);
    
    try {
      await startGame(roomId);
    } catch (error) {
      setError(`Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleCopyRoomId = async () => {
    try {
      await copyRoomId(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy room ID');
    }
  };

  function GiftForm({ roomId, currentUser, room }: { roomId: string, currentUser: Participant, room: Room }) {
    const [giftDescription, setGiftDescription] = useState('');
    const [giftAmount, setGiftAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAddGift = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      if (!currentUser?.recipient || !giftDescription.trim() || !giftAmount) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      const amount = parseInt(giftAmount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }
      try {
        await addGift(roomId, currentUser.username, currentUser.recipient, giftDescription, amount);
        setGiftDescription('');
        setGiftAmount('');
        setLoading(false);
      } catch {
        setError('Failed to add gift. Please try again.');
        setLoading(false);
      }
    };

    const recipient = room?.participants.find(p => p.username === currentUser.recipient);
    const remaining = recipient ? Math.max(room.budget - recipient.received, 0) : 0;

    return (
      <div className="p-4 border border-gray-300 rounded">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg">You are gifting to: {currentUser.recipient}</h2>
          {recipient && (
            <span className="text-green-600 text-sm">{remaining} remaining</span>
          )}
        </div>
        {error && (
          <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-red-700">{error}</div>
        )}
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
    );
  }

  const urlUsername = searchParams.get('username') || '';
  const currentUser = room?.participants.find(p => p.username === urlUsername) || null;

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
  if (!currentUser && !isJoining) {
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
  const visibleGifts = room.gifts;
  const allAtBudget = room.participants.every(p => p.received >= room.budget);

  // Calculate average spent
  const averageSpent = room.participants.length > 0
    ? (room.participants.reduce((sum, p) => sum + p.spent, 0) / room.participants.length)
    : 0;

  function StartGameButton({ onStart, disabled }: { onStart: () => Promise<void>, disabled: boolean }) {
    const [loading, setLoading] = useState(false);
    const handleClick = async () => {
      setLoading(true);
      await onStart();
      setLoading(false);
    };
    return (
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className="w-full p-4 border border-blue-300 rounded text-center hover:bg-blue-50 transition-colors disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Start SpeedSanta'}
      </button>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl mb-2">{room.name}</h1>
          <div className="flex items-center justify-between">
            <p>Budget: <span className="text-green-600">{room.budget}</span></p>
            <div className="flex gap-2">
              <button
                onClick={handleCopyRoomId}
                className="p-2 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
              >
                {copied ? (
                  <span className="flex items-center">✔</span>
                ) : (
                  'Room ID'
                )}
              </button>
              <button
                onClick={() => setShowQR(true)}
                className="p-2 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
              >
                QR Code
              </button>
            </div>
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
            <StartGameButton onStart={handleStartGame} disabled={room.participants.length < 3} />
          </div>
        )}

        {/* Game Interface */}
        {room.gameStarted && (
          <div className="space-y-6">
            {/* Game Status */}
            {allAtBudget && (
              <div className="p-4 bg-green-100 border border-green-300 rounded">
                <p className="text-center">All participants have reached their targets!</p>
              </div>
            )}

            {/* Your Assignment */}
            {currentUser?.isGifter && currentUser.recipient && (
              <GiftForm roomId={roomId} currentUser={currentUser} room={room} />
            )}

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

            {/* Balance Table */}
            <div className="p-4 border border-gray-300 rounded">
              <h2 className="text-lg mb-3">Balances</h2>
              <div className="mb-2 text-gray-700">Avg. Spent / Budget: <span className="ml-2 text-green-600">{averageSpent.toFixed(2)}</span> / <span className="text-green-600">{room.budget}</span></div>
              <div className="space-y-2">
                {room.participants.map(participant => (
                  <div key={participant.username} className="flex justify-between items-center">
                    <span>{participant.username}</span>
                    <div className="flex space-x-4">
                      <span className="mr-2">Spent:</span><span className="text-green-600">{participant.spent}</span>
                      <span className="mr-2">Received:</span><span className="text-green-600">{participant.received}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gifts */}
            {visibleGifts.length > 0 && (
              <div className="p-4 border border-gray-300 rounded">
                <h2 className="text-lg mb-3">Gifts</h2>
                <div className="space-y-2">
                  {visibleGifts.slice(-10).reverse().map(gift => (
                    <div key={gift.id} className="flex justify-between items-center">
                      <div>
                        <span>{gift.gifter}</span>
                        <span className="mx-2">→</span>
                        <span>{gift.recipient}</span>
                        <span className="ml-4">"</span><span className="text-red-600">{gift.description}</span><span>"</span>
                      </div>
                      <span className="text-green-600">{gift.amount}</span>
                    </div>
                  ))}
                </div>
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

      {showQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg flex flex-col items-center">
            <QRCodeCanvas value={typeof window !== 'undefined' ? window.location.origin + `/room/${roomId}` : ''} size={256} />
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 px-4 py-2 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 