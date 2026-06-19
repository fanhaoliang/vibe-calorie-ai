import { FormEvent } from 'react';
import { NotePencil, Sparkle } from '@phosphor-icons/react';
import { QUICK_FOOD_PROMPTS } from '../constants';

interface FoodEntryFormProps {
  foodText: string;
  submitting: boolean;
  onChange: (text: string) => void;
  onSubmit: (event: FormEvent) => void;
}

export default function FoodEntryForm({ foodText, submitting, onChange, onSubmit }: FoodEntryFormProps) {
  return (
    <form className="glass-card rounded-[34px] p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-[#2e8b8b]">
            <Sparkle size={18} weight="duotone" />
            <span>智能饮食助手</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#1d2a30]">随手记一餐</h2>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_FOOD_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-[#cfe2df] bg-[#f0f8f6] px-3 py-1.5 text-xs font-medium text-[#2e8b8b] transition hover:border-[#9bcfca] hover:bg-white active:translate-y-px"
            type="button"
            onClick={() => onChange(foodText ? `${foodText}\n${prompt}` : prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-[28px] border border-[#cdd6d6] bg-[#f4f6f6] p-3 focus-within:border-[#7ec8c2] focus-within:ring-4 focus-within:ring-[#cfe2df]">
        <textarea
          className="min-h-[210px] w-full resize-none bg-transparent p-3 text-[16px] leading-8 text-[#1d2a30] outline-none placeholder:text-[#a8b1b6]"
          maxLength={500}
          value={foodText}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="例如：今天吃了2个鸡蛋、一碗米饭、150g鸡胸，喝了500ml水"
        />
        <div className="flex flex-col gap-3 border-t border-[#dde3e3] px-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#8a949b]">Enter 提交 · Shift + Enter 换行</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-full border border-[#cdd6d6] px-4 py-2 text-sm text-[#4a5860] transition hover:bg-white active:translate-y-px" onClick={() => onChange('')}>
              清空
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#3aa39e] to-[#1f6b6b] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_28px_rgba(95,127,104,0.32)] transition-all duration-200 hover:-translate-y-px hover:shadow-[0_18px_36px_rgba(95,127,104,0.42)] active:translate-y-px disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[0_12px_28px_rgba(95,127,104,0.32)]" type="submit" disabled={submitting || !foodText.trim()}>
              <NotePencil size={18} weight="duotone" />
              {submitting ? '记录中…' : '记录'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
