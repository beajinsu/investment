// js/theme-manager.js - 통합 테마 관리 모듈

class ThemeManager {
  constructor(options = {}) {
    this.isMainPage = options.isMainPage || false;
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.toggleButton = null;
    this.messageHandlers = new Set();
    
    this.init();
  }
  
  init() {
    // 저장된 테마 즉시 적용
    this.applyTheme(this.currentTheme);
    
    if (this.isMainPage) {
      this.initMainPageFeatures();
    } else {
      this.initSubPageFeatures();
    }
    
    this.setupMessageHandling();
  }
  
  // 메인 페이지 (index.html) 전용 기능
  initMainPageFeatures() {
    this.toggleButton = document.getElementById('theme-toggle');
    
    if (this.toggleButton) {
      // 토글 버튼 초기 상태 설정
      this.updateToggleButton();
      
      // 토글 버튼 이벤트 리스너
      this.toggleButton.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
    
    // iframe 로드 이벤트 처리
    this.setupIframeTheme();
  }
  
  // 서브 페이지 전용 기능
  initSubPageFeatures() {
    // 부모 창에 테마 요청
    this.requestThemeFromParent();
  }
  
  // 메시지 처리 설정
  setupMessageHandling() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'theme-change') {
        this.applyTheme(event.data.theme);
      } else if (event.data.type === 'request-theme' && this.isMainPage) {
        this.sendThemeToChild(event.source);
      }
    });
  }
  
  // 테마 적용
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    this.currentTheme = theme;
    
    // 메인 페이지에서만 localStorage 저장
    if (this.isMainPage) {
      localStorage.setItem('theme', theme);
      this.updateToggleButton();
      this.broadcastThemeToIframes();
    }
    
    // 커스텀 이벤트 발생 (다른 모듈에서 테마 변경 감지 가능)
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme } 
    }));
  }
  
  // 테마 토글
  toggleTheme() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }
  
  // 토글 버튼 상태 업데이트
  updateToggleButton() {
    if (this.toggleButton) {
      this.toggleButton.classList.toggle('active', this.currentTheme === 'dark');
    }
  }
  
  // iframe에 테마 전파
  broadcastThemeToIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      this.sendThemeToChild(iframe.contentWindow);
    });
  }
  
  // 특정 창에 테마 전송
  sendThemeToChild(targetWindow) {
    try {
      if (targetWindow && targetWindow.postMessage) {
        targetWindow.postMessage({
          type: 'theme-change',
          theme: this.currentTheme
        }, '*');
      }
    } catch (error) {
      // 접근 권한 문제 무시
      console.debug('테마 전송 실패:', error);
    }
  }
  
  // iframe 로드 시 테마 전송 설정
  setupIframeTheme() {
    const iframe = document.getElementById('content-frame');
    if (iframe) {
      iframe.addEventListener('load', () => {
        // 약간의 지연 후 테마 전송 (iframe 초기화 대기)
        setTimeout(() => {
          this.sendThemeToChild(iframe.contentWindow);
        }, 100);
      });
    }
  }
  
  // 부모 창에 테마 요청
  requestThemeFromParent() {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'request-theme' }, '*');
    }
  }
  
  // 현재 테마 반환
  getCurrentTheme() {
    return this.currentTheme;
  }
  
  // 테마 변경 리스너 등록
  onThemeChange(callback) {
    const handler = (event) => callback(event.detail.theme);
    window.addEventListener('themeChanged', handler);
    this.messageHandlers.add(handler);
    return handler;
  }
  
  // 테마 변경 리스너 제거
  offThemeChange(handler) {
    window.removeEventListener('themeChanged', handler);
    this.messageHandlers.delete(handler);
  }
  
  // 정리 (메모리 누수 방지)
  destroy() {
    this.messageHandlers.forEach(handler => {
      window.removeEventListener('themeChanged', handler);
    });
    this.messageHandlers.clear();
  }
}

// 전역 테마 매니저 인스턴스 생성 함수
function createThemeManager(options = {}) {
  return new ThemeManager(options);
}

// 유틸리티 함수들
const ThemeUtils = {
  // CSS 변수 가져오기
  getCSSVariable(name) {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(name).trim();
  },
  
  // 현재 테마가 다크모드인지 확인
  isDarkMode() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  },
  
  // 테마에 따른 조건부 값 반환
  getThemeValue(lightValue, darkValue) {
    return this.isDarkMode() ? darkValue : lightValue;
  }
};

// 모듈 익스포트 (Node.js 환경 대응)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, createThemeManager, ThemeUtils };
}