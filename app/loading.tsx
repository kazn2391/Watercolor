export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full bg-clay animate-pulse" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-rose animate-pulse" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-sage animate-pulse" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );
}
