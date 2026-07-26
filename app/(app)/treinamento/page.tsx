import { Header } from "@/components/layout/Header";
import { PromptEditor } from "@/components/training/PromptEditor";
import { ExamplesList } from "@/components/training/ExamplesList";
import { ChatPreview } from "@/components/training/ChatPreview";
import { AttendanceFlowchart } from "@/components/training/AttendanceFlowchart";

export default function TreinamentoPage() {
  return (
    <div className="flex flex-col">
      <Header title="Treinamento" description="Ajuste o comportamento e as respostas da Lorena" />
      <div className="flex flex-col gap-6 p-8">
        <PromptEditor />
        <AttendanceFlowchart />
        <ExamplesList />
        <ChatPreview />
      </div>
    </div>
  );
}
