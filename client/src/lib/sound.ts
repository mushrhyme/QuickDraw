/**
 * 사운드 재생을 위한 유틸리티 클래스 (크롬 최적화)
 */
class SoundManager {
  private audioContextActivated: boolean = false; // 오디오 컨텍스트 활성화 여부
  private audioContext: AudioContext | null = null; // Web Audio API 컨텍스트
  private preloadedAudios: Map<string, HTMLAudioElement> = new Map(); // 사전 로드된 오디오

  /**
   * 오디오 컨텍스트 활성화 (크롬 자동 재생 정책 대응)
   * 사용자 상호작용 후 한 번 호출하면 이후 오디오 재생이 가능해집니다
   * @returns Promise<void> 오디오 컨텍스트 활성화 완료를 기다리는 Promise
   */
  activateAudioContext(): Promise<void> {
    if (this.audioContextActivated) {
      return Promise.resolve();
    }
    
    return new Promise((resolve) => {
      try {
        // 크롬: Web Audio API 사용하여 더 확실한 활성화
        if (typeof window !== 'undefined' && window.AudioContext) {
          try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
              this.audioContext.resume().then(() => {
                this.audioContextActivated = true;
                resolve();
              }).catch(() => {
                // Web Audio API 실패 시 일반 Audio로 폴백
                this.activateWithAudio(resolve);
              });
            } else {
              this.audioContextActivated = true;
              resolve();
            }
          } catch {
            // Web Audio API 실패 시 일반 Audio로 폴백
            this.activateWithAudio(resolve);
          }
        } else {
          // Web Audio API 미지원 시 일반 Audio 사용
          this.activateWithAudio(resolve);
        }
      } catch (error) {
        console.warn('오디오 컨텍스트 활성화 실패:', error);
        this.audioContextActivated = true; // 실패해도 활성화된 것으로 간주
        resolve();
      }
    });
  }

  /**
   * 일반 Audio 객체를 사용한 오디오 컨텍스트 활성화 (폴백)
   */
  private activateWithAudio(resolve: () => void): void {
    try {
      // 실제 사운드 파일을 사용하여 더 확실한 활성화 (크롬에서 더 잘 작동)
      const testAudio = new Audio('/sounds/camera.mp3');
      testAudio.volume = 0.01;
      testAudio.preload = 'auto';
      
      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.audioContextActivated = true;
            testAudio.pause();
            testAudio.currentTime = 0;
            testAudio.remove();
            resolve();
          })
          .catch(() => {
            // 재생 실패해도 활성화된 것으로 간주 (크롬 정책으로 차단될 수 있음)
            this.audioContextActivated = true;
            resolve();
          });
      } else {
        this.audioContextActivated = true;
        resolve();
      }
    } catch (error) {
      this.audioContextActivated = true;
      resolve();
    }
  }

  /**
   * 사운드 재생 (크롬 최적화)
   * @param soundPath 사운드 파일 경로 (public 폴더 기준)
   * @param volume 볼륨 (0.0 ~ 1.0, 기본값: 0.7)
   * @param forceNew 강제로 새로운 Audio 객체 생성 (기본값: false)
   * @returns Audio 객체 (정지 등 제어를 위해 반환)
   */
  play(soundPath: string, volume: number = 0.7, forceNew: boolean = false): HTMLAudioElement | null {
    try {
      let audio: HTMLAudioElement;
      
      if (forceNew) {
        // 강제로 새로운 Audio 객체 생성 (전체 재생 보장)
        audio = new Audio(soundPath);
        audio.preload = 'auto';
        audio.volume = volume;
      } else {
        // 크롬: 사전 로드된 오디오가 있으면 재사용 (더 빠르고 안정적)
        const preloadedAudio = this.preloadedAudios.get(soundPath);
        
        if (!preloadedAudio) {
          audio = new Audio(soundPath);
          audio.preload = 'auto'; // 크롬: 미리 로드
          audio.volume = volume;
          this.preloadedAudios.set(soundPath, audio);
        } else {
          // 재사용 시 볼륨 업데이트 및 처음부터 재생
          audio = preloadedAudio;
          audio.volume = volume;
          audio.currentTime = 0;
        }
      }

      // 크롬: 오디오 컨텍스트가 활성화되지 않았다면 활성화 후 재생
      const playAudio = () => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // 크롬 자동 재생 정책으로 차단된 경우 로그만 출력
            console.warn(`사운드 재생 실패: ${soundPath}`, error);
            // 재시도: 새로운 Audio 객체로 재생 시도
            this.retryPlay(soundPath, volume);
          });
        }
      };

      if (!this.audioContextActivated) {
        this.activateAudioContext().then(() => {
          playAudio();
        });
      } else {
        playAudio();
      }
      
      return audio;
    } catch (error) {
      console.warn(`사운드 로드 실패: ${soundPath}`, error);
      return null;
    }
  }

  /**
   * 재생 실패 시 재시도 (크롬 자동 재생 정책 대응)
   */
  private retryPlay(soundPath: string, volume: number): void {
    try {
      const audio = new Audio(soundPath);
      audio.volume = volume;
      audio.play().catch(() => {
        // 재시도도 실패하면 무시
        console.warn(`사운드 재생 재시도 실패: ${soundPath}`);
      });
    } catch (error) {
      console.warn(`사운드 재시도 로드 실패: ${soundPath}`, error);
    }
  }

  /**
   * 배경음악 재생 (반복 재생, 크롬 최적화)
   * @param soundPath 사운드 파일 경로
   * @param volume 볼륨 (0.0 ~ 1.0, 기본값: 0.5)
   * @returns Audio 객체
   */
  playBackground(soundPath: string, volume: number = 0.5): HTMLAudioElement | null {
    try {
      // 배경음악은 별도 Audio 객체 사용 (반복 재생용)
      const audio = new Audio(soundPath);
      audio.volume = volume;
      audio.loop = true; // 반복 재생
      audio.preload = 'auto'; // 크롬: 미리 로드
      
      // 크롬: 오디오 컨텍스트가 활성화되지 않았다면 활성화 후 재생
      const playAudio = () => {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn(`배경음악 재생 실패: ${soundPath}`, error);
            // 재시도
            setTimeout(() => {
              audio.play().catch(() => {
                console.warn(`배경음악 재시도 실패: ${soundPath}`);
              });
            }, 100);
          });
        }
      };

      if (!this.audioContextActivated) {
        this.activateAudioContext().then(() => {
          playAudio();
        });
      } else {
        playAudio();
      }
      
      return audio;
    } catch (error) {
      console.warn(`배경음악 로드 실패: ${soundPath}`, error);
      return null;
    }
  }
}

// 싱글톤 인스턴스 생성
export const soundManager = new SoundManager();

// 사운드 파일 경로 상수
export const SOUNDS = {
  CAMERA: '/sounds/camera.mp3',      // 촬영 찰칵 소리
  DIGITAL: '/sounds/digital.mp3',   // 분석 중 배경음악
  WELCOME: '/sounds/welcome.mp3',   // 웰컴 화면 배경음악
  COUNTDOWN: '/sounds/countdown.mp3', // 카운트다운 효과음
  FIREWORK: '/sounds/firework.mp3',   // 맞췄을 때 효과음
  FAIL: '/sounds/fail.mp3',           // 틀렸을 때 효과음
  MATRIX: '/sounds/matrix.mp3',       // 로그인 폼 배경음악
  GAME: '/sounds/game.mp3',           // 그림 그리는 동안 배경음악
} as const;

