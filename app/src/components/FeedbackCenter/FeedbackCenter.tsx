import React, { useEffect } from 'react';
import { useUiFeedbackStore, type FeedbackTone } from '../../store/useUiFeedbackStore';
import { CloseIcon } from '../icons';

const FeedbackIcon: React.FC<{ tone: FeedbackTone }> = ({ tone }) => {
  if (tone === 'success') {
    return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m5 12 4 4L19 6" /></svg>;
  }
  if (tone === 'danger') {
    return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2" /><path strokeLinecap="round" strokeWidth="2" d="M12 7v6m0 4h.01" /></svg>;
  }
  if (tone === 'warning') {
    return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 4h.01M4.5 19h15a1.5 1.5 0 001.3-2.25l-7.5-13a1.5 1.5 0 00-2.6 0l-7.5 13A1.5 1.5 0 004.5 19z" /></svg>;
  }
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth="2" /><path strokeLinecap="round" strokeWidth="2" d="M12 11v6m0-10h.01" /></svg>;
};

export const FeedbackCenter: React.FC = () => {
  const { notices, confirmation, removeNotice, resolveConfirmation } = useUiFeedbackStore();

  useEffect(() => {
    if (!confirmation) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resolveConfirmation(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation, resolveConfirmation]);

  return (
    <>
      <div className="feedback-stack fixed right-5 top-5 z-[120] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">
        {notices.map((notice) => (
          <div key={notice.id} className={`feedback-toast feedback-${notice.tone}`} role={notice.tone === 'danger' ? 'alert' : 'status'}>
            <div className="feedback-toast-icon"><FeedbackIcon tone={notice.tone} /></div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{notice.title}</div>
              {notice.message && <div className="mt-1 whitespace-pre-line text-xs leading-relaxed opacity-90">{notice.message}</div>}
            </div>
            <button className="feedback-close" onClick={() => removeNotice(notice.id)} aria-label="通知を閉じる"><CloseIcon /></button>
          </div>
        ))}
      </div>

      {confirmation && (
        <div className="modal-backdrop fixed inset-0 z-[130] flex items-center justify-center p-4" role="presentation">
          <div className="feedback-dialog w-full max-w-md rounded-xl border p-5 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="feedback-dialog-title">
            <div className={`feedback-dialog-icon feedback-${confirmation.tone ?? 'warning'}`}>
              <FeedbackIcon tone={confirmation.tone ?? 'warning'} />
            </div>
            <h2 id="feedback-dialog-title" className="mt-4 text-base font-semibold">{confirmation.title}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-400">{confirmation.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button className="feedback-cancel rounded-lg border px-4 py-2 text-sm font-medium" onClick={() => resolveConfirmation(false)}>
                {confirmation.cancelLabel ?? 'キャンセル'}
              </button>
              <button className={`feedback-confirm feedback-confirm-${confirmation.tone ?? 'warning'} rounded-lg px-4 py-2 text-sm font-semibold`} onClick={() => resolveConfirmation(true)}>
                {confirmation.confirmLabel ?? '続行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
