import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Room, Participant, Gift, Assignment, CreateRoomData } from '../types';

const ROOMS_COLLECTION = 'rooms';

// Create a new room
export const createRoom = async (data: CreateRoomData): Promise<string> => {
  const roomRef = doc(collection(db, ROOMS_COLLECTION));
  const roomId = roomRef.id;
  
  const initialParticipant: Participant = {
    username: data.username,
    spent: 0,
    received: 0,
    isGifter: false
  };

  const room: Omit<Room, 'id'> = {
    name: data.roomName,
    budget: data.budget,
    gameStarted: false,
    participants: [initialParticipant],
    gifts: [],
    activeAssignments: [],
    createdAt: Date.now(),
    createdBy: data.username
  };

  await setDoc(roomRef, room);
  return roomId;
};

// Get room data
export const getRoom = async (roomId: string): Promise<Room | null> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  
  if (roomDoc.exists()) {
    return { id: roomId, ...roomDoc.data() } as Room;
  }
  return null;
};

// Subscribe to room updates
export const subscribeToRoom = (roomId: string, callback: (room: Room | null) => void) => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      const room = { id: roomId, ...doc.data() } as Room;
      callback(room);
    } else {
      callback(null);
    }
  });
};

// Join a room
export const joinRoom = async (roomId: string, username: string): Promise<boolean> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  
  if (!roomDoc.exists()) {
    return false;
  }
  
  const room = roomDoc.data() as Omit<Room, 'id'>;
  
  // Check if game has started and user is not already a participant
  if (room.gameStarted && !room.participants.find(p => p.username === username)) {
    return false;
  }
  
  // Check if user already exists
  const existingParticipant = room.participants.find(p => p.username === username);
  if (existingParticipant) {
    return true; // User already in room
  }
  
  // Add new participant
  const newParticipant: Participant = {
    username,
    spent: 0,
    received: 0,
    isGifter: false
  };
  
  await updateDoc(roomRef, {
    participants: arrayUnion(newParticipant)
  });
  
  return true;
};

// Start SpeedSanta game
export const startGame = async (roomId: string): Promise<void> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  
  if (!roomDoc.exists()) {
    throw new Error('Room not found');
  }
  
  const room = roomDoc.data() as Omit<Room, 'id'>;
  
  if (room.participants.length < 3) {
    throw new Error('Need at least 3 participants to start');
  }
  
  // Create initial assignments
  const prevGifters = room.activeAssignments ? room.activeAssignments.map(a => a.gifter) : [];
  const assignments = createAssignments(room.participants, room.budget, prevGifters);
  
  const updatedParticipants = room.participants.map(p => ({
    ...p,
    isGifter: assignments.some(a => a.gifter === p.username),
    recipient: assignments.find(a => a.gifter === p.username)?.recipient ?? null
  }));
  
  await updateDoc(roomRef, {
    gameStarted: true,
    activeAssignments: assignments,
    participants: updatedParticipants
  });
};

// Create assignments for gifters
const createAssignments = (participants: Participant[], budget: number, prevGifters: string[] = []): Assignment[] => {
  const eligibleRecipients = participants.filter(p => p.received < budget);
  
  // First, check if there are people who haven't made a gift yet (spent = 0)
  const peopleWhoHaventGifted = participants.filter(p => p.spent === 0 && !prevGifters.includes(p.username));
  
  // If there are people who haven't gifted yet, only select from them
  // Otherwise, select from anyone who hasn't been a gifter recently
  const availableGifters = peopleWhoHaventGifted.length > 0 
    ? peopleWhoHaventGifted
    : participants.filter(p => !p.isGifter && !prevGifters.includes(p.username));

  if (eligibleRecipients.length === 0 || availableGifters.length === 0) {
    return [];
  }

  const maxGifters = Math.floor(participants.length / 2);
  const assignments: Assignment[] = [];

  // Shuffle arrays for randomness
  const shuffledRecipients = [...eligibleRecipients].sort(() => Math.random() - 0.5);
  const shuffledGifters = [...availableGifters].sort(() => Math.random() - 0.5);

  const usedRecipients = new Set<string>();
  for (const gifter of shuffledGifters) {
    const recipient = shuffledRecipients.find(
      r => r.username !== gifter.username && !usedRecipients.has(r.username)
    );
    if (recipient) {
      assignments.push({
        gifter: gifter.username,
        recipient: recipient.username
      });
      usedRecipients.add(recipient.username);
      if (assignments.length >= maxGifters) break;
    }
  }

  return assignments;
};

