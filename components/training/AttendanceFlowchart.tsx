"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AttendanceFlowchart() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-primary">Fluxograma de Atendimento da Lorena</h2>
          <p className="text-xs text-muted-foreground">Visão geral dos 4 caminhos de atendimento automatizados</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" />
          Imprimir fluxograma
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-white p-4 shadow-sm">
        <svg
          width="100%"
          viewBox="0 0 1080 1020"
          xmlns="http://www.w3.org/2000/svg"
          style={{ minWidth: 680, display: "block" }}
          aria-label="Fluxograma de atendimento da Lorena"
        >
          {/* ── Styles ── */}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#16a34a" />
            </marker>
            <marker id="arrow-red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* ══════════════════════════════════════════
              TITLE ROW
          ══════════════════════════════════════════ */}

          {/* === INÍCIO === */}
          <rect x="440" y="10" width="200" height="36" rx="18" fill="#94a3b8" />
          <text x="540" y="33" textAnchor="middle" fill="white" fontSize="13" fontWeight="600">Mensagem do Paciente</text>

          {/* arrow down */}
          <line x1="540" y1="46" x2="540" y2="70" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Saudação */}
          <rect x="420" y="70" width="240" height="36" rx="6" fill="#0d9488" />
          <text x="540" y="93" textAnchor="middle" fill="white" fontSize="12" fontWeight="500">Lorena saúda e identifica intenção</text>

          {/* arrow down */}
          <line x1="540" y1="106" x2="540" y2="128" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Decisão principal */}
          <polygon points="540,128 700,166 540,204 380,166" fill="#f59e0b" />
          <text x="540" y="162" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Qual é a</text>
          <text x="540" y="178" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">intenção?</text>

          {/* ══════════════════════════════════════════
              CAMINHO 1 – DÚVIDA  (far left, x≈80)
          ══════════════════════════════════════════ */}
          {/* arrow left from diamond */}
          <line x1="380" y1="166" x2="140" y2="166" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="260" y="158" textAnchor="middle" fill="#64748b" fontSize="11">Dúvida</text>

          <rect x="20" y="148" width="120" height="36" rx="6" fill="#7c3aed" />
          <text x="80" y="168" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Convênio /</text>
          <text x="80" y="181" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Valor</text>

          <line x1="80" y1="184" x2="80" y2="220" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="20" y="220" width="120" height="36" rx="6" fill="#7c3aed" />
          <text x="80" y="243" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Lorena responde</text>

          <line x1="80" y1="256" x2="80" y2="288" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="10" y="288" width="140" height="36" rx="6" fill="#0d9488" />
          <text x="80" y="308" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Oferece agendamento</text>
          <text x="80" y="321" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">ao final</text>

          {/* ══════════════════════════════════════════
              CAMINHO 4 – URGÊNCIA  (2nd left, x≈270)
          ══════════════════════════════════════════ */}
          <line x1="435" y1="185" x2="300" y2="250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="345" y="225" textAnchor="middle" fill="#64748b" fontSize="11">Urgência</text>

          <rect x="200" y="250" width="150" height="36" rx="6" fill="#dc2626" />
          <text x="275" y="270" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Urgência ocular</text>
          <text x="275" y="283" textAnchor="middle" fill="white" fontSize="11">(perda visão, trauma)</text>

          <line x1="275" y1="286" x2="275" y2="318" stroke="#dc2626" strokeWidth="1.5" markerEnd="url(#arrow-red)" />

          <polygon points="275,318 360,348 275,378 190,348" fill="#f59e0b" />
          <text x="275" y="344" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Horário</text>
          <text x="275" y="360" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">comercial?</text>

          {/* SIM → escalar */}
          <line x1="275" y1="378" x2="275" y2="410" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="285" y="400" fill="#64748b" fontSize="11">Sim</text>
          <rect x="185" y="410" width="180" height="46" rx="6" fill="#ec4899" />
          <text x="275" y="428" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Escalar secretária</text>
          <text x="275" y="443" textAnchor="middle" fill="white" fontSize="11">+ passar telefone</text>

          {/* NÃO → UPA */}
          <line x1="360" y1="348" x2="430" y2="348" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="390" y="340" fill="#64748b" fontSize="11">Não</text>
          <rect x="430" y="330" width="160" height="36" rx="6" fill="#dc2626" />
          <text x="510" y="350" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Orientar UPA +</text>
          <text x="510" y="363" textAnchor="middle" fill="white" fontSize="11">próximo dia útil</text>

          {/* ══════════════════════════════════════════
              CAMINHO 2 – AGENDAR  (center, x≈620)
          ══════════════════════════════════════════ */}
          <line x1="540" y1="204" x2="540" y2="250" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="560" y="232" fill="#64748b" fontSize="11">Agendar</text>

          {/* Coleta dados */}
          <rect x="630" y="250" width="180" height="36" rx="6" fill="#7c3aed" />
          <text x="720" y="270" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Coletar: nome, convênio</text>
          <text x="720" y="283" textAnchor="middle" fill="white" fontSize="11">motivo da consulta</text>

          <line x1="620" y1="268" x2="630" y2="268" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <line x1="540" y1="204" x2="620" y2="268" stroke="#64748b" strokeWidth="1.5" />

          <line x1="720" y1="286" x2="720" y2="316" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="630" y="316" width="180" height="36" rx="6" fill="#7c3aed" />
          <text x="720" y="336" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Unidade + data +</text>
          <text x="720" y="349" textAnchor="middle" fill="white" fontSize="11">período preferido</text>

          <line x1="720" y1="352" x2="720" y2="382" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="630" y="382" width="180" height="36" rx="6" fill="#7c3aed" />
          <text x="720" y="405" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Data de nascimento</text>

          <line x1="720" y1="418" x2="720" y2="448" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* check_availability */}
          <rect x="620" y="448" width="200" height="36" rx="6" fill="#1d4ed8" />
          <text x="720" y="468" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">⚙ check_availability</text>
          <text x="720" y="481" textAnchor="middle" fill="white" fontSize="10">(verificar agenda)</text>

          <line x1="720" y1="484" x2="720" y2="514" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* Decisão: horários disponíveis? */}
          <polygon points="720,514 830,546 720,578 610,546" fill="#f59e0b" />
          <text x="720" y="542" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Horários</text>
          <text x="720" y="558" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">disponíveis?</text>

          {/* SIM → apresentar horários */}
          <line x1="720" y1="578" x2="720" y2="608" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="730" y="600" fill="#64748b" fontSize="11">Sim</text>
          <rect x="620" y="608" width="200" height="36" rx="6" fill="#0d9488" />
          <text x="720" y="628" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Apresentar até 3</text>
          <text x="720" y="641" textAnchor="middle" fill="white" fontSize="11">horários disponíveis</text>

          <line x1="720" y1="644" x2="720" y2="674" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="620" y="674" width="200" height="36" rx="6" fill="#7c3aed" />
          <text x="720" y="697" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Paciente confirma</text>
          <text x="720" y="710" textAnchor="middle" fill="white" fontSize="11">o horário</text>

          <line x1="720" y1="710" x2="720" y2="740" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          {/* book_appointment */}
          <rect x="620" y="740" width="200" height="36" rx="6" fill="#1d4ed8" />
          <text x="720" y="760" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">⚙ book_appointment</text>
          <text x="720" y="773" textAnchor="middle" fill="white" fontSize="10">(registrar na Amigo)</text>

          <line x1="720" y1="776" x2="720" y2="806" stroke="#16a34a" strokeWidth="1.5" markerEnd="url(#arrow-green)" />

          <rect x="610" y="806" width="220" height="46" rx="6" fill="#16a34a" />
          <text x="720" y="824" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">✓ Confirmação enviada</text>
          <text x="720" y="839" textAnchor="middle" fill="white" fontSize="11">Levar doc + carteirinha</text>

          {/* NÃO disponível → desvio */}
          <line x1="830" y1="546" x2="940" y2="546" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="875" y="538" fill="#64748b" fontSize="11">Não</text>
          <rect x="940" y="528" width="120" height="36" rx="6" fill="#f59e0b" />
          <text x="1000" y="548" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Oferecer outra</text>
          <text x="1000" y="561" textAnchor="middle" fill="white" fontSize="11">data / unidade</text>
          {/* loop back arrow */}
          <path d="M1000,528 L1000,460 L820,460" stroke="#64748b" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

          {/* ══════════════════════════════════════════
              CAMINHO 3 – RETORNO  (far right, x≈960)
          ══════════════════════════════════════════ */}
          <line x1="700" y1="166" x2="920" y2="166" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />
          <text x="800" y="158" textAnchor="middle" fill="#64748b" fontSize="11">Retorno</text>

          <rect x="920" y="148" width="150" height="36" rx="6" fill="#7c3aed" />
          <text x="995" y="168" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Identificar paciente</text>
          <text x="995" y="181" textAnchor="middle" fill="white" fontSize="11">de retorno</text>

          <line x1="995" y1="184" x2="995" y2="214" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="920" y="214" width="150" height="36" rx="6" fill="#1d4ed8" />
          <text x="995" y="234" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">Agendar retorno</text>
          <text x="995" y="247" textAnchor="middle" fill="white" fontSize="10">(mesmo fluxo)</text>

          <line x1="995" y1="250" x2="995" y2="280" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

          <rect x="910" y="280" width="170" height="36" rx="6" fill="#ec4899" />
          <text x="995" y="300" textAnchor="middle" fill="white" fontSize="11" fontWeight="500">escalate_to_human</text>
          <text x="995" y="313" textAnchor="middle" fill="white" fontSize="11">Notificar secretária</text>

          {/* ══════════════════════════════════════════
              LEGEND
          ══════════════════════════════════════════ */}
          <rect x="10" y="930" width="1060" height="82" rx="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
          <text x="30" y="950" fill="#1a2332" fontSize="12" fontWeight="600">Legenda:</text>

          {/* Roxo */}
          <rect x="30" y="958" width="14" height="14" rx="3" fill="#7c3aed" />
          <text x="50" y="970" fill="#475569" fontSize="11">Coleta de dados</text>
          {/* Azul */}
          <rect x="175" y="958" width="14" height="14" rx="3" fill="#1d4ed8" />
          <text x="195" y="970" fill="#475569" fontSize="11">Ação do sistema (tool)</text>
          {/* Amarelo */}
          <rect x="365" y="958" width="14" height="14" rx="3" fill="#f59e0b" />
          <text x="385" y="970" fill="#475569" fontSize="11">Decisão</text>
          {/* Verde */}
          <rect x="460" y="958" width="14" height="14" rx="3" fill="#16a34a" />
          <text x="480" y="970" fill="#475569" fontSize="11">Agendamento confirmado</text>
          {/* Teal */}
          <rect x="650" y="958" width="14" height="14" rx="3" fill="#0d9488" />
          <text x="670" y="970" fill="#475569" fontSize="11">Saudação / oferta</text>
          {/* Rosa */}
          <rect x="790" y="958" width="14" height="14" rx="3" fill="#ec4899" />
          <text x="810" y="970" fill="#475569" fontSize="11">Escalada para humano</text>
          {/* Vermelho */}
          <rect x="960" y="958" width="14" height="14" rx="3" fill="#dc2626" />
          <text x="980" y="970" fill="#475569" fontSize="11">Urgência</text>

          {/* PATH LABELS */}
          <text x="30" y="998" fill="#94a3b8" fontSize="10">Caminho 1: Dúvida</text>
          <text x="220" y="998" fill="#94a3b8" fontSize="10">Caminho 2: Agendar (fluxo principal)</text>
          <text x="540" y="998" fill="#94a3b8" fontSize="10">Caminho 3: Retorno</text>
          <text x="730" y="998" fill="#94a3b8" fontSize="10">Caminho 4: Urgência ocular</text>
          <text x="960" y="998" fill="#94a3b8" fontSize="10">⟳ loop: sem horário</text>
        </svg>
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-flowchart { display: block !important; }
        }
      `}</style>
    </div>
  );
}
