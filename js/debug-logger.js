/**
 * 디버깅 로그 관리 시스템
 * 개발/프로덕션 환경별로 로그 레벨을 제어
 */

class DebugLogger {
    constructor() {
        // 디버깅 모드 설정 (localStorage에서 확인)
        this.isDebugMode = localStorage.getItem('lonely-care-debug') === 'true' || 
                          window.location.hostname === 'localhost' ||
                          window.location.protocol === 'file:';
                          
        this.logLevels = {
            ERROR: 0,    // 항상 표시
            WARN: 1,     // 경고
            INFO: 2,     // 정보
            DEBUG: 3,    // 디버그 (개발용)
            VERBOSE: 4   // 상세 (매우 상세한 로그)
        };
        
        // 현재 로그 레벨 설정
        this.currentLevel = this.isDebugMode ? this.logLevels.VERBOSE : this.logLevels.WARN;
        
        // 로그 기록 저장 (최대 1000개)
        this.logHistory = [];
        this.maxLogHistory = 1000;
        
        this.init();
    }
    
    init() {
        if (this.isDebugMode) {
            console.log('🔧 lonely-care 디버그 모드 활성화');
            console.log('- 로그 레벨:', this.currentLevel);
            console.log('- 디버깅 명령어: debugLogger.help()');
        }
    }
    
    // 로그 기록 저장
    addToHistory(level, category, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: level,
            category: category,
            message: message,
            data: data
        };
        
        this.logHistory.push(logEntry);
        
