export type ConversationStatus = "ACTIVE" | "WAITING_HUMAN" | "COMPLETED";

export type ConversationStage =
  | "GREETING"
  | "COLLECTING_INFO"
  | "CHECKING_AVAILABILITY"
  | "CONFIRMING"
  | "COMPLETED"
  | "ESCALATED"
  | string;

export interface Patient {
  name?: string | null;
  phone?: string | null;
}

export interface LastMessage {
  content?: string | null;
  sender?: "PATIENT" | "LORENA" | "HUMAN";
  sentAt?: string;
  createdAt?: string;
}

export interface ConversationMessage {
  sentAt?: string;
  createdAt?: string;
  sender?: "PATIENT" | "LORENA" | "HUMAN";
  content?: string | null;
}

export interface Conversation {
  id: string;
  patient?: Patient | null;
  stage?: ConversationStage | null;
  status: ConversationStatus;
  lastMessage?: LastMessage | null;
  messages?: ConversationMessage[];
  lastMessageAt?: string | null;
  updatedAt: string;
  createdAt: string;
  aiEnabled?: boolean;
  tags?: string[];
  notes?: string | null;
  firstMessageAt?: string | null;
  appointment?: Appointment | null;
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

export interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

export type WeekSchedule = Record<
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
  DaySchedule
>;

export interface ClinicConfig {
  clinicName: string;
  phoneVicosa: string;
  phoneFlorianopolis: string;
  email: string;
  humanDelayMin: number;
  humanDelayMax: number;
  msPerCharacter: number;
  globalAiEnabled?: boolean;
  pauseAiOnCompleted?: boolean;
  schedule?: WeekSchedule;
  outOfHoursMessage?: string;
}
