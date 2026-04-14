"use client";
import { getCategoryEmoji, getSubCategoryEmoji } from "@/lib/taskCategories";

type Props = {
  category?: string | null;
  subCategory?: string | null;
  taskType?: string | null;
  compact?: boolean;
};

export default function TaskCategoryBadge({ category, subCategory, taskType, compact = false }: Props) {
  if (!category) return null;

  const catEmoji = getCategoryEmoji(category);
  const subEmoji = subCategory ? getSubCategoryEmoji(category, subCategory) : null;

  if (compact) {
    // Just one pill
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 11.5, fontWeight: 500,
        padding: "2px 8px", borderRadius: "var(--r-sm)",
        background: "var(--hover-bg)", color: "var(--tx-secondary)",
        whiteSpace: "nowrap",
      }}>
        {catEmoji} {taskType || subCategory || category}
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Category row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11.5, fontWeight: 500,
          padding: "2px 8px", borderRadius: "var(--r-sm)",
          background: "var(--accent-bg)", color: "var(--accent)",
        }}>
          {catEmoji} {category}
        </span>
        {subCategory && (
          <>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--tx-tertiary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11.5, padding: "2px 8px", borderRadius: "var(--r-sm)",
              background: "var(--hover-bg)", color: "var(--tx-secondary)",
            }}>
              {subEmoji} {subCategory}
            </span>
          </>
        )}
      </div>
      {taskType && (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: 12, fontWeight: 600, color: "var(--tx-primary)",
        }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)", display: "inline-block", flexShrink: 0 }} />
          {taskType}
        </span>
      )}
    </div>
  );
}
