import { ConversationFullView } from "@/components/conversations/ConversationFullView";

interface ConversaPageProps {
  params: { id: string };
}

export default function ConversaPage({ params }: ConversaPageProps) {
  return <ConversationFullView conversationId={params.id} />;
}
