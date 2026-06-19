import { Sparkle } from '@phosphor-icons/react';
import { formatTime } from '../utils';
import type { FoodEntryDraft } from '../types';

interface ResultModalProps {
  resultEntry: FoodEntryDraft;
  submitting: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateFoodItem: (index: number, patch: Partial<{ name: string; quantity: number; unit: string }>) => void;
}

export default function ResultModal({
  resultEntry,
  submitting,
  onClose,
  onSave,
  onUpdateFoodItem
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="record-modal mx-4 max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-[#dde3e3] bg-white p-6 shadow-[0_32px_80px_rgba(52,67,56,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3aa39e] to-[#1f6b6b] text-white shadow-[0_10px_24px_rgba(93,127,105,0.25)]">
            <Sparkle size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#1d2a30]">确认这次识别</p>
            <p className="text-sm text-[#8a949b]">{formatTime(resultEntry.recordedAt || '')} · 修改后自动重算热量</p>
          </div>
        </div>

        <div className="mb-4 rounded-[22px] bg-[#f4f6f6] p-4">
          <p className="text-sm text-[#8a949b]">原文</p>
          <p className="mt-1 text-[15px] leading-6 text-[#1d2a30]">{resultEntry.rawText}</p>
        </div>

        {resultEntry.foodItems.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-sm font-medium text-[#2e8b8b]">食物</p>
            <div className="grid gap-2">
              {resultEntry.foodItems.map((item, index) => (
                <div key={item.id ?? index} className="grid gap-2 rounded-[18px] bg-[#e9f3f1] p-3 md:grid-cols-[minmax(0,1.4fr)_80px_72px_minmax(96px,110px)] md:items-center">
                  <input
                    className="min-w-0 rounded-full border border-[#cfe2df] bg-white px-3 py-2 text-sm text-[#244e52] outline-none focus:border-[#7ec8c2]"
                    value={item.name}
                    onChange={(event) => onUpdateFoodItem(index, { name: event.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className="min-w-0 rounded-full border border-[#cfe2df] bg-white px-3 py-2 text-right text-sm text-[#244e52] outline-none focus:border-[#7ec8c2]"
                    value={item.quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isFinite(next) && next >= 0) onUpdateFoodItem(index, { quantity: next });
                    }}
                  />
                  <input
                    className="min-w-0 rounded-full border border-[#cfe2df] bg-white px-3 py-2 text-center text-sm text-[#4a5860] outline-none focus:border-[#7ec8c2]"
                    value={item.unit ?? ''}
                    placeholder="单位"
                    onChange={(event) => onUpdateFoodItem(index, { unit: event.target.value })}
                  />
                  <span className="flex items-center justify-end gap-1 rounded-full border border-[#cfe2df] bg-white px-3 py-2 text-sm text-[#244e52]">
                    <strong>{item.calories}</strong>
                    <span className="text-xs text-[#8a949b]">kcal</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultEntry.waterItems.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-sm font-medium text-[#d18a3f]">饮水</p>
            <div className="grid gap-2">
              {resultEntry.waterItems.map((water, index) => (
                <div key={`water-${water.id ?? index}`} className="grid gap-2 rounded-[18px] bg-[#f8f0e3] p-3 md:grid-cols-[minmax(0,1fr)_130px] md:items-center">
                  <span className="min-w-0 rounded-full border border-[#dde3e3] bg-white px-3 py-2 text-sm text-[#8a5b24]">
                    {water.rawText}
                  </span>
                  <span className="flex items-center justify-end gap-1 rounded-full border border-[#dde3e3] bg-white px-3 py-2 text-sm text-[#8a5b24]">
                    <strong>{water.amountMl}</strong>
                    <span className="text-xs text-[#9a6b31]">ml</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between rounded-[22px] bg-gradient-to-r from-[#3aa39e]/10 to-[#eca94f]/10 px-4 py-3">
          <span className="text-sm text-[#4a5860]">总热量</span>
          <strong className="text-lg font-semibold text-[#1d2a30]">{resultEntry.finalTotalCalories} kcal</strong>
        </div>

        {resultEntry.needReview && (
          <div className="mb-4 rounded-[18px] border border-[#f0d9b5] bg-[#fef8ed] px-4 py-3 text-sm text-[#9a6b31]">
            {resultEntry.reviewReason || '部分项目建议确认'}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-full border border-[#cdd6d6] px-5 py-3 text-sm font-medium text-[#4a5860] transition hover:bg-[#f4f6f6] active:translate-y-px sm:flex-1"
            type="button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="rounded-full bg-[#2e8b8b] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(95,127,104,0.24)] transition hover:bg-[#1f6b6b] active:translate-y-px disabled:opacity-60 sm:flex-[1.5]"
            type="button"
            disabled={submitting}
            onClick={() => void onSave()}
          >
            确认保存
          </button>
        </div>
      </div>
    </div>
  );
}
