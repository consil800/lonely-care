/**
 * Motion Detection System (Refactored)
 * 휴대폰의 움직임을 감지하고 하트비트를 전송하는 시스템
 * FCM 로직을 별도 모듈로 분리하고 순수한 움직임 감지 기능에 집중
 */

class MotionDetector {
    constructor() {
        // Enhanced Motion Detector가 이미 실행 중이면 비활성화
        if (window.enhancedMotionDetectorInstance) {
            console.warn('⚠️ Enhanced Motion Detector가 실행 중이므로 Basic Motion Detector 비활성화');
            this.isDisabled = true;
            return;
        }
        
        this.motionCount = 0;
        this.isActive = false;
        this.lastMotionTime = Date.now();
        this.statusInterval = null;
        this.motionThreshold = 2; // 움직임 감지 임계값
        this.storageKey = 'motionCount';
        this.lastStatusKey = 'lastStatusSent';
        this.isDisabled = false;
        
        // 배터리 효율성을 위한 속성
        this.isPaused = false;
        this.lastHourlyReset = new Date().getHours();
        this.maxMotionsPerHour = 10; // 시간당 최대 감지 횟수
        this.motionCooldown = 5000; // 5초 쿨다운
        
        // 센서 지원 여부
        this.supportedSensors = {
            deviceMotion: false,
            deviceOrientation: false,
            accelerometer: false
        };
        
        // 움직임 감지 리스너들
        this.motionListeners = [];
        
        this.init();
    }

    /**
     * 초기화
     */
    async init() {
        if (this.isDisabled) {
            console.log('🚫 Basic Motion Detector 비활성화됨 - 초기화 생략');
            return;
        }
        
        try {
            console.log('🔍 Basic 움직임 감지 시스템 초기화 시작');
            
            // 로컬 저장소에서 기존 카운트 로드
            this.loadMotionCount();
            
            // 센서 지원 여부 확인
            await this.checkSensorSupport();
            
            // 센서 초기화
            await this.initializeSensors();
            
            // 1시간마다 하트비트 전송 시작
            this.startHeartbeatReporting();
            
            console.log('✅ 움직임 감지 시스템 초기화 완료', { 
                motionCount: this.motionCount,
                supportedSensors: this.supportedSensors
            });
            
        } catch (error) {
            console.error('❌ 움직임 감지 시스템 초기화 실패:', error);
        }
    }

