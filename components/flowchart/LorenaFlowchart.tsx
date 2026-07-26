'use client';

import { useRef, useState, useCallback } from 'react';

// ---------- TIPOS ----------
type NodeColor = 'teal' | 'purple' | 'orange' | 'blue' | 'red' | 'pink' | 'gray';

interface FlowNode {
  id: string;
  x: number;
  y: number;
  w?: number;
  kind?: 'start' | 'default';
  color?: NodeColor;
  icon?: string;
  title: string;
  sub?: string;
  tag?: string;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  loop?: boolean;
}

// Alinhado com os tokens de cor do tailwind.config.ts
const COLOR_MAP: Record<NodeColor, string> = {
  orange: '#FF6B00',   // secondary
  teal: '#0d9488',
  purple: '#7c5cff',
  blue: '#2f6fed',
  red: '#EF4444',      // danger
  pink: '#e94f8a',
  gray: '#64748B',     // muted-foreground
};

const ICON = {
  message: '💬', bot: '✦', branch: '◈', question: '?', chat: '↩',
  calendar: '📅', alert: '⚠', clock: '🕒', gear: '⚙', user: '👤',
  human: '☎', check: '✓', location: '📍', cake: '🎂',
};

const NODES: FlowNode[] = [
  { id: 'start', x: 900, y: 40, w: 190, kind: 'start', title: 'Mensagem do Paciente' },
  { id: 'greet', x: 900, y: 150, color: 'teal', icon: ICON.bot, title: 'Lorena saúda e identifica intenção', sub: 'Primeira resposta automática' },
  { id: 'intent', x: 900, y: 270, color: 'orange', icon: ICON.branch, title: 'Qual é a intenção?', sub: 'Classificação da mensagem recebida' },

  // Dúvida
  { id: 'convenio', x: 150, y: 390, color: 'purple', icon: ICON.question, title: 'Convênio / Valor', sub: 'Consulta regras de convênio e preço' },
  { id: 'responde', x: 150, y: 500, color: 'purple', icon: ICON.chat, title: 'Lorena responde', sub: 'Envia a informação solicitada' },
  { id: 'ofereceAgenda', x: 150, y: 610, color: 'teal', icon: ICON.calendar, title: 'Oferece agendamento ao final', sub: 'Convite para marcar consulta' },

  // Urgência
  { id: 'urgencia', x: 430, y: 390, color: 'red', icon: ICON.alert, title: 'Urgência ocular', sub: 'Perda de visão, trauma' },
  { id: 'horarioComercial', x: 430, y: 500, color: 'orange', icon: ICON.clock, title: 'Horário comercial?', sub: 'Verifica janela de atendimento' },
  { id: 'orientaUPA', x: 290, y: 610, color: 'red', icon: ICON.alert, title: 'Orienta UPA', sub: '+ próximo dia útil disponível' },
  { id: 'escalaSecretaria', x: 570, y: 610, color: 'pink', icon: ICON.human, title: 'Escala secretária', sub: '+ passa telefone de contato' },

  // Agendar — Fase 1
  { id: 'coletaF1', x: 900, y: 390, color: 'purple', icon: ICON.user, title: 'Fase 1 — Nome completo + telefone', sub: 'Só o essencial pra buscar agenda' },
  { id: 'unidade', x: 900, y: 490, color: 'purple', icon: ICON.location, title: 'Unidade + data + período', sub: 'Preferência do paciente' },
  { id: 'classifica', x: 900, y: 600, color: 'orange', icon: ICON.branch, title: 'Já foi atendido pela Dra. Bruna?', sub: 'Classificação do paciente' },
  { id: 'msgNovo', x: 640, y: 720, color: 'teal', icon: ICON.bot, title: 'Envia mensagem de paciente novo', sub: 'Formulário completo · em paralelo, não bloqueia' },
  { id: 'confirmaDados', x: 900, y: 720, color: 'purple', icon: ICON.check, title: 'Confirma dados cadastrais', sub: 'Rotina (≥ 6 meses) — trata como consulta nova' },
  { id: 'priorizaHorario', x: 1170, y: 720, color: 'orange', icon: ICON.clock, title: 'Prioriza 7h ou 13h', sub: 'Reavaliação (< 6 meses)' },
  { id: 'checkAvail', x: 900, y: 840, color: 'blue', icon: ICON.gear, title: 'check_availability', sub: 'Verifica agenda via Amigo API', tag: 'ferramenta' },
  { id: 'horariosOk', x: 900, y: 950, color: 'orange', icon: ICON.branch, title: 'Horários disponíveis?', sub: 'Resultado da checagem' },
  { id: 'outraData', x: 1230, y: 950, color: 'orange', icon: ICON.calendar, title: 'Outra data / lista de espera', sub: 'Sem vaga compatível — oferece Google Forms' },
  // Agendar — Fase 2
  { id: 'coletaF2', x: 900, y: 1060, color: 'purple', icon: ICON.cake, title: 'Fase 2 — Convênio + motivo + nascimento', sub: 'Só depois que o paciente escolheu o horário' },
  { id: 'confirmaHorario', x: 900, y: 1160, color: 'teal', icon: ICON.chat, title: 'Confirma o horário com o paciente', sub: '"Confirmo o agendamento para..."' },
  { id: 'bookAppt', x: 900, y: 1260, color: 'blue', icon: ICON.gear, title: 'book_appointment', sub: 'Cria o agendamento · reavaliação registra motivo em observações', tag: 'ferramenta' },
  { id: 'confirma', x: 900, y: 1360, color: 'teal', icon: ICON.check, title: 'Orientações + encerramento', sub: 'Documentos, convênio e cuidados pré-consulta' },

  // Retorno
  { id: 'identRetorno', x: 1520, y: 390, color: 'purple', icon: ICON.user, title: 'Identifica paciente de retorno', sub: 'Busca histórico existente' },
  { id: 'agendaRetorno', x: 1520, y: 500, color: 'blue', icon: ICON.gear, title: 'Agendar retorno', sub: 'Reaproveita fluxo de agendamento' },
  { id: 'escalateHuman', x: 1520, y: 610, color: 'pink', icon: ICON.human, title: 'escalate_to_human', sub: 'Notifica a secretária', tag: 'ferramenta' },
];

