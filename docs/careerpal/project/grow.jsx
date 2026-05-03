// Grow — geometric skill tree (grows bottom-up) + node popover + improve sub-screen + leaf-only fork
const { useState: useStateG, useContext: useCtxG, useMemo: useMemoG, useRef: useRefG, useEffect: useEffectG } = React;

/* ───────── Geometric tree (SVG) ─────────
   Tree grows BOTTOM-UP: root anchored at bottom, branches expand upward.
   We invert Y on render (bigger node.y = higher on screen). */

// Render a single skill node (rounded rectangle).
const TreeNode = ({ node, selected, onClick }) => {
  const w = 140, h = 56;
  const cx = node.x, cy = -node.y; // INVERT Y — grow up
  const x = cx - w / 2, y = cy - h / 2;
  const r = 14;

  const stateClass = node.state;
  const showRing = node.state === "active" && node.quality !== undefined;
  const ringSize = 18;
  const ringR = (ringSize - 4) / 2;
  const ringCx = cx + w / 2 - ringSize / 2 - 6;
  const ringCy = cy;

  return (
    <g className={`tree-node tn-${stateClass}${selected ? " selected" : ""}`}
       data-node-id={node.id}
       style={{ cursor: "pointer" }}
       onClick={(e) => onClick(node, e)}>
      <rect x={x} y={y} width={w} height={h} rx={r} ry={r} className="tree-node-bg" />
      {selected && (
        <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={r + 4} ry={r + 4}
              fill="none" stroke="#5367F3" strokeWidth="2" strokeDasharray="4 4" opacity="0.5">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" className="tree-node-label">{node.label}</text>
      {showRing && (
        <g>
          <circle cx={ringCx} cy={ringCy} r={ringR} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
          <circle cx={ringCx} cy={ringCy} r={ringR} fill="none" stroke="white" strokeWidth="2.5"
                  strokeDasharray={2 * Math.PI * ringR}
                  strokeDashoffset={2 * Math.PI * ringR * (1 - node.quality)}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${ringCx} ${ringCy})`} />
        </g>
      )}
    </g>
  );
};

const SkillTree = ({ tree, selectedId, onSelect }) => {
  const xs = tree.nodes.map((n) => n.x);
  const ys = tree.nodes.map((n) => -n.y); // inverted
  const padX = 120, padY = 60;
  const minX = Math.min(...xs) - padX;
  const maxX = Math.max(...xs) + padX;
  const minY = Math.min(...ys) - padY;
  const maxY = Math.max(...ys) + padY;
  const w = maxX - minX;
  const h = maxY - minY;

  const nodeById = useMemoG(() => Object.fromEntries(tree.nodes.map((n) => [n.id, n])), [tree]);

  return (
    <div className="skill-tree-canvas">
      <svg viewBox={`${minX} ${minY} ${w} ${h}`}
           preserveAspectRatio="xMidYMid meet"
           style={{ width: "100%", height: "100%", display: "block" }}>
        {tree.nodes.map((n) => {
          if (!n.parent) return null;
          const p = nodeById[n.parent];
          // BOTTOM-UP: parent is below (larger -y); child is above (smaller -y).
          // Edge goes from parent TOP (cy - 28) up to child BOTTOM (cy + 28).
          const startX = p.x, startY = -p.y - 28;
          const endX = n.x,   endY = -n.y + 28;
          const midY = (startY + endY) / 2;
          const path = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
          const cls = n.state === "locked" ? "tree-edge locked"
                    : n.state === "active" ? "tree-edge active"
                    : "tree-edge done";
          return <path key={n.id} d={path} className={cls} fill="none" />;
        })}
        {tree.nodes.map((n) => (
          <TreeNode key={n.id} node={n} selected={selectedId === n.id} onClick={onSelect} />
        ))}
      </svg>
    </div>
  );
};

/* ───────── Goal bar (with set / clear) ───────── */
const GoalBar = ({ goal, onChange, onClear }) => {
  const { t, lang } = useCtxG(LangContext);
  const [editing, setEditing] = useStateG(false);
  const [draft, setDraft] = useStateG(goal || "");

  if (!goal && !editing) {
    return (
      <div className="goal-bar empty">
        <div>
          <div className="goal-bar-label">{t("grow_goal")}</div>
          <div className="goal-bar-value muted">{t("grow_no_goal")}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{t("grow_no_goal_hint")}</div>
        </div>
        <button className="btn btn-accent" onClick={() => setEditing(true)}>{t("grow_set_goal")}<span>→</span></button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="goal-bar editing">
        <input className="input goal-input" autoFocus
               placeholder={lang === "zh" ? "例如:成为 AI 产品设计负责人" : "e.g. Head of AI Design"}
               value={draft} onChange={(e) => setDraft(e.target.value)}
               onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onChange(draft.trim()); setEditing(false); } }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost" onClick={() => setEditing(false)}>{t("grow_close")}</button>
          <button className="btn btn-accent" disabled={!draft.trim()} onClick={() => { onChange(draft.trim()); setEditing(false); }}>
            {lang === "zh" ? "确认" : "Set"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="goal-bar">
      <div>
        <div className="goal-bar-label">{t("grow_goal")}</div>
        <div className="goal-bar-value">{goal}</div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn btn-ghost" onClick={() => { setDraft(goal); setEditing(true); }}>{t("grow_change")}</button>
        <button className="btn-link" style={{ fontSize: 12.5 }} onClick={onClear}>{t("grow_skip_goal")}</button>
      </div>
    </div>
  );
};

/* ───────── Floating node popover (anchored near click) ─────────
   Positioned with `fixed` near the node's bounding rect.
   - Active → "Improve" button
   - Locked → "Unlock" button
   - Leaf (no children) → "Branch from here" button (only on leaves) */
const NodePopover = ({ node, isLeaf, anchorRect, onImprove, onFork, onUnlock, onClose }) => {
  const { t } = useCtxG(LangContext);
  const popRef = useRefG(null);
  const [pos, setPos] = useStateG({ left: 0, top: 0, placement: "right" });

  useEffectG(() => {
    if (!anchorRect) return;
    const POP_W = 280;
    const POP_H = 220; // estimate
    const margin = 14;
    const vw = window.innerWidth, vh = window.innerHeight;

    // Try right of node
    let placement = "right";
    let left = anchorRect.right + margin;
    let top = anchorRect.top + anchorRect.height / 2 - POP_H / 2;

    if (left + POP_W > vw - 16) {
      // Try left
      placement = "left";
      left = anchorRect.left - margin - POP_W;
    }
    if (left < 16) {
      // Fall back to above
      placement = "top";
      left = anchorRect.left + anchorRect.width / 2 - POP_W / 2;
      top = anchorRect.top - margin - POP_H;
    }
    if (top < 16) top = 16;
    if (top + POP_H > vh - 16) top = vh - POP_H - 16;
    if (left < 16) left = 16;
    if (left + POP_W > vw - 16) left = vw - POP_W - 16;

    setPos({ left, top, placement });
  }, [anchorRect]);

  // Close on Esc / outside click
  useEffectG(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onDoc = (e) => { if (popRef.current && !popRef.current.contains(e.target)) onClose(); };
    document.addEventListener("keydown", onKey);
    // mousedown — but the same click that opens it would close it. Defer one frame.
    const t = setTimeout(() => document.addEventListener("mousedown", onDoc), 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
      clearTimeout(t);
    };
  }, []);

  if (!node) return null;
  const stateLabel = node.state === "done" ? t("grow_node_done_lbl")
                   : node.state === "active" ? t("grow_node_active_lbl")
                   : t("grow_node_locked_lbl");

  return (
    <div ref={popRef}
         className={`node-popover pop-${pos.placement}`}
         style={{ left: pos.left, top: pos.top }}
         onClick={(e) => e.stopPropagation()}>
      <div className="node-popover-arrow"></div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div className={`status-pill st-${node.state}`}>{stateLabel}</div>
          <div className="popover-title">{node.label}</div>
        </div>
        <button className="btn-icon" onClick={onClose} aria-label="close">×</button>
      </div>

      {(node.state === "done" || node.state === "active") && (
        <div style={{ marginTop: 12 }}>
          <div className="meter-row">
            <span className="meter-label">{t("grow_node_quality")}</span>
            <span className="meter-value">{Math.round(node.quality * 100)}%</span>
          </div>
          <div className="meter-bar">
            <div className="meter-fill" style={{ width: `${node.quality * 100}%` }}></div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
        {node.state === "active" && (
          <button className="btn btn-accent btn-block" onClick={onImprove}>
            <Slime size={16} state="speaking" />{t("grow_improve")}
          </button>
        )}
        {node.state === "locked" && (
          <button className="btn btn-accent btn-block" onClick={onUnlock}>
            <Slime size={16} state="speaking" />{t("grow_unlock")}
          </button>
        )}
        {/* Fork is leaf-only */}
        {isLeaf && node.state !== "locked" && (
          <button className="btn btn-ghost btn-block" onClick={onFork}>
            <span style={{ fontSize: 16, marginRight: 4 }}>⎇</span>{t("grow_fork")}
          </button>
        )}
      </div>
    </div>
  );
};

/* ───────── Fork-suggestions overlay — Pal proposes 3 directions ───────── */
const ForkSuggestions = ({ node, onPick, onClose }) => {
  const { t, lang } = useCtxG(LangContext);
  // AI-flavored suggestions, vary by node label
  const suggestionsZh = [
    `深入「${node.label}」的真实落地案例`,
    `把「${node.label}」与跨职能协作结合`,
    `从「${node.label}」延伸到团队赋能与培训`,
  ];
  const suggestionsEn = [
    `Apply "${node.label}" to a real shipped case`,
    `Pair "${node.label}" with cross-functional reps`,
    `Extend "${node.label}" into team enablement`,
  ];
  const suggestions = lang === "zh" ? suggestionsZh : suggestionsEn;

  return (
    <div className="overlay-back" onClick={onClose}>
      <div className="overlay-card fork-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Slime size={32} state="speaking" />
            <div>
              <div style={{ fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500 }}>
                {t("grow_fork")}
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500 }}>
                {lang === "zh" ? `从「${node.label}」延伸` : `Branch from "${node.label}"`}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="close">×</button>
        </div>
        <div style={{ padding: "12px 24px 22px" }}>
          <div style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.55, marginBottom: 14 }}>
            {lang === "zh"
              ? "我帮你想了三个方向。挑一个,会自动作为子节点接到这棵树上。"
              : "Here are three directions. Pick one and I'll graft it onto the tree."}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s, i) => (
              <button key={i} className="fork-option" onClick={() => onPick(s)}>
                <div className="fork-option-num">0{i + 1}</div>
                <div className="fork-option-label">{s}</div>
                <div className="fork-option-arrow">→</div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-3)", textAlign: "center" }}>
            {lang === "zh" ? "或者" : "or"}
            {" "}
            <button className="btn-link" onClick={() => onPick(lang === "zh" ? "新方向" : "New direction")}>
              {lang === "zh" ? "自己写一个" : "write your own"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────── Improve sub-screen (full overlay) ───────── */
const ImprovePanel = ({ node, onClose, onLogged }) => {
  const { t, lang } = useCtxG(LangContext);
  const [mode, setMode] = useStateG("chat");
  const [messages, setMessages] = useStateG([
    { role: "ai", state: "speaking", body: lang === "zh"
      ? `我们来一起完善「${node.label}」吧。${t("grow_chat_intro")}`
      : `Let's strengthen "${node.label}". ${t("grow_chat_intro")}` }
  ]);
  const [input, setInput] = useStateG("");
  const [result, setResult] = useStateG("");
  const [logged, setLogged] = useStateG(false);
  const streamRef = useRefG(null);

  useEffectG(() => {
    if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages]);

  const sendUser = (text) => {
    if (!text.trim()) return;
    setMessages((p) => [...p, { role: "user", body: text }, { role: "ai", state: "thinking", body: null }]);
    setInput("");
    setTimeout(() => {
      setMessages((p) => {
        const n = [...p];
        n[n.length - 1] = { role: "ai", state: "speaking",
          body: lang === "zh"
            ? "明白了。我建议先做 1 件事:在本周内,挑一个真实场景写 3 段 Prompt 对比测试,把效果差异记录下来。完成后我会帮你写进作品集。"
            : "Got it. Try this: this week, pick one real scenario and write 3 prompt variants. Compare and log the deltas. I'll add it to your portfolio when you're done." };
        return n;
      });
    }, 1100);
  };

  const submitResult = () => {
    if (!result.trim()) return;
    setLogged(true);
    setTimeout(() => { onLogged(node.id, 0.12); onClose(); }, 1200);
  };

  return (
    <div className="overlay-back" onClick={onClose}>
      <div className="overlay-card improve-card" onClick={(e) => e.stopPropagation()}>
        <div className="overlay-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Slime size={32} state={mode === "chat" ? "speaking" : "listening"} />
            <div>
              <div style={{ fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 500 }}>
                {t("grow_improve")}
              </div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>
                {node.label}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="close">×</button>
        </div>

        <div className="mode-tabs" style={{ margin: "6px 24px 0" }}>
          <button className={mode === "chat" ? "active" : ""} onClick={() => setMode("chat")}>{t("grow_chat_with_pal")}</button>
          <button className={mode === "submit" ? "active" : ""} onClick={() => setMode("submit")}>{t("grow_submit_result")}</button>
        </div>

        {mode === "chat" && (
          <>
            <div className="chat-stream" ref={streamRef} style={{ flex: 1, padding: "16px 24px" }}>
              {messages.map((m, i) => m.role === "user" ? (
                <div key={i} className="msg-row user">
                  <div className="msg-avatar-user">·</div>
                  <div className="msg-bubble">{m.body}</div>
                </div>
              ) : (
                <div key={i} className="msg-row">
                  <div className="msg-avatar"><Slime size={32} state={m.state} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="msg-bubble">
                      {m.body || <span className="typing"><span></span><span></span><span></span></span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="composer">
              <div className="composer-row">
                <textarea className="composer-input" rows={1} placeholder={t("composer_ph")}
                          value={input} onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendUser(input); } }} />
                <button className="composer-send" disabled={!input.trim()} onClick={() => sendUser(input)}>↑</button>
              </div>
            </div>
          </>
        )}

        {mode === "submit" && (
          <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 14, color: "var(--ink-3)", marginBottom: 12 }}>{t("grow_result_intro")}</div>
            <textarea className="match-textarea" rows={8} placeholder={t("grow_paste_ph")}
                      value={result} onChange={(e) => setResult(e.target.value)}
                      style={{ flex: 1, minHeight: 200 }} />
            {logged ? (
              <div style={{ marginTop: 12, padding: 12, background: "var(--success-soft)",
                            color: "var(--success)", borderRadius: "var(--r-sm)", fontSize: 14, fontWeight: 500 }}>
                ✓ {t("grow_log_done")}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button className="btn btn-accent" onClick={submitResult} disabled={!result.trim()}>
                  {t("grow_log_btn")}<span>→</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────── Top-level Grow screen ───────── */
const GrowScreen = () => {
  const { t, lang } = useCtxG(LangContext);
  const baseTree = lang === "zh" ? SKILL_TREE_ZH : SKILL_TREE_EN;
  const [goal, setGoal] = useStateG(baseTree.goal);
  const [nodes, setNodes] = useStateG(baseTree.nodes);
  const [selectedId, setSelectedId] = useStateG(null);
  const [anchorRect, setAnchorRect] = useStateG(null);
  const [improveOpen, setImproveOpen] = useStateG(false);
  const [forkOpen, setForkOpen] = useStateG(false);

  useEffectG(() => {
    setNodes(baseTree.nodes);
    setGoal(baseTree.goal);
    setSelectedId(null);
    setAnchorRect(null);
  }, [lang]);

  const selected = useMemoG(() => nodes.find((n) => n.id === selectedId), [selectedId, nodes]);
  // Leaf = no other node has me as parent
  const isLeaf = useMemoG(() => {
    if (!selected) return false;
    return !nodes.some((n) => n.parent === selected.id);
  }, [selected, nodes]);

  const handleNodeClick = (node, evt) => {
    // Get bounding rect of the clicked SVG node group for popover anchoring
    const target = evt.currentTarget;
    const rect = target.getBoundingClientRect();
    setSelectedId(node.id);
    setAnchorRect(rect);
  };

  const closePopover = () => {
    setSelectedId(null);
    setAnchorRect(null);
  };

  const handleForkPick = (label) => {
    if (!selected) return;
    const newId = `${selected.id}_c${Date.now().toString(36).slice(-4)}`;
    // New node grows ABOVE the selected node (smaller -y on screen = larger node.y)
    // siblings already attached? offset horizontally
    const siblings = nodes.filter((n) => n.parent === selected.id);
    const offsetX = siblings.length === 0 ? 0
                  : siblings.length % 2 === 1 ? 100 + Math.floor(siblings.length / 2) * 60
                  : -(100 + Math.floor((siblings.length - 1) / 2) * 60);
    const newNode = {
      id: newId,
      label,
      state: "locked",
      quality: 0,
      parent: selected.id,
      x: selected.x + offsetX,
      y: selected.y + 130,
    };
    setNodes((prev) => [...prev, newNode]);
    setForkOpen(false);
    setSelectedId(newId);
    setAnchorRect(null);
    // Re-anchor on next paint
    setTimeout(() => {
      const el = document.querySelector(`[data-node-id="${newId}"]`);
      if (el) setAnchorRect(el.getBoundingClientRect());
    }, 100);
  };

  const handleUnlock = () => {
    if (!selected) return;
    setNodes((prev) => prev.map((n) => n.id === selected.id ? { ...n, state: "active", quality: 0.15 } : n));
  };

  const handleLogged = (nodeId, bump) => {
    setNodes((prev) => prev.map((n) => {
      if (n.id !== nodeId) return n;
      const newQ = Math.min(1, (n.quality || 0) + bump);
      return { ...n, quality: newQ, state: newQ >= 0.95 ? "done" : "active" };
    }));
  };

  return (
    <div className="page-pad grow-pad" data-screen-label="07 Grow">
      <div className="page-head">
        <h1>{t("grow_title")}</h1>
        <p>{t("grow_sub")}</p>
      </div>

      <GoalBar goal={goal} onChange={setGoal} onClear={() => setGoal("")} />

      <div className="panel grow-tree-panel">
        <SkillTree tree={{ nodes }} selectedId={selectedId} onSelect={handleNodeClick} />
      </div>

      {selected && anchorRect && !improveOpen && !forkOpen && (
        <NodePopover node={selected}
                     isLeaf={isLeaf}
                     anchorRect={anchorRect}
                     onImprove={() => setImproveOpen(true)}
                     onUnlock={handleUnlock}
                     onFork={() => setForkOpen(true)}
                     onClose={closePopover} />
      )}

      {forkOpen && selected && (
        <ForkSuggestions node={selected}
                         onPick={handleForkPick}
                         onClose={() => setForkOpen(false)} />
      )}

      {improveOpen && selected && (
        <ImprovePanel node={selected}
                      onClose={() => setImproveOpen(false)}
                      onLogged={handleLogged} />
      )}
    </div>
  );
};

window.GrowScreen = GrowScreen;
