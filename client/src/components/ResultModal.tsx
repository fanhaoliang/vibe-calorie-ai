import { Sparkle } from '@phosphor-icons/react';
import { formatTime } from '../utils';
import type { FoodEntryDraft } from '../types';

interface ResultModalProps {
  resultEntry: FoodEntryDraft;
  submitting: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateFoodName: (index: number, name: string) => void;
}

export default function ResultModal({
  resultEntry,
  submitting,
  onClose,
  onSave,
  onUpdateFoodName
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="record-modal mx-4 max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-[#e8dfd2] bg-white p-6 shadow-[0_32px_80px_rgba(52,67,56,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7f9b86] to-[#5d7f69] text-white shadow-[0_10px_24px_rgba(93,127,105,0.25)]">
            <Sparkle size={22} weight="duotone" />
          </div>
          <div>
            <p className="text-lg font-semibold text-[#2f3b33]">确认这次识别</p>
            <p className="text-sm text-[#7d8279]">{formatTime(resultEntry.recordedAt || '')} · 改名称后系统会自动重算热量</p>
          </div>
        </div>

        <div className="mb-4 rounded-[22px] bg-[#fbf8f1] p-4">
          <p className="text-sm text-[#7d8279]">原文</p>
          <p className="mt-1 text-[15px] leading-6 text-[#303b33]">{resultEntry.rawText}</p>
        </div>

        {resultEntry.foodItems.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-sm font-medium text-[#6f8e77]">食物</p>
            <div className="grid gap-2">
              {resultEntry.foodItems.map((item, index) => (
                <div key={item.id ?? index} className="grid gap-2 rounded-[18px] bg-[#f4f7ed] p-3 md:grid-cols-[minmax(0,1.2fr)_120px_110px] md:items-center">
                  <input
                    className="min-w-0 rounded-full border border-[#d9e3d3] bg-white px-3 py-2 text-sm text-[#3a4a3e] outline-none focus:border-[#95ad99]"
                    value={item.name}
                    onChange={(event) => onUpdateFoodName(index, event.target.value)}
                  />
                  <span className="rounded-full border border-[#d9e3d3] bg-white px-3 py-2 text-sm text-[#596159]">
                    {item.quantity}{item.unit || ''}
                  </span>
                  <span className="flex items-center justify-end gap-1 rounded-full border border-[#d9e3d3] bg-white px-3 py-2 text-sm text-[#3a4a3e]">
                    <strong>{item.calories}</strong>
                    <span className="text-xs text-[#7d8279]">kcal</span>
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
                  <span className="min-w-0 rounded-full border border-[#eadfce] bg-white px-3 py-2 text-sm text-[#8a5b24]">
                    {water.rawText}
                  </span>
                  <span className="flex items-center justify-end gap-1 rounded-full border border-[#eadfce] bg-white px-3 py-2 text-sm text-[#8a5b24]">
                    <strong>{water.amountMl}</strong>
                    <span className="text-xs text-[#9a6b31]">ml</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between rounded-[22px] bg-gradient-to-r from-[#7f9b86]/10 to-[#eca94f]/10 px-4 py-3">
          <span className="text-sm text-[#596159]">总热量</span>
          <strong className="text-lg font-semibold text-[#2f3b33]">{resultEntry.finalTotalCalories} kcal</strong>
        </div>

        {resultEntry.needReview && (
          <div className="mb-4 rounded-[18px] border border-[#f0d9b5] bg-[#fef8ed] px-4 py-3 text-sm text-[#9a6b31]">
            {resultEntry.reviewReason || '部分项目建议确认'}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="rounded-full border border-[#d8cebd] px-5 py-3 text-sm font-medium text-[#626a60] transition hover:bg-[#fbf8f1] active:translate-y-px sm:flex-1"
            type="button"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="rounded-full bg-[#5f7f68] px-5 py-3 text-sm font-medium text-white shadow-[0_12px_24px_rgba(95,127,104,0.24)] transition hover:bg-[#536f5b] active:translate-y-px disabled:opacity-60 sm:flex-[1.5]"
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