// Add a gift
export const addGift = async (
  roomId: string, 
  gifter: string, 
  recipient: string, 
  description: string, 
  amount: number
): Promise<void> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  
  if (!roomDoc.exists()) {
    throw new Error('Room not found');
  }
  
  const room = roomDoc.data() as Omit<Room, 'id'>;
  
  const gift: Gift = {
    id: Date.now().toString(),
    gifter,
    recipient,
    description,
    amount
  };
  
  // Update participants' spent/received amounts
  const updatedParticipants = room.participants.map(p => {
    if (p.username === gifter) {
      return { ...p, spent: p.spent + amount };
    }
    if (p.username === recipient) {
      return { ...p, received: p.received + amount };
    }
    return p;
  });
  
  // Remove the assignment
  const updatedAssignments = room.activeAssignments.filter(
    a => !(a.gifter === gifter && a.recipient === recipient)
  );
  
  // Update gifter status
  const finalParticipants = updatedParticipants.map(p => {
    if (p.username === gifter) {
      return { ...p, isGifter: false, recipient: null };
    }
    return p;
  });
  
  // Create new assignments if there are eligible recipients
  const newAssignments = createNewAssignments(finalParticipants, room.budget, updatedAssignments, [gifter]);
  
  // Update participants with new assignments
  const finalParticipantsWithAssignments = finalParticipants.map(p => ({
    ...p,
    isGifter: [...updatedAssignments, ...newAssignments].some(a => a.gifter === p.username),
    recipient: [...updatedAssignments, ...newAssignments].find(a => a.gifter === p.username)?.recipient ?? null
  }));
  
  await updateDoc(roomRef, {
    gifts: arrayUnion(gift),
    participants: finalParticipantsWithAssignments,
    activeAssignments: [...updatedAssignments, ...newAssignments]
  });
};

// Create new assignments after a gift is completed
const createNewAssignments = (
  participants: Participant[], 
  budget: number, 
  currentAssignments: Assignment[],
  excludeGifters: string[] = []
): Assignment[] => {
  const eligibleRecipients = participants.filter(p => p.received < budget);
  const prevGifters = currentAssignments.map(a => a.gifter);
  
  // First, check if there are people who haven't made a gift yet (spent = 0)
  const peopleWhoHaventGifted = participants.filter(p => 
    p.spent === 0 && 
    !currentAssignments.some(a => a.gifter === p.username) &&
    !prevGifters.includes(p.username) &&
    !excludeGifters.includes(p.username)
  );
  
  // If there are people who haven't gifted yet, only select from them
  // Otherwise, select from anyone who hasn't been a gifter recently
  const availableGifters = peopleWhoHaventGifted.length > 0 
    ? peopleWhoHaventGifted
    : participants.filter(p => 
        !p.isGifter && 
        !currentAssignments.some(a => a.gifter === p.username) &&
        !prevGifters.includes(p.username) &&
        !excludeGifters.includes(p.username)
      );

  if (eligibleRecipients.length === 0 || availableGifters.length === 0) {
    return [];
  }

  const maxGifters = Math.floor(participants.length / 2);
  const currentGifterCount = currentAssignments.length;

  if (currentGifterCount >= maxGifters) {
    return [];
  }

  const assignments: Assignment[] = [];
  const shuffledRecipients = [...eligibleRecipients].sort(() => Math.random() - 0.5);
  const shuffledGifters = [...availableGifters].sort(() => Math.random() - 0.5);

  const usedRecipients = new Set<string>(currentAssignments.map(a => a.recipient));
  for (const gifter of shuffledGifters) {
    const recipient = shuffledRecipients.find(
      r => r.username !== gifter.username && !usedRecipients.has(r.username)
    );
    if (recipient) {
      assignments.push({
        gifter: gifter.username,
        recipient: recipient.username
      });
      usedRecipients.add(recipient.username);
      if (assignments.length + currentGifterCount >= maxGifters) break;
    }
  }

  return assignments;
};

// Copy room ID to clipboard
export const copyRoomId = (roomId: string): Promise<void> => {
  return navigator.clipboard.writeText(roomId);
}; 