    /**
     * 센서 지원 여부 확인
     */
    async checkSensorSupport() {
        // DeviceMotionEvent 지원 확인
        if (typeof DeviceMotionEvent !== 'undefined') {
            this.supportedSensors.deviceMotion = true;
            console.log('✅ DeviceMotion 센서 지원');
        }

        // DeviceOrientationEvent 지원 확인
        if (typeof DeviceOrientationEvent !== 'undefined') {
            this.supportedSensors.deviceOrientation = true;
            console.log('✅ DeviceOrientation 센서 지원');
        }

        // 권한 요청 (iOS 13+)
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission === 'granted') {
                    console.log('✅ 모션 센서 권한 허용됨');
                } else {
                    console.warn('⚠️ 모션 센서 권한이 거부되었습니다:', permission);
                }
            } catch (error) {
                console.warn('⚠️ 모션 센서 권한 요청 실패:', error);
            }
        }

        console.log('🔍 센서 지원 현황:', this.supportedSensors);
    }

    /**
     * 센서 초기화
     */
    async initializeSensors() {
        try {
            // DeviceMotion 센서 리스너
            if (this.supportedSensors.deviceMotion) {
                window.addEventListener('devicemotion', (event) => {
                    this.handleDeviceMotion(event);
                }, { passive: true });
                
                console.log('✅ DeviceMotion 리스너 등록');
            }

            // DeviceOrientation 센서 리스너
            if (this.supportedSensors.deviceOrientation) {
                window.addEventListener('deviceorientation', (event) => {
                    this.handleDeviceOrientation(event);
                }, { passive: true });
                
                console.log('✅ DeviceOrientation 리스너 등록');
            }

            // 터치 이벤트 리스너 (fallback)
            this.initializeTouchSensor();
            
            console.log('✅ 센서 초기화 완료');
            
        } catch (error) {
            console.error('❌ 센서 초기화 실패:', error);
        }
    }

    /**
     * 터치 센서 초기화 (fallback)
     */
    initializeTouchSensor() {
        let touchStartTime = 0;
        
        const touchHandler = () => {
            if (this.isDisabled) return; // Enhanced Motion Detector 우선
            
            const now = Date.now();
            if (now - touchStartTime > this.motionCooldown) {
                this.detectMotion('touch');
                touchStartTime = now;
            }
        };
        
        document.addEventListener('touchstart', touchHandler, { passive: true });
        document.addEventListener('click', touchHandler, { passive: true });
        
        console.log('✅ 터치 센서 등록 (fallback)');
    }

    /**
     * DeviceMotion 이벤트 처리
     */
    handleDeviceMotion(event) {
        if (this.isPaused) return;
        
        const { accelerationIncludingGravity } = event;
        if (!accelerationIncludingGravity) return;

        const { x, y, z } = accelerationIncludingGravity;
        const acceleration = Math.sqrt(x*x + y*y + z*z);

        // 임계값을 넘는 움직임 감지
        if (acceleration > this.motionThreshold) {
            this.detectMotion('devicemotion', { acceleration });
        }
    }

    /**
     * DeviceOrientation 이벤트 처리
     */
    handleDeviceOrientation(event) {
        if (this.isPaused) return;
        
        const { alpha, beta, gamma } = event;
        
        // 이전 값과 비교하여 변화량 계산
        if (this.lastOrientation) {
            const deltaAlpha = Math.abs(alpha - this.lastOrientation.alpha);
            const deltaBeta = Math.abs(beta - this.lastOrientation.beta);
            const deltaGamma = Math.abs(gamma - this.lastOrientation.gamma);
            
            const totalDelta = deltaAlpha + deltaBeta + deltaGamma;
            
            if (totalDelta > 10) { // 임계값
                this.detectMotion('deviceorientation', { totalDelta });
            }
        }
        
        this.lastOrientation = { alpha, beta, gamma };
    }

    /**
     * 움직임 감지 메인 함수
     */
    detectMotion(sensorType, data = {}) {
        if (this.isDisabled) return; // Enhanced Motion Detector 우선
        
        const now = Date.now();
        
        // 쿨다운 체크
        if (now - this.lastMotionTime < this.motionCooldown) {
            return;
        }
        
        // 시간당 최대 감지 횟수 체크
        if (!this.checkHourlyLimit()) {
            return;
        }
        
        this.motionCount++;
        this.lastMotionTime = now;
        
        console.log(`🚶 움직임 감지 [${sensorType}]:`, { 
            count: this.motionCount,
            data 
        });
        
        // 로컬 저장소에 저장
        this.saveMotionCount();
        
        // 움직임 리스너들에게 알림
        this.notifyMotionListeners(sensorType, data);
        
        // 즉시 하트비트 전송 (중요한 생존 신호)
        this.sendHeartbeat(sensorType);
    }

    /**
     * 시간당 감지 제한 체크
     */
    checkHourlyLimit() {
        const currentHour = new Date().getHours();
        
        // 새로운 시간이 되면 카운터 리셋
        if (currentHour !== this.lastHourlyReset) {
            this.motionCount = 0;
            this.lastHourlyReset = currentHour;
            console.log(`⏰ 시간당 움직임 감지 카운터 리셋 (${currentHour}시)`);
        }
        
        return this.motionCount < this.maxMotionsPerHour;
    }

    /**
     * 하트비트 전송
     */
    async sendHeartbeat(sensorType = 'manual') {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            if (!currentUser.kakao_id) {
                console.warn('⚠️ 로그인된 사용자가 없어 하트비트 전송 건너뜀');
                return;
            }
            
            const heartbeatData = {
                user_id: currentUser.kakao_id,
                timestamp: new Date().toISOString(),
                motion_count: this.motionCount,
                sensor_type: sensorType,
                device_info: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language
                }
            };
            
            // Firebase에 하트비트 저장
            if (window.firebaseClient) {
                const heartbeatId = `${currentUser.kakao_id}_${Date.now()}`;
                await window.firebaseClient.setDocument('heartbeats', heartbeatId, heartbeatData);
                
                console.log('💓 하트비트 전송 완료:', sensorType);
            } else {
                console.warn('⚠️ Firebase 클라이언트가 없어 하트비트 저장 건너뜀');
            }
            
        } catch (error) {
            console.error('❌ 하트비트 전송 실패:', error);
        }
    }

    /**
     * 주기적 하트비트 전송 시작
     */
    startHeartbeatReporting() {
        // 기존 인터벌 정리
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        
        // 1시간마다 자동 하트비트 전송
        const intervalMs = 60 * 60 * 1000; // 1시간
        
        this.statusInterval = setInterval(() => {
            this.sendHeartbeat('auto');
        }, intervalMs);
        
        console.log('⏰ 주기적 하트비트 전송 시작 (1시간마다)');
        
        // 즉시 한 번 실행
        this.sendHeartbeat('init');
    }

    /**
     * 로컬 저장소에서 움직임 카운트 로드
     */
    loadMotionCount() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                this.motionCount = parseInt(saved, 10) || 0;
                console.log(`📋 저장된 움직임 카운트 로드: ${this.motionCount}`);
            }
        } catch (error) {
            console.error('❌ 움직임 카운트 로드 실패:', error);
        }
    }

    /**
     * 로컬 저장소에 움직임 카운트 저장
     */
    saveMotionCount() {
        try {
            localStorage.setItem(this.storageKey, this.motionCount.toString());
            localStorage.setItem(this.lastStatusKey, new Date().toISOString());
        } catch (error) {
            console.error('❌ 움직임 카운트 저장 실패:', error);
        }
    }

    /**
     * 움직임 감지 시작
     */
    start() {
        if (this.isActive) {
            console.log('⚠️ 움직임 감지가 이미 활성화되어 있습니다');
            return;
        }
        
        this.isActive = true;
        this.isPaused = false;
        
        console.log('▶️ 움직임 감지 시작');
    }

    /**
     * 움직임 감지 중지
     */
    stop() {
        this.isActive = false;
        this.isPaused = true;
        
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }
        
        console.log('⏹️ 움직임 감지 중지');
    }

    /**
     * 움직임 감지 일시정지
     */
    pause() {
        this.isPaused = true;
        console.log('⏸️ 움직임 감지 일시정지');
    }

    /**
     * 움직임 감지 재개
     */
    resume() {
        this.isPaused = false;
        console.log('▶️ 움직임 감지 재개');
    }

    /**
     * 움직임 리스너 추가
     */
    addMotionListener(callback) {
        if (typeof callback === 'function') {
            this.motionListeners.push(callback);
        }
    }

    /**
     * 움직임 리스너 제거
     */
    removeMotionListener(callback) {
        const index = this.motionListeners.indexOf(callback);
        if (index > -1) {
            this.motionListeners.splice(index, 1);
        }
    }

    /**
     * 움직임 리스너들에게 알림
     */
    notifyMotionListeners(sensorType, data) {
        this.motionListeners.forEach(callback => {
            try {
                callback({ sensorType, data, count: this.motionCount });
            } catch (error) {
                console.error('❌ 움직임 리스너 호출 실패:', error);
            }
        });
    }

    /**
     * 현재 상태 조회
     */
    getStatus() {
        return {
            isActive: this.isActive,
            isPaused: this.isPaused,
            motionCount: this.motionCount,
            lastMotionTime: this.lastMotionTime,
            supportedSensors: this.supportedSensors,
            maxMotionsPerHour: this.maxMotionsPerHour
        };
    }

    /**
     * 설정 업데이트
     */
    updateSettings(settings) {
        if (settings.motionThreshold !== undefined) {
            this.motionThreshold = settings.motionThreshold;
        }
        
        if (settings.maxMotionsPerHour !== undefined) {
            this.maxMotionsPerHour = settings.maxMotionsPerHour;
        }
        
        if (settings.motionCooldown !== undefined) {
            this.motionCooldown = settings.motionCooldown;
        }
        
        console.log('⚙️ 움직임 감지 설정 업데이트:', settings);
    }

    /**
     * 시스템 정리
     */
    cleanup() {
        this.stop();
        this.motionListeners = [];
        
        // 이벤트 리스너 정리는 브라우저에 맡김 (페이지 언로드시 자동)
        console.log('🧹 움직임 감지 시스템 정리 완료');
    }
}

// 전역 인스턴스 생성
window.motionDetector = new MotionDetector();

// 자동 시작
window.motionDetector.start();

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MotionDetector;
}

console.log('📦 Motion Detector (Refactored) 로딩 완료');