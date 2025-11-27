/**
 * Server-Sent Events (SSE) 서비스
 * 실시간 랭킹 갱신 알림을 위한 SSE 연결 관리
 */

import type { Response } from "express";

class SSEService {
  private clients: Set<Response> = new Set();

  /**
   * SSE 클라이언트 연결 추가
   * @param res Express Response 객체
   */
  addClient(res: Response): void {
    // SSE 헤더 설정
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Nginx 버퍼링 방지

    // 클라이언트를 목록에 추가
    this.clients.add(res);

    // 연결 시작 메시지 전송
    res.write(`event: connected\ndata: ${JSON.stringify({ message: "연결되었습니다" })}\n\n`);

    // 주기적으로 heartbeat 전송 (연결 유지)
    const heartbeatInterval = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch (error) {
        clearInterval(heartbeatInterval);
        this.clients.delete(res);
      }
    }, 30000); // 30초마다 heartbeat

    // 클라이언트 연결 종료 시 정리
    res.on("close", () => {
      clearInterval(heartbeatInterval);
      this.clients.delete(res);
    });
  }

  /**
   * 모든 SSE 클라이언트에게 이벤트 브로드캐스트
   * @param event 이벤트 이름
   * @param data 이벤트 데이터
   */
  broadcast(event: string, data: any): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    this.clients.forEach((client) => {
      try {
        client.write(message);
      } catch (error) {
        // 연결이 끊어진 클라이언트는 목록에서 제거
        this.clients.delete(client);
      }
    });
  }

  /**
   * 현재 연결된 클라이언트 수 반환
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

// 싱글톤 인스턴스
export const sseService = new SSEService();

