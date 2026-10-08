"use client";

import { useState } from "react";
import { CornerDownLeft } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Textarea } from "@/components/ui/Field";
import { useOnOpen } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/Button";

/**
 * Quick capture.
 *
 * One box, no fields, no structure. The moment just after a failure is when
 * the user knows most about what happened and has the least patience for a
 * form, so this asks for a sentence and nothing else. Turning it into a full
 * Correction happens later, from the Corrections inbox.
 */
export function QuickCapture({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addCapture = useStore((s) => s.addCapture);
  const [text, setText] = useState("");

  // Start clean each time it opens; a stale draft would be confusing.
  useOnOpen(open, () => setText(""));

  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addCapture(trimmed);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="What went wrong?"
      subtitle="One sentence. Structure it later."
      footer={
        <div className="flex items-center gap-3">
          <p className="flex-1 text-[13px] font-semibold leading-snug text-text-muted">
            Saved to the inbox on Corrections.
          </p>
          <Button variant="primary" onClick={save} disabled={!text.trim()}>
            Save
            <CornerDownLeft size={14} strokeWidth={3} />
          </Button>
        </div>
      }
    >
      <Textarea
        autoFocus
        value={text}
        minRows={4}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          // Enter saves; Shift+Enter keeps writing.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
        placeholder="I procrastinated for two hours before starting to code."
        className="bg-surface text-[17px]"
      />
    </Sheet>
  );
}
