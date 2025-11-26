import { google } from "googleapis";
import type { QuickDrawResult, RankingData } from "../shared/schema";
import { getErrorMessage } from "../shared/utils";
import { CATEGORY_NAMES } from "../shared/categories";

/**
 * 구글 시트에 QuickDraw 분석 결과를 저장하는 서비스 클래스
 * 
 * 사용 전 설정 필요:
 * 1. Google Cloud Console에서 서비스 계정 생성
 * 2. 서비스 계정 키 JSON 파일 다운로드
 * 3. 환경 변수 GOOGLE_SERVICE_ACCOUNT_KEY에 JSON 내용 설정
 * 4. 구글 스프레드시트에 서비스 계정 이메일 공유 (편집 권한)
 */
export class GoogleSheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    // 환경 변수에서 설정 가져오기
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!serviceAccountKey) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.");
    }

    if (!spreadsheetId) {
      throw new Error("GOOGLE_SPREADSHEET_ID 환경 변수가 설정되지 않았습니다.");
    }

    this.spreadsheetId = spreadsheetId;

    try {
      // JSON 문자열 파싱 시도
      let credentials;
      try {
        // 이미 JSON 객체인 경우와 문자열인 경우 모두 처리
        if (typeof serviceAccountKey === 'string') {
          // 문자열의 앞뒤 공백 제거
          let trimmed = serviceAccountKey.trim();
          
          // 작은따옴표나 큰따옴표로 감싸져 있으면 제거
          if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
              (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
            trimmed = trimmed.slice(1, -1);
            // 이스케이프된 따옴표 복원
            trimmed = trimmed.replace(/\\"/g, '"').replace(/\\'/g, "'");
          }
          
          credentials = JSON.parse(trimmed);
        } else {
          credentials = serviceAccountKey;
        }
      } catch (parseError) {
        throw new Error(`GOOGLE_SERVICE_ACCOUNT_KEY JSON 파싱 실패: ${parseError instanceof Error ? parseError.message : String(parseError)}. 환경 변수가 올바른 JSON 형식인지 확인하세요.`);
      }

      // 서비스 계정 인증
      const auth = new google.auth.GoogleAuth({
        credentials, // 파싱된 JSON 객체
        scopes: ["https://www.googleapis.com/auth/spreadsheets"], // 스프레드시트 접근 권한
      });

      this.sheets = google.sheets({ version: "v4", auth });
    } catch (error) {
      throw new Error(`구글 시트 인증 실패: ${getErrorMessage(error)}`);
    }
  }

  /**
   * QuickDraw 분석 결과를 구글 시트에 추가
   * 
   * @param data 저장할 분석 결과 데이터
   * @returns 성공 여부
   */
  async saveQuickDrawResult(data: QuickDrawResult): Promise<boolean> {
    try {
      // 헤더가 없으면 먼저 헤더 추가
      await this.ensureHeaders();

      // 클래스명을 한글로 변환 (공통 설정 파일 사용)
      const targetClassKorean = CATEGORY_NAMES[data.targetClass] || data.targetClass;
      const predictedClassKorean = CATEGORY_NAMES[data.predictedClass] || data.predictedClass;

      // 데이터 행 추가
      // completedAt 앞에 작은따옴표(')를 붙여서 텍스트로 강제 저장 (구글 시트가 날짜로 변환하지 않도록)
      const values = [
        [
          data.company, // 회사
          data.employeeId, // 사번
          data.name, // 이름
          data.department, // 부서명
          targetClassKorean, // 목표 그림
          predictedClassKorean, // 예측 그림
          (data.confidence * 100).toFixed(1) + "%", // 유사도 (%)
          data.drawingTime.toFixed(1) + "초", // 소요 시간
          `'${data.completedAt}`, // 분석 완료 시각 (작은따옴표로 시작하여 텍스트로 강제 저장)
        ],
      ];

      // append는 첫 번째 시트의 A열부터 시작하여 자동으로 다음 행에 추가
      // 범위를 지정하지 않고 시트 이름만 사용 (첫 번째 시트가 기본값)
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: "A:I", // 열 범위만 지정 (시트 이름 없이)
        valueInputOption: "USER_ENTERED", // 사용자가 입력한 것처럼 처리
        insertDataOption: "INSERT_ROWS", // 새 행 삽입
        requestBody: {
          values,
        },
      });

      return true;
    } catch (error: any) {
      console.error("❌ 구글 시트 저장 실패:");
      console.error("에러 타입:", error?.constructor?.name);
      console.error("에러 메시지:", error?.message);
      if (error?.response) {
        console.error("API 응답 상태:", error.response.status);
        console.error("API 응답 데이터:", error.response.data);
      }
      if (error?.code) {
        console.error("에러 코드:", error.code);
      }
      throw error;
    }
  }

  /**
   * 시트에 헤더가 없으면 추가
   */
  private async ensureHeaders(): Promise<void> {
    try {
      // 첫 번째 행 읽기 (시트 이름 없이 A1:I1 사용)
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A1:I1", // 첫 번째 행의 A~I열 (기본 시트 사용)
      });

      const rows = response.data.values;

      // 헤더가 없거나 비어있으면 헤더 추가
      if (!rows || rows.length === 0 || !rows[0] || rows[0].length === 0) {
        const headers = [
          ["회사", "사번", "이름", "부서명", "목표 그림", "예측 그림", "유사도", "소요 시간", "분석 완료 시각"],
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: "A1:I1", // 첫 번째 행의 A~I열 (기본 시트 사용)
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: headers,
          },
        });
      }
    } catch (error) {
      // 시트가 비어있거나 접근 오류인 경우 헤더 추가 시도
      console.warn("헤더 확인 중 오류 (무시하고 계속 진행):", error);
    }
  }

  /**
   * 구글 시트에서 랭킹 데이터 조회
   * 그림 그리는 시간 기준으로 오름차순 정렬 (빠른 순서대로)
   * 
   * @returns 랭킹 데이터 배열
   */
  async getRankingData(): Promise<RankingData[]> {
    try {
      // 전체 데이터 읽기 (헤더 포함)
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: "A:I", // A열부터 I열까지 전체
      });

      const rows = response.data.values;

      // 데이터가 없으면 빈 배열 반환
      if (!rows || rows.length <= 1) {
        return [];
      }

      // 헤더 제외하고 데이터만 추출
      const dataRows = rows.slice(1);

      // 데이터 파싱
      const parsedData = dataRows
        .map((row: any[], index: number) => {
          try {
            // 행 데이터 추출
            const company = row[0] || ""; // 회사
            const employeeId = row[1] || ""; // 사번
            const name = row[2] || ""; // 이름
            const department = row[3] || ""; // 부서명
            const targetClass = row[4] || ""; // 목표 그림 (한글)
            const drawingTimeStr = row[7] || ""; // 소요 시간 (예: "10.5초")
            const completedAt = row[8] || ""; // 완료 시각

            // 소요 시간 파싱 ("10.5초" -> 10.5)
            let drawingTime = 0;
            if (drawingTimeStr) {
              const timeStr = String(drawingTimeStr).replace("초", "").trim();
              const parsed = parseFloat(timeStr);
              if (!isNaN(parsed) && parsed > 0) {
                drawingTime = parsed;
              }
            }

            // 필수 필드 검증
            if (!company || !employeeId || !name || !targetClass || drawingTime <= 0) {
              return null;
            }

            // completedAt에서 작은따옴표 제거 (텍스트로 저장된 경우)
            let cleanCompletedAt = String(completedAt);
            if (cleanCompletedAt.startsWith("'")) {
              cleanCompletedAt = cleanCompletedAt.substring(1);
            }

            return {
              company,
              employeeId,
              name,
              department: department || "",
              targetClass,
              drawingTime,
              completedAt: cleanCompletedAt,
            };
          } catch (error) {
            console.warn(`행 ${index + 2} 파싱 실패:`, error);
            return null;
          }
        })
        .filter((item): item is RankingData => item !== null);

      // 회사와 사번을 기준으로 중복 제거 (가장 최근에 그린 것만 선택)
      const uniqueMap = new Map<string, RankingData>();
      for (const item of parsedData) {
        const key = `${item.company}|${item.employeeId}`; // 회사와 사번을 키로 사용
        const existing = uniqueMap.get(key);
        
        if (!existing) {
          // 해당 키가 없으면 추가
          uniqueMap.set(key, item);
        } else {
          // 이미 존재하면 completedAt을 비교하여 더 최근 것을 선택
          // completedAt은 "YYYY-MM-DD HH:MM:SS" 형식으로 가정
          if (item.completedAt > existing.completedAt) {
            uniqueMap.set(key, item);
          }
        }
      }

      // Map에서 배열로 변환
      const uniqueData = Array.from(uniqueMap.values());

      // 그림 그리는 시간 기준 오름차순 정렬 (빠른 순서대로)
      uniqueData.sort((a, b) => {
        // 1순위: 소요 시간 오름차순 (빠른 순서)
        if (a.drawingTime !== b.drawingTime) {
          return a.drawingTime - b.drawingTime;
        }
        // 2순위: 완료 시각 오름차순 (빠른 순서)
        return a.completedAt.localeCompare(b.completedAt);
      });

      return uniqueData;
    } catch (error: any) {
      console.error("❌ 랭킹 데이터 조회 실패:");
      console.error("에러 타입:", error?.constructor?.name);
      console.error("에러 메시지:", error?.message);
      if (error?.response) {
        console.error("API 응답 상태:", error.response.status);
        console.error("API 응답 데이터:", error.response.data);
      }
      // 구글 시트 서비스 관련 에러임을 명시
      const errorMessage = error?.message || String(error);
      throw new Error(`구글 시트 서비스 오류: ${errorMessage}`);
    }
  }
}

