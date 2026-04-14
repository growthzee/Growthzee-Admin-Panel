"use client";
import { useState, useEffect } from "react";
import { TASK_CATEGORIES, getSubCategories, getTaskTypes } from "@/lib/taskCategories";

type Props = {
  category: string;
  subCategory: string;
  taskType: string;
  onChange: (category: string, subCategory: string, taskType: string) => void;
};

export default function TaskCategoryPicker({ category, subCategory, taskType, onChange }: Props) {
  const [openCat, setOpenCat] = useState(false);
  const [openSub, setOpenSub] = useState(false);
  const [openTask, setOpenTask] = useState(false);

  const subCategories = getSubCategories(category);
  const taskTypes     = getTaskTypes(category, subCategory);
  const catData       = TASK_CATEGORIES.find(c => c.label === category);
  const subData       = subCategories.find(s => s.label === subCategory);

  // Reset downstream when upstream changes
  useEffect(() => { if (category && !subCategories.find(s => s.label === subCategory)) onChange(category, "", ""); }, [category]);
  useEffect(() => { if (subCategory && !taskTypes.find(t => t === taskType)) onChange(category, subCategory, ""); }, [subCategory]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Level 1 — Category */}
      <div>
        <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>
          Category
        </label>
        <div style={{ position: "relative" }}>
          <button type="button" onClick={() => { setOpenCat(!openCat); setOpenSub(false); setOpenTask(false); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "7px 10px", background: "var(--input-bg)", border: "1px solid var(--border-md)",
              borderRadius: "var(--r-md)", fontSize: 13.5, color: category ? "var(--tx-primary)" : "var(--tx-tertiary)",
              cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s",
              ...(openCat ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px var(--accent-bg)" } : {}),
            }}>
            <span>{category ? `${catData?.emoji} ${category}` : "Select category…"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: "var(--tx-tertiary)", transform: openCat ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {openCat && (
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
              background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-md)", maxHeight: 300, overflowY: "auto",
            }}>
              {TASK_CATEGORIES.map(cat => (
                <button key={cat.label} type="button"
                  onClick={() => { onChange(cat.label, "", ""); setOpenCat(false); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    background: category === cat.label ? "var(--hover-bg)" : "transparent",
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 13.5, color: "var(--tx-primary)", textAlign: "left",
                    transition: "background .08s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--hover-bg)")}
                  onMouseLeave={e => (e.currentTarget.style.background = category === cat.label ? "var(--hover-bg)" : "transparent")}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{cat.emoji}</span>
                  <span>{cat.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx-tertiary)" }}>
                    {cat.subCategories.reduce((s, sc) => s + sc.tasks.length, 0)} tasks
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Level 2 — Sub Category */}
      {category && subCategories.length > 0 && (
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>
            Sub Category
          </label>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => { setOpenSub(!openSub); setOpenCat(false); setOpenTask(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", background: "var(--input-bg)", border: "1px solid var(--border-md)",
                borderRadius: "var(--r-md)", fontSize: 13.5,
                color: subCategory ? "var(--tx-primary)" : "var(--tx-tertiary)",
                cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s",
                ...(openSub ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px var(--accent-bg)" } : {}),
              }}>
              <span>{subCategory ? `${subData?.emoji} ${subCategory}` : "Select sub-category…"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: "var(--tx-tertiary)", transform: openSub ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {openSub && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-md)", maxHeight: 260, overflowY: "auto",
              }}>
                {subCategories.map(sub => (
                  <button key={sub.label} type="button"
                    onClick={() => { onChange(category, sub.label, ""); setOpenSub(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      background: subCategory === sub.label ? "var(--hover-bg)" : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 13.5, color: "var(--tx-primary)", textAlign: "left",
                      transition: "background .08s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--hover-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = subCategory === sub.label ? "var(--hover-bg)" : "transparent")}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{sub.emoji}</span>
                    <span style={{ flex: 1 }}>{sub.label}</span>
                    <span style={{ fontSize: 11, color: "var(--tx-tertiary)" }}>{sub.tasks.length} items</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Level 3 — Task Type */}
      {subCategory && taskTypes.length > 0 && (
        <div>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 500, color: "var(--tx-secondary)", marginBottom: 5 }}>
            Task Type
          </label>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => { setOpenTask(!openTask); setOpenCat(false); setOpenSub(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", background: "var(--input-bg)", border: "1px solid var(--border-md)",
                borderRadius: "var(--r-md)", fontSize: 13.5,
                color: taskType ? "var(--tx-primary)" : "var(--tx-tertiary)",
                cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s",
                ...(openTask ? { borderColor: "var(--accent)", boxShadow: "0 0 0 2px var(--accent-bg)" } : {}),
              }}>
              <span>{taskType || "Select task type…"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, color: "var(--tx-tertiary)", transform: openTask ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {openTask && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)",
                boxShadow: "var(--shadow-md)", maxHeight: 240, overflowY: "auto",
              }}>
                {taskTypes.map(t => (
                  <button key={t} type="button"
                    onClick={() => { onChange(category, subCategory, t); setOpenTask(false); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      background: taskType === t ? "var(--hover-bg)" : "transparent",
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 13.5, color: "var(--tx-primary)", textAlign: "left",
                      transition: "background .08s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--hover-bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = taskType === t ? "var(--hover-bg)" : "transparent")}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, display: "inline-block" }} />
                    {t}
                    {taskType === t && (
                      <svg style={{ marginLeft: "auto", color: "var(--accent)", flexShrink: 0 }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Breadcrumb pill showing the selection */}
      {category && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", padding: "6px 10px", background: "var(--hover-bg)", borderRadius: "var(--r-md)" }}>
          <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 500 }}>{catData?.emoji} {category}</span>
          {subCategory && <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx-tertiary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 12, color: "var(--tx-secondary)" }}>{subData?.emoji} {subCategory}</span>
          </>}
          {taskType && <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx-tertiary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{ fontSize: 12, color: "var(--tx-primary)", fontWeight: 500 }}>{taskType}</span>
          </>}
        </div>
      )}
    </div>
  );
}