        // 최대 개수 초과시 오래된 로그 제거
        if (this.logHistory.length > this.maxLogHistory) {
            this.logHistory.shift();
        }
    }
    
    // 기본 로그 함수
    log(level, category, message, data = null) {
        if (level > this.currentLevel) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
        const levelName = levelNames[level] || 'UNKNOWN';
        
        const logMessage = `[${timestamp}] [${levelName}] [${category}] ${message}`;
        
        // 로그 히스토리에 추가
        this.addToHistory(level, category, message, data);
        
        // 레벨별 콘솔 출력
        switch (level) {
            case this.logLevels.ERROR:
                console.error('❌', logMessage, data || '');
                break;
            case this.logLevels.WARN:
                console.warn('⚠️', logMessage, data || '');
                break;
            case this.logLevels.INFO:
                console.info('ℹ️', logMessage, data || '');
                break;
            case this.logLevels.DEBUG:
                console.log('🔍', logMessage, data || '');
                break;
            case this.logLevels.VERBOSE:
                console.log('📝', logMessage, data || '');
                break;
        }
    }
    
    // 편의 메서드들
    error(category, message, data) {
        this.log(this.logLevels.ERROR, category, message, data);
    }
    
    warn(category, message, data) {
        this.log(this.logLevels.WARN, category, message, data);
    }
    
    info(category, message, data) {
        this.log(this.logLevels.INFO, category, message, data);
    }
    
    debug(category, message, data) {
        this.log(this.logLevels.DEBUG, category, message, data);
    }
    
    verbose(category, message, data) {
        this.log(this.logLevels.VERBOSE, category, message, data);
    }
    
    // 시스템별 로거들
    heartbeat(message, data) {
        this.debug('HEARTBEAT', message, data);
    }
    
    notification(message, data) {
        this.debug('NOTIFICATION', message, data);
    }
    
    motion(message, data) {
        this.verbose('MOTION', message, data);
    }
    
    friend(message, data) {
        this.debug('FRIEND', message, data);
    }
    
    auth(message, data) {
        this.info('AUTH', message, data);
    }
    
    database(message, data) {
        this.debug('DATABASE', message, data);
    }
    
    // 디버깅 모드 토글
    toggleDebugMode() {
        this.isDebugMode = !this.isDebugMode;
        this.currentLevel = this.isDebugMode ? this.logLevels.VERBOSE : this.logLevels.WARN;
        localStorage.setItem('lonely-care-debug', this.isDebugMode.toString());
        
        console.log(`🔧 디버그 모드 ${this.isDebugMode ? '활성화' : '비활성화'}됨`);
        return this.isDebugMode;
    }
    
    // 로그 레벨 설정
    setLogLevel(level) {
        if (typeof level === 'string') {
            level = this.logLevels[level.toUpperCase()];
        }
        if (level >= 0 && level <= 4) {
            this.currentLevel = level;
            this.info('LOGGER', `로그 레벨이 ${level}로 변경됨`);
        } else {
            this.warn('LOGGER', '잘못된 로그 레벨:', level);
        }
    }
    
    // 로그 히스토리 조회
    getHistory(category = null, level = null) {
        let filtered = this.logHistory;
        
        if (category) {
            filtered = filtered.filter(log => log.category === category.toUpperCase());
        }
        
        if (level !== null) {
            filtered = filtered.filter(log => log.level === level);
        }
        
        return filtered;
    }
    
    // 로그 히스토리 출력
    printHistory(category = null, level = null, limit = 50) {
        const history = this.getHistory(category, level);
        const recent = history.slice(-limit);
        
        console.log(`📋 최근 로그 ${recent.length}개:`);
        console.log('=====================================');
        
        recent.forEach(log => {
            const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG', 'VERBOSE'];
            const levelName = levelNames[log.level];
            console.log(`[${log.timestamp}] [${levelName}] [${log.category}] ${log.message}`);
            if (log.data) console.log('   데이터:', log.data);
        });
    }
    
    // 로그 히스토리 다운로드
    downloadHistory() {
        const data = JSON.stringify(this.logHistory, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `lonely-care-logs-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.info('LOGGER', '로그 히스토리 다운로드 완료');
    }
    
    // 로그 히스토리 초기화
    clearHistory() {
        this.logHistory = [];
        this.info('LOGGER', '로그 히스토리 초기화됨');
    }
    
    // 도움말
    help() {
        console.log('🔧 lonely-care 디버깅 로거 사용법');
        console.log('=====================================');
        console.log('');
        console.log('🎛️ 기본 사용법:');
        console.log('- debugLogger.error("CATEGORY", "메시지", 데이터)');
        console.log('- debugLogger.warn("CATEGORY", "메시지", 데이터)');
        console.log('- debugLogger.info("CATEGORY", "메시지", 데이터)');
        console.log('- debugLogger.debug("CATEGORY", "메시지", 데이터)');
        console.log('- debugLogger.verbose("CATEGORY", "메시지", 데이터)');
        console.log('');
        console.log('🎯 시스템별 로거:');
        console.log('- debugLogger.heartbeat("메시지", 데이터)');
        console.log('- debugLogger.notification("메시지", 데이터)');
        console.log('- debugLogger.motion("메시지", 데이터)');
        console.log('- debugLogger.friend("메시지", 데이터)');
        console.log('- debugLogger.auth("메시지", 데이터)');
        console.log('- debugLogger.database("메시지", 데이터)');
        console.log('');
        console.log('⚙️ 설정:');
        console.log('- debugLogger.toggleDebugMode() : 디버그 모드 토글');
        console.log('- debugLogger.setLogLevel("INFO") : 로그 레벨 설정');
        console.log('');
        console.log('📋 히스토리:');
        console.log('- debugLogger.printHistory() : 최근 로그 50개 출력');
        console.log('- debugLogger.printHistory("HEARTBEAT") : 특정 카테고리 로그 출력');
        console.log('- debugLogger.downloadHistory() : 로그 파일 다운로드');
        console.log('- debugLogger.clearHistory() : 로그 히스토리 초기화');
        console.log('');
        console.log('현재 설정:');
        console.log(`- 디버그 모드: ${this.isDebugMode ? '활성화' : '비활성화'}`);
        console.log(`- 로그 레벨: ${this.currentLevel}`);
        console.log(`- 저장된 로그: ${this.logHistory.length}개`);
    }
    
    // 성능 측정 시작
    startTimer(name) {
        this.timers = this.timers || {};
        this.timers[name] = performance.now();
        this.verbose('TIMER', `타이머 시작: ${name}`);
    }
    
    // 성능 측정 종료
    endTimer(name) {
        if (!this.timers || !this.timers[name]) {
            this.warn('TIMER', `타이머를 찾을 수 없음: ${name}`);
            return;
        }
        
        const elapsed = performance.now() - this.timers[name];
        this.debug('TIMER', `${name}: ${elapsed.toFixed(2)}ms`);
        delete this.timers[name];
        return elapsed;
    }
}

// 전역 디버그 로거 인스턴스
window.debugLogger = new DebugLogger();

console.log('🔧 DebugLogger 초기화 완료!');
console.log('📖 debugLogger.help() 명령으로 사용법 확인');