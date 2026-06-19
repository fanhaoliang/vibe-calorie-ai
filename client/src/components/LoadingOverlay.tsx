export default function LoadingOverlay() {
  return (
    <div className="record-overlay fixed inset-0 z-50 flex items-center justify-center bg-[#f8f5ee]/85 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="burn-loader">
          <div className="burn-ring" />
          <div className="burn-flame">
            <span className="burn-spark burn-spark--a" />
            <span className="burn-spark burn-spark--b" />
            <span className="burn-spark burn-spark--c" />
          </div>
          <div className="burn-base" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-[#303b33]">正在燃烧卡路里…</p>
          <p className="mt-1 text-xs text-[#7d8279]">解析食物与饮水中</p>
        </div>
      </div>
    </div>
  );
}