const EDGES: FlowEdge[] = [
  { from: 'start', to: 'greet' },
  { from: 'greet', to: 'intent' },
  { from: 'intent', to: 'convenio', label: 'Dúvida' },
  { from: 'intent', to: 'urgencia', label: 'Urgência' },
  { from: 'intent', to: 'coletaF1', label: 'Agendar' },
  { from: 'intent', to: 'identRetorno', label: 'Retorno' },

  { from: 'convenio', to: 'responde' },
  { from: 'responde', to: 'ofereceAgenda' },

  { from: 'urgencia', to: 'horarioComercial' },
  { from: 'horarioComercial', to: 'orientaUPA', label: 'Não' },
  { from: 'horarioComercial', to: 'escalaSecretaria', label: 'Sim' },

  { from: 'coletaF1', to: 'unidade' },
  { from: 'unidade', to: 'classifica' },
  { from: 'classifica', to: 'msgNovo', label: 'Novo' },
  { from: 'classifica', to: 'confirmaDados', label: 'Rotina ≥ 6m' },
  { from: 'classifica', to: 'priorizaHorario', label: 'Reaval. < 6m' },
  { from: 'msgNovo', to: 'checkAvail' },
  { from: 'confirmaDados', to: 'checkAvail' },
  { from: 'priorizaHorario', to: 'checkAvail' },
  { from: 'checkAvail', to: 'horariosOk' },
  { from: 'horariosOk', to: 'outraData', label: 'Não' },
  { from: 'outraData', to: 'checkAvail', loop: true },
  { from: 'horariosOk', to: 'coletaF2', label: 'Sim' },
  { from: 'coletaF2', to: 'confirmaHorario' },
  { from: 'confirmaHorario', to: 'bookAppt' },
  { from: 'bookAppt', to: 'confirma' },

  { from: 'identRetorno', to: 'agendaRetorno' },
  { from: 'agendaRetorno', to: 'escalateHuman' },
];

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]));

function nodeAnchor(n: FlowNode, side: 'top' | 'bottom' | 'left' | 'right') {
  const halfW = (n.w || 222) / 2;
  const halfH = 30;
  if (side === 'top') return { x: n.x, y: n.y - halfH };
  if (side === 'bottom') return { x: n.x, y: n.y + halfH };
  if (side === 'left') return { x: n.x - halfW, y: n.y };
  return { x: n.x + halfW, y: n.y };
}

function buildEdgePath(e: FlowEdge) {
  const a = byId[e.from];
  const b = byId[e.to];
  let p1, p2, path, mid;

  if (e.loop) {
    p1 = nodeAnchor(a, 'right');
    p2 = nodeAnchor(b, 'right');
    const bow = 140;
    path = `M ${p1.x} ${p1.y} C ${p1.x + bow} ${p1.y}, ${p2.x + bow} ${p2.y}, ${p2.x} ${p2.y}`;
    mid = { x: p1.x + bow, y: (p1.y + p2.y) / 2 };
  } else if (Math.abs(a.x - b.x) < 4) {
    p1 = nodeAnchor(a, 'bottom');
    p2 = nodeAnchor(b, 'top');
    const midY = (p1.y + p2.y) / 2;
    path = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    mid = { x: (p1.x + p2.x) / 2, y: midY };
  } else {
    p1 = nodeAnchor(a, a.y === b.y ? 'right' : 'bottom');
    p2 = nodeAnchor(b, a.y === b.y ? 'left' : 'top');
    const midY = (p1.y + p2.y) / 2;
    path = `M ${p1.x} ${p1.y} C ${p1.x} ${midY}, ${p2.x} ${midY}, ${p2.x} ${p2.y}`;
    mid = { x: (p1.x + p2.x) / 2, y: midY };
  }
  return { path, mid };
}

