import { useEffect, useRef, useState } from "react";
import type {
  GrowthPlan,
  GrowthPlanNode,
  GrowthPlanUpsertPayload,
  GrowthProgressLogPayload,
  GrowthProgressResponse,
} from "../../lib/types";
import { Slime } from "../Slime";

export function GrowScreen({
  growthPlan,
  onLogGrowthProgress,
}: {
  growthPlan?: GrowthPlan | null;
  onSaveGrowthPlan?: (payload: GrowthPlanUpsertPayload) => Promise<GrowthPlan>;
  onLogGrowthProgress?: (nodeId: string, payload: GrowthProgressLogPayload) => Promise<GrowthProgressResponse>;
}) {
  const [localPlan, setLocalPlan] = useState<GrowthPlan | null>(growthPlan ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedAnchorRect, setSelectedAnchorRect] = useState<DOMRect | null>(null);
  const [improvingNodeId, setImprovingNodeId] = useState<string | null>(null);
  const [improveMode, setImproveMode] = useState<"chat" | "submit">("chat");
  const [chatDraft, setChatDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "ai" | "user"; body: string }>>([]);
  const [evidence, setEvidence] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  useEffect(() => {
    setLocalPlan(growthPlan ?? null);
  }, [growthPlan]);

  const activePlan = localPlan;
  const selectedNode = activePlan?.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const improvingNode = activePlan?.nodes.find((node) => node.id === improvingNodeId) ?? null;

  async function submitProgress() {
    if (!improvingNode || !onLogGrowthProgress || !evidence.trim()) {
      return;
    }

    setIsLogging(true);
    setLogError(null);
    try {
      const response = await onLogGrowthProgress(improvingNode.id, { evidence: evidence.trim() });
      setLocalPlan(response.plan);
      setSelectedNodeId(improvingNode.id);
      setImprovingNodeId(null);
      setEvidence("");
    } catch (caught) {
      setLogError(caught instanceof Error ? caught.message : "Could not log progress.");
    } finally {
      setIsLogging(false);
    }
  }

  return (
    <div className="page-pad" data-screen-label="08 Grow">
      <div className="page-head">
        <h1>Grow your craft</h1>
        <p>Turn match gaps into a focused growth path.</p>
      </div>
      {activePlan && activePlan.nodes.length > 0 ? (
        <section className="skill-tree">
          <div className="goal-bar">
            <div>
              <div className="goal-bar-label">Growth goal</div>
              <div className="goal-bar-value">{activePlan.goal}</div>
            </div>
          </div>
          <div className="panel grow-tree-panel">
            <SkillTree
              nodes={activePlan.nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={(nodeId, anchorRect) => {
                setSelectedNodeId(nodeId);
                setSelectedAnchorRect(anchorRect);
              }}
            />
          </div>
          {selectedNode ? (
            <NodePopover
              node={selectedNode}
              anchorRect={selectedAnchorRect}
              onClose={() => {
                setSelectedNodeId(null);
                setSelectedAnchorRect(null);
              }}
              onImprove={() => {
                setEvidence("");
                setLogError(null);
                setImproveMode("chat");
                setChatDraft("");
                setChatMessages([
                  {
                    role: "ai",
                    body: `Let's strengthen "${selectedNode.label}". Log concrete work when you have a shipped result, benchmark, or lesson learned.`,
                  },
                ]);
                setImprovingNodeId(selectedNode.id);
              }}
            />
          ) : null}
        </section>
      ) : (
        <section className="goal-bar empty">
          <div>
            <div className="goal-bar-label">Growth goal</div>
            <div className="goal-bar-value muted">No growth plan yet</div>
          </div>
        </section>
      )}
      {improvingNode ? (
        <div className="overlay-back" role="dialog" aria-modal="true" aria-label={`Improve ${improvingNode.label}`}>
          <div className="overlay-card improve-card">
            <div className="overlay-head">
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Slime size={34} />
                <div>
                  <div className="meter-label">Improve</div>
                  <div className="popover-title">{improvingNode.label}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setImprovingNodeId(null)}>
                Close
              </button>
            </div>
            <div className="mode-tabs" style={{ margin: "6px 24px 0" }} aria-label="Improve mode">
              <button className={improveMode === "chat" ? "active" : ""} type="button" onClick={() => setImproveMode("chat")}>
                Chat
              </button>
              <button className={improveMode === "submit" ? "active" : ""} type="button" onClick={() => setImproveMode("submit")}>
                Submit result
              </button>
            </div>
            {improveMode === "chat" ? (
              <>
                <div className="chat-stream" style={{ flex: 1, padding: "16px 24px" }}>
                  {chatMessages.map((message, index) => (
                    <div className={`msg-row${message.role === "user" ? " user" : ""}`} key={`${message.role}-${index}`}>
                      {message.role === "ai" ? (
                        <div className="msg-avatar">
                          <Slime size={32} />
                        </div>
                      ) : (
                        <div className="msg-avatar-user">A</div>
                      )}
                      <div className="msg-bubble">{message.body}</div>
                    </div>
                  ))}
                </div>
                <div className="composer">
                  <div className="composer-row">
                    <textarea
                      className="composer-input"
                      rows={1}
                      value={chatDraft}
                      onChange={(event) => setChatDraft(event.target.value)}
                      placeholder="Ask for a next step"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          if (!chatDraft.trim()) {
                            return;
                          }
                          setChatMessages((messages) => [
                            ...messages,
                            { role: "user", body: chatDraft.trim() },
                            {
                              role: "ai",
                              body: "Pick one concrete proof point for this node, then submit the result so CareerPal can update your roadmap.",
                            },
                          ]);
                          setChatDraft("");
                        }
                      }}
                    />
                    <button
                      className="composer-send"
                      type="button"
                      disabled={!chatDraft.trim()}
                      onClick={() => {
                        if (!chatDraft.trim()) {
                          return;
                        }
                        setChatMessages((messages) => [
                          ...messages,
                          { role: "user", body: chatDraft.trim() },
                          {
                            role: "ai",
                            body: "Pick one concrete proof point for this node, then submit the result so CareerPal can update your roadmap.",
                          },
                        ]);
                        setChatDraft("");
                      }}
                    >
                      ^
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
                <label className="meter-label" htmlFor="growth-evidence">
                  Evidence
                </label>
                <textarea
                  id="growth-evidence"
                  className="match-textarea"
                  value={evidence}
                  onChange={(event) => setEvidence(event.target.value)}
                  placeholder="Paste the shipped result, project link, benchmark, or lesson learned."
                />
                {logError ? <p className="floating-error">{logError}</p> : null}
                <button className="btn btn-accent btn-block" type="button" disabled={isLogging || !evidence.trim()} onClick={submitProgress}>
                  {isLogging ? "Logging..." : "Log progress"}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SkillTree({
  nodes,
  selectedNodeId,
  onSelectNode,
}: {
  nodes: GrowthPlanNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string, anchorRect: DOMRect) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => -node.y);
  const minX = Math.min(...xs) - 120;
  const maxX = Math.max(...xs) + 120;
  const minY = Math.min(...ys) - 80;
  const maxY = Math.max(...ys) + 80;
  const width = Math.max(maxX - minX, 320);
  const height = Math.max(maxY - minY, 240);

  return (
    <div className="skill-tree-canvas">
      <svg
        aria-label="Growth skill tree"
        role="group"
        viewBox={`${minX} ${minY} ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {nodes.map((node) => {
          if (!node.parent) {
            return null;
          }
          const parent = nodeById.get(node.parent);
          if (!parent) {
            return null;
          }
          const startX = parent.x;
          const startY = -parent.y - 28;
          const endX = node.x;
          const endY = -node.y + 28;
          const midY = (startY + endY) / 2;
          return (
            <path
              className={`tree-edge ${node.state}`}
              d={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
              fill="none"
              key={node.id}
            />
          );
        })}
        {nodes.map((node) => (
          <TreeNode node={node} selected={node.id === selectedNodeId} onSelect={(anchorRect) => onSelectNode(node.id, anchorRect)} key={node.id} />
        ))}
      </svg>
    </div>
  );
}

function TreeNode({ node, selected, onSelect }: { node: GrowthPlanNode; selected: boolean; onSelect: (anchorRect: DOMRect) => void }) {
  const width = 140;
  const height = 56;
  const x = node.x - width / 2;
  const y = -node.y - height / 2;
  const showRing = node.state === "active";
  const ringRadius = 7;
  const ringX = node.x + width / 2 - 15;
  const ringY = -node.y;

  return (
    <g
      className={`tree-node tn-${node.state}${selected ? " selected" : ""}`}
      data-node-id={node.id}
      role="button"
      aria-label={`${node.label} ${node.state}`}
      tabIndex={0}
      onClick={(event) => onSelect(event.currentTarget.getBoundingClientRect())}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(event.currentTarget.getBoundingClientRect());
        }
      }}
    >
      <title>{`${node.label} ${node.state}`}</title>
      <rect className="tree-node-bg" x={x} y={y} width={width} height={height} rx={14} ry={14} />
      <text className="tree-node-label" x={node.x} y={-node.y + 4} textAnchor="middle">
        {node.label}
      </text>
      {showRing ? (
        <g>
          <circle cx={ringX} cy={ringY} r={ringRadius} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
          <circle
            cx={ringX}
            cy={ringY}
            r={ringRadius}
            fill="none"
            stroke="white"
            strokeDasharray={2 * Math.PI * ringRadius}
            strokeDashoffset={2 * Math.PI * ringRadius * (1 - node.quality)}
            strokeLinecap="round"
            strokeWidth="2.5"
            transform={`rotate(-90 ${ringX} ${ringY})`}
          />
        </g>
      ) : null}
    </g>
  );
}

function NodePopover({
  node,
  anchorRect,
  onClose,
  onImprove,
}: {
  node: GrowthPlanNode;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onImprove: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 16, top: 16, placement: "right" as "right" | "left" | "top" });

  useEffect(() => {
    if (!anchorRect) {
      return;
    }

    const popWidth = 280;
    const popHeight = 220;
    const margin = 14;
    const viewportWidth = window.innerWidth || 1024;
    const viewportHeight = window.innerHeight || 768;
    let placement: "right" | "left" | "top" = "right";
    let left = anchorRect.right + margin;
    let top = anchorRect.top + anchorRect.height / 2 - popHeight / 2;

    if (left + popWidth > viewportWidth - 16) {
      placement = "left";
      left = anchorRect.left - margin - popWidth;
    }
    if (left < 16) {
      placement = "top";
      left = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
      top = anchorRect.top - margin - popHeight;
    }
    top = Math.max(16, Math.min(top, viewportHeight - popHeight - 16));
    left = Math.max(16, Math.min(left, viewportWidth - popWidth - 16));
    setPosition({ left, top, placement });
  }, [anchorRect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const onMouseDown = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const timeout = window.setTimeout(() => document.addEventListener("mousedown", onMouseDown), 0);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
      window.clearTimeout(timeout);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className={`node-popover pop-${position.placement}`}
      style={{ left: position.left, top: position.top }}
      onClick={(event) => event.stopPropagation()}
    >
      <span className="node-popover-arrow" />
      <button className="btn btn-ghost btn-sm" type="button" style={{ float: "right" }} onClick={onClose}>
        Close
      </button>
      <span className={`status-pill st-${node.state}`}>{node.state}</span>
      <div className="popover-title">{node.label}</div>
      <div style={{ clear: "both", paddingTop: 14 }}>
        <div className="meter-row">
          <span className="meter-label">Quality</span>
          <span className="meter-value">{Math.round(node.quality * 100)}%</span>
        </div>
        <div className="meter-bar">
          <div className="meter-fill" style={{ width: `${Math.round(node.quality * 100)}%` }} />
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        {node.state === "locked" ? (
          <button className="btn btn-ghost btn-block" type="button" disabled>
            Unlock
          </button>
        ) : (
          <button className="btn btn-accent btn-block" type="button" onClick={onImprove}>
            Improve
          </button>
        )}
      </div>
    </div>
  );
}
