import { google } from "googleapis";
import type { QuickDrawResult } from "../shared/schema";
import { formatKSTDateTime, getErrorMessage } from "../shared/utils";
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
}

