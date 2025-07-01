export interface Participant {
  username: string;
  spent: number;
  received: number;
  isGifter: boolean;
  recipient?: string | null;
}

export interface Gift {
  id: string;
  gifter: string;
  recipient: string;
  description: string;
  amount: number;
  timestamp: number;
  isHidden: boolean;
}

export interface Assignment {
  gifter: string;
  recipient: string;
}

export interface Room {
  id: string;
  name: string;
  budget: number;
  gameStarted: boolean;
  participants: Participant[];
  gifts: Gift[];
  activeAssignments: Assignment[];
  createdAt: number;
  createdBy: string;
}

export interface CreateRoomData {
  roomName: string;
  username: string;
  budget: number;
}

export interface JoinRoomData {
  roomId: string;
  username: string;
} 