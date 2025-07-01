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
  
  if (room.participants.length < 2) {
    throw new Error('Need at least 2 participants to start');
  }
  
  console.log('Starting game with participants:', room.participants);
  console.log('Budget:', room.budget);
  
  // Create initial assignments
  const assignments = createAssignments(room.participants, room.budget);
  
  console.log('Created assignments:', assignments);
  
  const updatedParticipants = room.participants.map(p => ({
    ...p,
    isGifter: assignments.some(a => a.gifter === p.username),
    recipient: assignments.find(a => a.gifter === p.username)?.recipient ?? null
  }));
  
  console.log('Updated participants:', updatedParticipants);
  
  await updateDoc(roomRef, {
    gameStarted: true,
    activeAssignments: assignments,
    participants: updatedParticipants
  });
};

// Create assignments for gifters
const createAssignments = (participants: Participant[], budget: number): Assignment[] => {
  const eligibleRecipients = participants.filter(p => p.received < budget);
  const availableGifters = participants.filter(p => !p.isGifter);
  
  if (eligibleRecipients.length === 0 || availableGifters.length === 0) {
    return [];
  }
  
  const maxGifters = Math.floor(participants.length / 2);
  const assignments: Assignment[] = [];
  
  // Shuffle arrays for randomness
  const shuffledRecipients = [...eligibleRecipients].sort(() => Math.random() - 0.5);
  const shuffledGifters = [...availableGifters].sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(maxGifters, shuffledGifters.length, shuffledRecipients.length); i++) {
    assignments.push({
      gifter: shuffledGifters[i].username,
      recipient: shuffledRecipients[i].username
    });
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
    amount,
    timestamp: Date.now(),
    isHidden: true // Hidden until all participants reach budget
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
  const newAssignments = createNewAssignments(finalParticipants, room.budget, updatedAssignments);
  
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
  currentAssignments: Assignment[]
): Assignment[] => {
  const eligibleRecipients = participants.filter(p => p.received < budget);
  const availableGifters = participants.filter(p => 
    !p.isGifter && 
    !currentAssignments.some(a => a.gifter === p.username)
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
  
  for (let i = 0; i < Math.min(maxGifters - currentGifterCount, shuffledGifters.length, shuffledRecipients.length); i++) {
    assignments.push({
      gifter: shuffledGifters[i].username,
      recipient: shuffledRecipients[i].username
    });
  }
  
  return assignments;
};

// Reveal gifts when all participants reach budget
export const revealGifts = async (roomId: string): Promise<void> => {
  const roomRef = doc(db, ROOMS_COLLECTION, roomId);
  const roomDoc = await getDoc(roomRef);
  
  if (!roomDoc.exists()) {
    return;
  }
  
  const room = roomDoc.data() as Omit<Room, 'id'>;
  const allAtBudget = room.participants.every(p => p.received >= room.budget);
  
  if (allAtBudget) {
    const revealedGifts = room.gifts.map(gift => ({ ...gift, isHidden: false }));
    await updateDoc(roomRef, { gifts: revealedGifts });
  }
};

// Copy room ID to clipboard
export const copyRoomId = (roomId: string): Promise<void> => {
  return navigator.clipboard.writeText(roomId);
}; 