export function LorenaFlowchart() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ scale: 0.52, tx: 60, ty: 20 });
  const panState = useRef<{
    panning: boolean;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
  }>({ panning: false, startX: 0, startY: 0, startTx: 0, startTy: 0 });

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      panState.current = {
        panning: true,
        startX: e.clientX,
        startY: e.clientY,
        startTx: transform.tx,
        startTy: transform.ty,
      };
    },
    [transform],
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panState.current.panning) return;
    setTransform((t) => ({
      ...t,
      tx: panState.current.startTx + (e.clientX - panState.current.startX),
      ty: panState.current.startTy + (e.clientY - panState.current.startY),
    }));
  }, []);

  const onMouseUp = useCallback(() => {
    panState.current.panning = false;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setTransform((t) => ({ ...t, scale: Math.min(1.6, Math.max(0.3, t.scale + delta)) }));
  }, []);

  const zoomIn = () => setTransform((t) => ({ ...t, scale: Math.min(1.6, t.scale + 0.1) }));
  const zoomOut = () => setTransform((t) => ({ ...t, scale: Math.max(0.3, t.scale - 0.1) }));
  const zoomFit = () => setTransform({ scale: 0.52, tx: 60, ty: 20 });

  return (
    <div className="flex h-[calc(100vh-58px)] w-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
        <div>
          <h1 className="text-[15px] font-bold text-gray-900">Fluxograma de Atendimento da Lorena</h1>
          <p className="mt-0.5 text-xs text-gray-400">Visão geral dos caminhos de atendimento automatizados · arraste para navegar · scroll para zoom</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          ⎙ Imprimir fluxograma
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden bg-gray-50"
        style={{
          cursor: panState.current.panning ? 'grabbing' : 'grab',
          backgroundImage: 'radial-gradient(circle, #dfe3e8 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})` }}
        >
          {/* Conectores SVG */}
          <svg
            width={2000}
            height={1500}
            className="absolute left-0 top-0 overflow-visible"
            style={{ pointerEvents: 'none' }}
          >
            {EDGES.map((e, i) => {
              const { path } = buildEdgePath(e);
              return <path key={i} d={path} fill="none" stroke="#cbd2d9" strokeWidth={2} />;
            })}
          </svg>

          {/* Labels e marcadores de aresta */}
          {EDGES.map((e, i) => {
            const { mid } = buildEdgePath(e);
            if (e.label) {
              return (
                <div
                  key={`lbl-${i}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-50 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500"
                  style={{ left: mid.x, top: mid.y }}
                >
                  {e.label}
                </div>
              );
            }
            if (!e.loop) {
              return (
                <div
                  key={`plus-${i}`}
                  className="absolute flex h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-gray-300 bg-white text-xs text-gray-400 shadow-sm"
                  style={{ left: mid.x, top: mid.y }}
                >
                  +
                </div>
              );
            }
            return null;
          })}

          {/* Nós */}
          {NODES.map((n) => (
            <div
              key={n.id}
              className={
                n.kind === 'start'
                  ? 'absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-2.5 rounded-[22px] border border-gray-200 bg-gray-100 px-3 py-2.5'
                  : 'absolute flex w-[222px] -translate-x-1/2 -translate-y-1/2 items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-3 shadow-sm'
              }
              style={{ left: n.x, top: n.y, width: n.kind === 'start' ? n.w : undefined }}
            >
              <div
                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-sm text-white"
                style={{ background: n.kind === 'start' ? '#aab2c0' : COLOR_MAP[n.color || 'gray'] }}
              >
                {n.kind === 'start' ? ICON.message : n.icon}
              </div>
              <div className="min-w-0">
                <div className="text-[12.5px] font-bold leading-tight text-gray-900">{n.title}</div>
                {n.sub && <div className="mt-0.5 text-[11px] leading-snug text-gray-400">{n.sub}</div>}
                {n.tag && (
                  <span className="mt-1.5 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                    {n.tag}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[11px] text-gray-500 shadow-sm">
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.teal }} />Ação da IA / resposta</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.purple }} />Coleta de dados</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.orange }} />Decisão</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.blue }} />Integração (Amigo API)</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.pink }} />Escalonamento humano</div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: COLOR_MAP.red }} />Urgência</div>
        </div>

        {/* Controles de zoom */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
          <button
            onClick={zoomIn}
            className="h-8 w-8 rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            +
          </button>
          <div className="flex h-6 w-8 items-center justify-center text-[10px] font-semibold text-gray-500">
            {Math.round(transform.scale * 100)}%
          </div>
          <button
            onClick={zoomOut}
            className="h-8 w-8 rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            –
          </button>
          <button
            onClick={zoomFit}
            title="Ajustar à tela"
            className="h-8 w-8 rounded-lg border border-gray-300 bg-white text-[15px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            ⤢
          </button>
        </div>
      </div>
    </div>
  );
}
