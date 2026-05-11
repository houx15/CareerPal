import type { GrowthPlan, GrowthPlanNode, GrowthPlanUpsertPayload } from "../../lib/types";

export function GrowScreen({
  growthPlan,
}: {
  growthPlan?: GrowthPlan | null;
  onSaveGrowthPlan?: (payload: GrowthPlanUpsertPayload) => Promise<GrowthPlan>;
}) {
  return (
    <div className="page-pad" data-screen-label="08 Grow">
      <div className="page-head">
        <h1>Grow your craft</h1>
        <p>Turn match gaps into a focused growth path.</p>
      </div>
      {growthPlan && growthPlan.nodes.length > 0 ? (
        <section className="skill-tree">
          <div className="goal-bar">
            <div>
              <div className="goal-bar-label">Growth goal</div>
              <div className="goal-bar-value">{growthPlan.goal}</div>
            </div>
          </div>
          <div className="panel grow-tree-panel">
            <SkillTree nodes={growthPlan.nodes} />
          </div>
        </section>
      ) : (
        <section className="goal-bar empty">
          <div>
            <div className="goal-bar-label">Growth goal</div>
            <div className="goal-bar-value muted">No growth plan yet</div>
          </div>
        </section>
      )}
    </div>
  );
}

function SkillTree({ nodes }: { nodes: GrowthPlanNode[] }) {
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
        role="img"
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
          <TreeNode node={node} key={node.id} />
        ))}
      </svg>
    </div>
  );
}

function TreeNode({ node }: { node: GrowthPlanNode }) {
  const width = 140;
  const height = 56;
  const x = node.x - width / 2;
  const y = -node.y - height / 2;
  const showRing = node.state === "active";
  const ringRadius = 7;
  const ringX = node.x + width / 2 - 15;
  const ringY = -node.y;

  return (
    <g className={`tree-node tn-${node.state}`} data-node-id={node.id}>
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
