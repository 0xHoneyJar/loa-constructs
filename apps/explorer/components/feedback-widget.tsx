'use client';

import { useState } from 'react';
import { submitFeedback } from '@/app/actions/submit-feedback';

const CATEGORIES = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'flow', label: 'Flow' },
  { value: 'praise', label: 'Praise' },
] as const;

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState<string>('bug');
  const [description, setDescription] = useState('');
  const [whatUserWanted, setWhatUserWanted] = useState('');
  const [frustration, setFrustration] = useState(3);

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        category,
        description: description.trim(),
        whatUserWanted: whatUserWanted.trim() || undefined,
        frustration,
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setIsOpen(false);
        setDescription('');
        setWhatUserWanted('');
        setCategory('bug');
        setFrustration(3);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 w-80 border border-void-border bg-void-base shadow-lg">
          {submitted ? (
            <div className="p-6 text-center">
              <div className="font-mono text-xs text-cyan-base">
                Thanks for your feedback!
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-3 border-b border-void-border">
                <span className="font-mono text-[10px] uppercase tracking-widest text-bone-muted">
                  Send Feedback
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-bone-ghost hover:text-bone-base text-xs transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="p-3 space-y-3">
                {/* Category */}
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setCategory(cat.value)}
                      className={`px-2 py-0.5 font-mono text-[10px] border transition-colors ${
                        category === cat.value
                          ? 'border-cyan-base/30 text-cyan-base bg-cyan-dim/10'
                          : 'border-void-border text-bone-muted hover:text-bone-base'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Description */}
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What happened?"
                  rows={3}
                  className="w-full px-2 py-1.5 font-mono text-[11px] bg-transparent border border-void-border text-bone-dim placeholder:text-bone-ghost/30 resize-none focus:outline-none focus:border-cyan-base/30"
                />

                {/* What user wanted */}
                <input
                  type="text"
                  value={whatUserWanted}
                  onChange={(e) => setWhatUserWanted(e.target.value)}
                  placeholder="What were you trying to do?"
                  className="w-full px-2 py-1.5 font-mono text-[11px] bg-transparent border border-void-border text-bone-dim placeholder:text-bone-ghost/30 focus:outline-none focus:border-cyan-base/30"
                />

                {/* Frustration */}
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] text-bone-ghost uppercase">
                    Frustration
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => setFrustration(level)}
                        className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                          level <= frustration
                            ? 'bg-crimson-base/50 border-crimson-base/40'
                            : 'border-void-border'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !description.trim()}
                  className="w-full py-1.5 font-mono text-[10px] uppercase tracking-wider border border-cyan-base/30 text-cyan-base hover:bg-cyan-dim/10 transition-colors disabled:opacity-30"
                >
                  {isSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 flex items-center justify-center border border-void-border bg-void-base text-cyan-base hover:bg-cyan-dim/10 transition-colors shadow-lg"
        aria-label="Send feedback"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
