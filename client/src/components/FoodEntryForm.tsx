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
    <form className="rounded-[34px] border border-[#e8dfd2] bg-white/82 p-5 shadow-[0_22px_70px_rgba(79,92,72,0.10)]" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-sm text-[#6f8e77]">
            <Sparkle size={18} weight="duotone" />
            <span>智能饮食助手</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#303b33]">随手记一餐</h2>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {QUICK_FOOD_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-full border border-[#dfe4d8] bg-[#f7faf2] px-3 py-1.5 text-xs font-medium text-[#5f7b66] transition hover:border-[#b9c9b8] hover:bg-white active:translate-y-px"
            type="button"
            onClick={() => onChange(foodText ? `${foodText}\n${prompt}` : prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-[28px] border border-[#e2d8c8] bg-[#fbf8f1] p-3 focus-within:border-[#95ad99] focus-within:ring-4 focus-within:ring-[#dfe8d9]">
        <textarea
          className="min-h-[210px] w-full resize-none bg-transparent p-3 text-[16px] leading-8 text-[#303b33] outline-none placeholder:text-[#a0a69c]"
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
        <div className="flex flex-col gap-3 border-t border-[#e7ddcf] px-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#7d8279]">Enter 自动记录，Shift + Enter 换行；会识别食物和饮水。</p>
          <div className="flex gap-2">
            <button type="button" className="rounded-full border border-[#d8cebd] px-4 py-2 text-sm text-[#626a60] transition hover:bg-white active:translate-y-px" onClick={() => onChange('')}>
              清空
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5f7f68] px-5 py-2.5 text-sm font-medium text-white shadow-[0_12px_24px_rgba(95,127,104,0.24)] transition hover:bg-[#536f5b] active:translate-y-px disabled:opacity-70" type="submit" disabled={submitting || !foodText.trim()}>
              <NotePencil size={18} weight="duotone" />
              {submitting ? '记录中…' : '记录'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
