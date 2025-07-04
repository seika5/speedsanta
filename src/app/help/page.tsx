'use client';

import { useRouter } from 'next/navigation';

export default function Help() {
  const router = useRouter();

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">How to Play SpeedSanta</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-500 rounded hover:bg-blue-600 transition-colors"
          >
            Back to Home
          </button>
        </div>

        {/* Game Context */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">🎄 About SpeedSanta</h2>
          <div className="prose max-w-none text-gray-700">
            <p className="mb-4">
              SpeedSanta is my take on Secret Santa; it&apos;s a fast-paced, real-time gift exchange game.
            </p>
            <p>
              The game takes aspects from Secret Santa, the joy of giving and the element of surprise,
              and turns it into a long-form zero-prep game.
            </p>
          </div>
        </div>

        {/* Game Rules */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">📋 Game Rules</h2>
          
          <div className="space-y-6">
            {/* Setup */}
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">🎯 Setup</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>One player creates a room and sets the budget</li>
                <li>(No currency denominator at the moment; eg. for USD please x100 to represent cents)</li>
                <li>Share the room ID with other players so they can join</li>
              </ul>
            </div>

            {/* Gameplay */}
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">🎮 How to Play</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Half the room is a Secret Santa</li>
                <li>Go shop at the mall/store/outlet/etc with the group</li>
                <li>Select gifts that you think your recipient would love</li>
                <li>Gift on the spot (and crack a funny joke or two)</li>
                <li>A new Secret Santa is chosen</li>
                <li>Repeat until everyone has received a gift amount equal to the budget</li>
                <li>Pay each other back the difference so that everyone spends and receives roughly the same amount</li>
              </ul>
            </div>

            {/* Tips */}
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-3">💡 Pro Tips</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>Try not to influence someone&apos;s gift if you suspect you&apos;re the recipient, let them cook!</li>
                <li>Try not to spend too much of someone&apos;s budget in one gift!</li>
                <li>Have fun and be creative with your gift choices!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 