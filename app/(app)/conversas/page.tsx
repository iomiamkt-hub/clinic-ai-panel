import { Header } from "@/components/layout/Header";
import { ConversationList } from "@/components/conversations/ConversationList";

export default function ConversasPage() {
  return (
    <div className="flex flex-col">
      <Header title="Conversas" description="Acompanhe e gerencie os atendimentos da Lorena" />
      <div className="p-8">
        <ConversationList />
      </div>
    </div>
  );
}
