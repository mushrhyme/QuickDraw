// Footer 컴포넌트 - 저작권 및 제작 정보 표시
export default function Footer() {
  return (
    <footer className="w-full py-3 px-4 text-center border-t border-gray-800 bg-black/95">
      <div className="flex flex-col items-center gap-1 text-sm text-gray-400">
        <p className="text-xs">
          © 2025 농심 DT추진팀. All rights reserved.
        </p>
        <div className="flex flex-col items-center gap-0.5 text-xs opacity-70">
          <p>개발: 조유민 주임 (농심 DT추진팀)</p>
        </div>
      </div>
    </footer>
  );
}

