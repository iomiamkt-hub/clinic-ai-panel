import { Header } from "@/components/layout/Header";
import { BehaviorEditor } from "@/components/training/BehaviorEditor";
import { ChatPreview } from "@/components/training/ChatPreview";

export default function TreinamentoPage() {
  return (
    <div className="flex flex-col">
      <Header title="Treinamento" description="Configure o comportamento e a identidade da Lorena" />
      <div className="flex flex-col gap-6 p-8">
        <BehaviorEditor />
        <ChatPreview />
      </div>
    </div>
  );
}
