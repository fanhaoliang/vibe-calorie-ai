export default function LoadingOverlay() {
  return (
    <div className="record-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#f8f5ee]/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="record-loader relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-[3px] border-[#dfe6d7]" />
          <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#5f7f68]" />
          <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-b-[#eca94f]" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }} />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-[#303b33]">正在解析记录…</p>
          <p className="mt-1 text-sm text-[#7d8279]">识别食物和饮水中</p>
        </div>
      </div>
    </div>
  );
}
