export type ConversationStatus = "ACTIVE" | "WAITING_HUMAN" | "COMPLETED";

export interface Conversation {
  id: string;
  patientName: string;
  phone: string;
  stage: string;
  status: ConversationStatus;
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "PATIENT" | "LORENA" | "HUMAN";
  content: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  dateTime: string;
  doctor: string;
  status: string;
}

export interface MetricsSummary {
  messagesToday: number;
  activeConversations: number;
  confirmedAppointments: number;
  escalatedToHuman: number;
  messagesLast7Days: { date: string; count: number }[];
  recentConversations: Conversation[];
}

export interface TrainingExample {
  id: string;
  question: string;
  answer: string;
}

export interface ClinicConfig {
  clinicName: string;
  phoneVicosa: string;
  phoneFlorianopolis: string;
  email: string;
  humanDelayMin: number;
  humanDelayMax: number;
  msPerCharacter: number;
}
