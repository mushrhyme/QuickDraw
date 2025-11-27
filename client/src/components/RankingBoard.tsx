import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useMemo } from "react";
import { Trophy, RefreshCw, Wifi, WifiOff, Gift, Sparkles, Bot, Crown, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Footer from "@/components/Footer";
import MatrixBackground from "@/components/MatrixBackground";
import type { RankingData } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

// 순위가 포함된 랭킹 데이터 타입
type RankedData = RankingData & {
  rank: number; // 순위 (동점 처리 포함)
};

export default function RankingBoard() {
  const isMobile = useIsMobile(); // 모바일 레이아웃 감지
  const [isSSEConnected, setIsSSEConnected] = useState(false); // SSE 연결 상태

  // 랭킹 데이터 조회
  const { data: rawRankingData = [], isLoading, error, refetch } = useQuery<RankingData[]>({
    queryKey: ["/api/ranking"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/ranking");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("❌ 랭킹 데이터 조회 실패:", error);
        throw error;
      }
    },
    refetchOnWindowFocus: true, // 창 포커스 시 갱신
  });

  // SSE 연결 및 이벤트 처리
  useEffect(() => {
    const eventSource = new EventSource("/api/ranking/stream");

    // 연결 성공 이벤트
    eventSource.addEventListener("connected", () => {
      setIsSSEConnected(true);
    });

    // 랭킹 갱신 이벤트
    eventSource.addEventListener("ranking-updated", () => {
      refetch(); // 데이터 갱신
    });

    // 에러 처리
    eventSource.onerror = (error) => {
      console.error("❌ SSE 연결 오류:", error);
      setIsSSEConnected(false);
      // 연결이 끊어지면 자동으로 재연결 시도 (EventSource가 자동으로 재연결)
    };

    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      eventSource.close();
      setIsSSEConnected(false);
    };
  }, [refetch]);

  // 순위 계산 및 정렬된 데이터 생성
  const rankedData = useMemo(() => {
    if (!rawRankingData || rawRankingData.length === 0) {
      return [];
    }

    // 이미 서버에서 시간 기준 오름차순 정렬되어 있음
    const data: RankedData[] = [];
    let currentRank = 1;
    let previousTime = -1;

    rawRankingData.forEach((item, index) => {
      // 동일한 시간이면 같은 순위 부여
      if (previousTime >= 0 && Math.abs(item.drawingTime - previousTime) < 0.01) {
        // 이전 항목과 같은 순위
        data.push({
          ...item,
          rank: currentRank,
        });
      } else {
        // 새로운 순위
        currentRank = index + 1;
        data.push({
          ...item,
          rank: currentRank,
        });
        previousTime = item.drawingTime;
      }
    });

    return data;
  }, [rawRankingData]);

  // 시간 포맷팅 함수 (초를 읽기 쉬운 형식으로)
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}초`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds.toFixed(1)}초`;
  };

  // 순위 표시 (라이트모드 스타일)
  const getRankBadge = (rank: number) => {
    const commonStyle = `inline-flex items-center justify-center ${isMobile ? 'text-sm' : 'text-xl'} font-bold`;
    if (rank === 1) {
      return <span className={`${commonStyle} text-[#26bfa6]`}>1위</span>;
    }
    if (rank === 2) {
      return <span className={`${commonStyle} text-[#26bfa6]`}>2위</span>;
    }
    if (rank === 3) {
      return <span className={`${commonStyle} text-[#26bfa6]`}>3위</span>;
    }
    return <span className={`${commonStyle} text-gray-600`}>{rank}위</span>;
  };

  // 순위별 배경색 반환 (1위는 더 밝게)
  const getRowBackgroundColor = (rank: number) => {
    if (rank === 1) {
      return '#F0FDFA'; // 1위는 민트 톤 배경
    }
    if (rank === 2) {
      return '#F9FAFB'; // 약간 밝은 회색
    }
    if (rank === 3) {
      return '#FFFFFF'; // 흰색
    }
    return '#FFFFFF'; // 기본 흰색
  };

  // 순위별 테두리 스타일 반환 (1위는 더 강렬하게)
  const getRowBorderStyle = (rank: number) => {
    if (rank === 1) {
      return { 
        borderLeft: '3px solid rgba(38, 191, 166, 0.5)',
        borderRight: '1px solid rgba(38, 191, 166, 0.2)',
        boxShadow: 'inset 0 0 20px rgba(38, 191, 166, 0.1)'
      };
    }
    return {};
  };

  // 1위 행 클래스명 반환
  const getRowClassName = (rank: number) => {
    if (rank === 1) {
      return "hover:border-l-2 hover:border-[#26bfa6] hover:border-opacity-40 transition-all duration-200 animate-pulse-slow";
    }
    return "hover:border-l-2 hover:border-[#26bfa6] hover:border-opacity-40 transition-all duration-200";
  };

  return (
    <div className="h-screen flex flex-col relative overflow-hidden bg-gradient-to-br from-gray-50 to-white">
      <MatrixBackground color="#26bfa6" opacity={0.1} density={0.3} />

      <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-2' : 'p-8'} relative z-10`}>
      {/* 헤더 */}
      
      {/* 에러 표시 */}
      {error && (
        <div className={`mb-6 ${isMobile ? 'max-w-full mx-auto px-2' : 'max-w-5xl mx-auto px-8'}`}>
          <Alert variant="destructive" className="rounded-md bg-white border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" strokeWidth={1.5} />
            <AlertTitle className="text-red-600 font-semibold">데이터 로딩 오류</AlertTitle>
            <AlertDescription className="text-gray-700">
              {error instanceof Error ? error.message : "랭킹 데이터를 불러오는 중 오류가 발생했습니다."}
              <br />
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3 text-gray-700 hover:bg-gray-50 bg-white"
                style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
              >
                다시 시도
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* 랭킹 테이블 */}
      <div className={`flex-1 overflow-hidden flex justify-center ${isMobile ? 'px-0' : 'px-8'}`}>
        <div 
          className={`overflow-hidden ${isMobile ? 'max-w-full' : 'max-w-5xl'} w-full rounded-md relative bg-white`}
          style={{ 
            border: '1px solid rgba(38, 191, 166, 0.3)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* 상단 민트 하이라이트 라인 */}
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(to right, transparent, rgba(38, 191, 166, 0.5), transparent)' }}></div>
          <div className="h-full flex flex-col">
            {/* 상단: 이벤트 안내 제목 및 3개 카드 */}
            <div className={`${isMobile ? 'px-3 py-4' : 'px-8 py-6'} bg-gray-50`}>
              <div className={`flex items-center justify-center ${isMobile ? 'gap-2 mb-4' : 'gap-3 mb-6'}`}>
                <Gift className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-[#26bfa6]`} strokeWidth={2} />
                <h2 className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900`}>이벤트 안내</h2>
                <Sparkles className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-[#26bfa6]`} strokeWidth={2} />
              </div>
              <div className="grid grid-cols-3 gap-4" style={{ marginBottom: isMobile ? '16px' : '28px' }}>
                {/* 카드 1: 참여 안내 */}
                <div 
                  className={`rounded-md ${isMobile ? 'p-3' : 'p-5'} bg-white border border-gray-200 shadow-sm`}
                >
                  <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                    <Bot className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-[#26bfa6]`} strokeWidth={2} />
                    <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>참여 안내</h3>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-normal leading-relaxed text-gray-700`}>
                  <span className="font-semibold text-[#26bfa6]">1인 1회 참여</span>로 자동 집계되며, <br/>중복 참여는 불가합니다.
                  </p>
                </div>
                {/* 카드 2: 1등 선물 */}
                <div 
                  className={`rounded-md ${isMobile ? 'p-3' : 'p-5'} bg-white border border-gray-200 shadow-sm`}
                >
                  <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                    <Trophy className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-[#26bfa6]`} strokeWidth={2} />
                    <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>랭킹보드 이벤트</h3>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-normal leading-relaxed text-gray-700`}>
                    가장 빨리 그림을 그린 <span className="font-bold text-[#26bfa6]">1명</span>에게<br />
                    <span className="font-bold text-[#26bfa6]">백산수 한정판 굿즈 키트</span>를 드립니다!
                  </p>
                </div>
                {/* 카드 3: 3명 선물 */}
                <div 
                  className={`rounded-md ${isMobile ? 'p-3' : 'p-5'} bg-white border border-gray-200 shadow-sm`}
                >
                  <div className={`flex items-center gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
                    <Sparkles className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-[#26bfa6]`} strokeWidth={2} />
                    <h3 className={`${isMobile ? 'text-sm' : 'text-base'} font-semibold text-gray-900`}>랜덤추첨 이벤트</h3>
                  </div>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-normal leading-relaxed text-gray-700`}>
                    참여자 전원을 대상으로 추첨을 통해 <br /> <span className="font-bold text-[#26bfa6]">3명</span>에게
                    간식 선물을 드립니다!
                  </p>
                </div>
              </div>
              {/* 실시간 랭킹보드 타이틀 */}
              <div className="text-center" style={{ marginBottom: isMobile ? '10px' : '14px' }}>
                <div className={`flex items-center justify-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  <Crown className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-[#26bfa6]`} strokeWidth={2} />
                  <h2 className={`${isMobile ? 'text-base' : 'text-2xl'} font-semibold text-gray-900`}>실시간 랭킹보드</h2>
                  <Trophy className={`${isMobile ? 'w-4 h-4' : 'w-6 h-6'} text-[#26bfa6]`} strokeWidth={2} />
                </div>
              </div>
              {/* 구분선 */}
              <div className="mx-auto" style={{ width: isMobile ? '200px' : '300px', height: '1px', backgroundColor: 'rgba(38, 191, 166, 0.25)' }}></div>
            </div>
            {/* 테이블 영역 */}
            <div className="overflow-hidden h-[1400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-16">
              <div className="text-center space-y-4">
                <RefreshCw className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} animate-spin mx-auto text-[#26bfa6]`} strokeWidth={2} />
                <p className={`${isMobile ? "text-sm" : "text-lg"} text-gray-700`}>랭킹 데이터를 불러오는 중...</p>
              </div>
            </div>
              ) : rankedData.length === 0 ? (
            <div className="flex items-center justify-center h-full py-16">
              <div className="text-center space-y-4">
                <Trophy className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} mx-auto text-gray-400`} strokeWidth={2} />
                <p className={`${isMobile ? "text-base" : "text-xl"} text-gray-700`}>아직 랭킹 데이터가 없습니다</p>
              </div>
            </div>
          ) : (
            <div className={isMobile ? "overflow-x-auto" : ""}>
            <Table className={isMobile ? "text-xs min-w-[600px]" : "text-lg"}>
              <TableHeader>
                <TableRow className="bg-gray-100">
                      <TableHead className={`${isMobile ? 'w-16 text-center font-semibold py-3 px-2' : 'w-20 text-center font-semibold py-6 px-6'} text-gray-900`}>순위</TableHead>
                      <TableHead className={`${isMobile ? 'w-24 text-center font-semibold py-3 px-2' : 'w-32 text-center font-semibold py-6 px-6'} text-gray-900`}>이름</TableHead>
                      <TableHead className={`${isMobile ? 'w-24 text-center font-semibold py-3 px-2' : 'w-32 text-center font-semibold py-6 px-6'} text-gray-900`}>회사</TableHead>
                      <TableHead className={`${isMobile ? 'w-28 text-center font-semibold py-3 px-2' : 'w-40 text-center font-semibold py-6 px-6'} text-gray-900`}>부서명</TableHead>
                      <TableHead className={`${isMobile ? 'w-24 text-center font-semibold py-3 px-2' : 'w-32 text-center font-semibold py-6 px-6'} text-gray-900`}>목표 그림</TableHead>
                      <TableHead className={`${isMobile ? 'w-24 text-center font-semibold py-3 px-2' : 'w-32 text-center font-semibold py-6 px-6'} text-gray-900`}>걸린 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedData.slice(0, 15).map((item, index) => (
                  <TableRow 
                    key={`${item.employeeId}-${item.completedAt}-${index}`}
                    style={{ 
                      backgroundColor: getRowBackgroundColor(item.rank), 
                      borderBottom: '1px solid rgba(229, 231, 235, 0.5)',
                      ...getRowBorderStyle(item.rank)
                    }}
                    className={getRowClassName(item.rank)}
                  >
                    <TableCell className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'}`}>
                      <div>
                        {getRankBadge(item.rank)}
                      </div>
                    </TableCell>
                    <TableCell className={`font-bold text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'} text-gray-900`}>{item.name}</TableCell>
                    <TableCell className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'} text-gray-600`}>{item.company}</TableCell>
                    <TableCell className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'} text-gray-600`}>{item.department || "-"}</TableCell>
                    <TableCell className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'} text-gray-600`}>{item.targetClass}</TableCell>
                    <TableCell className={`text-center ${isMobile ? 'py-4 px-2' : 'py-8 px-6'} text-[#26bfa6] font-semibold`}>
                      {formatTime(item.drawingTime)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
            </div>
              )}
            </div>
            {/* SSE 연결 상태 및 새로고침 버튼 - 랭킹 하단 */}
            <div className={`${isMobile ? 'px-3 py-3' : 'px-8 py-4'} flex ${isMobile ? 'flex-col' : 'items-center justify-center'} ${isMobile ? 'gap-3' : 'gap-6'} bg-gray-50`}>
              {/* SSE 연결 상태 표시 */}
              <div className="flex items-center gap-2">
                {isSSEConnected ? (
                  <>
                    <Wifi className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-[#26bfa6]`} strokeWidth={2} />
                    <span className={`${isMobile ? "text-xs" : "text-sm"} text-gray-700`}>실시간 연결됨</span>
                  </>
                ) : (
                  <>
                    <WifiOff className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} text-gray-400`} strokeWidth={2} />
                    <span className={`${isMobile ? "text-xs" : "text-sm"} text-gray-700`}>연결 중...</span>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className={`gap-2 hover:bg-gray-100 bg-white ${isMobile ? 'w-full' : ''} text-gray-700`}
                style={{ borderColor: 'rgba(38, 191, 166, 0.2)' }}
              >
                <RefreshCw className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'}`} strokeWidth={2} />
                새로고침
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
}

