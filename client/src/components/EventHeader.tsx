// DT FAIR 2025 이벤트 헤더 컴포넌트
export default function EventHeader() {
  return (
    <header className="absolute top-2 left-0 right-0 z-50 px-4 py-2">
      <div className="flex items-center gap-2">
        <img 
          src="/dt-fair.png" 
          alt="DT FAIR 2025" 
          className="h-12 object-contain"
        />
      </div>
    </header>
  );
}

