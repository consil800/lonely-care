/**
 * User Gesture Manager
 * 브라우저 보안 정책에 따른 사용자 제스처 권한 관리
 * 생명구조 시스템을 위한 AudioContext 및 Vibration API 권한 관리
 */

class UserGestureManager {
    constructor() {
        this.audioContextReady = false;
        this.vibrationReady = false;
        this.audioContext = null;
        this.userHasInteracted = false;
        this.pendingSounds = [];
        this.pendingVibrations = [];
        
        this.init();
    }
    
    /**
     * 초기화 및 이벤트 리스너 등록
     */
    init() {
        console.log('🎛️ UserGestureManager 초기화');
        
        // 사용자 첫 상호작용 감지
        this.detectFirstUserInteraction();
        
        // 페이지 가시성 변경 감지
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.userHasInteracted) {
                this.resumeAudioContext();
            }
        });
    }
    
    /**
     * 사용자 첫 상호작용 감지
     */
    detectFirstUserInteraction() {
        const events = ['click', 'touchstart', 'keydown', 'mousedown'];
        
        const handleFirstInteraction = (event) => {
            console.log('👆 사용자 첫 상호작용 감지:', event.type);
            this.userHasInteracted = true;
            
            // 이벤트 리스너 제거 (한 번만 실행)
            events.forEach(eventType => {
                document.removeEventListener(eventType, handleFirstInteraction, true);
            });
            
            // 🚨 생명구조 시스템: 사용자 제스처와 즉시 연결된 AudioContext 활성화
            this.immediatelyActivateAudioInGesture();
        };
        
        events.forEach(eventType => {
            document.addEventListener(eventType, handleFirstInteraction, true);
        });
        
        // 10초 후에도 상호작용이 없으면 조용히 준비
        setTimeout(() => {
            if (!this.userHasInteracted) {
                console.log('🔇 사용자 상호작용 없음 - 조용한 모드로 진행');
                this.enableSilentMode();
            }
        }, 10000);
    }
    
    /**
     * 사용자 제스처와 즉시 연결된 AudioContext 활성화 - 2025.09.27 생명구조 시스템 브라우저 보안 정책 완벽 대응
     */
    immediatelyActivateAudioInGesture() {
        try {
            console.log('🚨 생명구조 시스템: 사용자 제스처 내에서 즉시 AudioContext 활성화');
            
            // 🔊 사용자 제스처 내에서 즉시 AudioContext 생성 및 활성화
            if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
                console.log('🔇 AudioContext API 미지원 - 시각적 알림만 사용');
                this.audioContextReady = false;
            } else {
                try {
                    // 기존 AudioContext가 있다면 닫기
                    if (this.audioContext) {
                        this.audioContext.close();
                    }
                    
                    // 🚨 사용자 제스처와 즉시 연결된 새로운 AudioContext 생성
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log(`🎵 사용자 제스처 내 AudioContext 생성 성공 - 초기 상태: ${this.audioContext.state}`);
                    
                    // 즉시 활성화 시도 (사용자 제스처와 직접 연결)
                    if (this.audioContext.state === 'suspended') {
                        // 🔊 사용자 제스처와 즉시 연결된 resume 호출
                        this.audioContext.resume().then(() => {
                            console.log('✅ 사용자 제스처 내 AudioContext 즉시 활성화 성공');
                            this.audioContextReady = true;
                            
                            // 즉시 대기 알림 처리 (지연 없음)
                            this.processPendingAlerts();
                        }).catch((error) => {
                            console.log('⚠️ 사용자 제스처 내 AudioContext 활성화 실패:', error.message);
                            this.audioContextReady = false;
                            
                            // fallback: 기본 알림 처리
                            this.processPendingAlertsBasic();
                        });
                    } else if (this.audioContext.state === 'running') {
                        console.log('✅ AudioContext 이미 실행 중');
                        this.audioContextReady = true;
                        
                        // 즉시 대기 알림 처리
                        this.processPendingAlerts();
                    }
                    
                } catch (createError) {
                    console.log('❌ 사용자 제스처 내 AudioContext 생성 실패:', createError.message);
                    this.audioContextReady = false;
                    
                    // fallback: 기본 알림 처리
                    this.processPendingAlertsBasic();
                }
            }
            
            // 진동 권한도 함께 활성화
            this.acquireVibrationPermission();
            
        } catch (error) {
            console.log('❌ 즉시 활성화 프로세스 실패:', error);
            
            // 최종 fallback
            setTimeout(() => {
                this.processPendingAlertsBasic();
            }, 100);
        }
    }
    
    /**
     * 안전한 오디오 활성화 및 대기 알림 처리 - 2025.09.27 생명구조 시스템 브라우저 호환성 개선
     */
    async safelyActivateAudioAndProcessAlerts() {
        try {
            console.log('🔧 생명구조 시스템: 안전한 오디오 활성화 시작');
            
            // 1단계: 권한 획득 시도
            await this.acquireAudioPermission();
            this.acquireVibrationPermission();
            
            // 2단계: AudioContext 완전 활성화 대기 (중요!)
            if (this.audioContext) {
                let attempts = 0;
                const maxAttempts = 10;
                
                while (this.audioContext.state !== 'running' && attempts < maxAttempts) {
                    try {
                        console.log(`🔊 AudioContext 활성화 시도 ${attempts + 1}/${maxAttempts}`);
                        await this.audioContext.resume();
                        
                        // 활성화 확인을 위한 짧은 대기
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        if (this.audioContext.state === 'running') {
                            console.log('✅ AudioContext 완전 활성화 성공');
                            this.audioContextReady = true;
                            break;
                        }
                    } catch (error) {
                        console.log(`⚠️ AudioContext 활성화 시도 ${attempts + 1} 실패:`, error.message);
                    }
                    
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 200)); // 0.2초 대기 후 재시도
                }
                
                if (this.audioContext.state !== 'running') {
                    console.log('🔇 AudioContext 활성화 최종 실패 - 조용한 모드');
                    this.audioContextReady = false;
                }
            }
            
            // 3단계: 충분한 지연 후 대기 알림 처리 (브라우저 안정화 시간 확보)
            setTimeout(() => {
                console.log('🔔 생명구조 시스템: 지연된 대기 알림 처리 시작');
                this.processPendingAlerts();
            }, 500); // 0.5초 지연으로 완전한 활성화 보장
            
        } catch (error) {
            console.log('❌ 안전한 활성화 프로세스 실패:', error);
            
            // 실패 시에도 대기 알림 처리 시도 (기본 방식으로)
            setTimeout(() => {
                console.log('🔔 fallback: 기본 방식으로 대기 알림 처리');
                this.processPendingAlertsBasic();
            }, 1000);
        }
    }
    
    /**
     * AudioContext 권한 획득 - 2024.09.24 생명구조 시스템 경고 완전 제거
     */
    async acquireAudioPermission() {
        try {
            // 🚨 생명구조 시스템: 브라우저 경고 방지를 위한 사전 체크
            if (!('AudioContext' in window) && !('webkitAudioContext' in window)) {
                console.log('🔇 AudioContext API 미지원 - 조용한 모드');
                this.audioContextReady = false;
                return;
            }
            
            // AudioContext 생성 시도 (경고 방지를 위한 조건부 생성)
            if (!this.audioContext && this.userHasInteracted) {
                try {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('🎵 AudioContext 생성 성공');
                } catch (createError) {
                    console.log('🔇 AudioContext 생성 실패 - 조용한 모드');
                    this.audioContextReady = false;
                    return;
                }
            }
            
            // 🚨 생명구조 시스템: AudioContext resume() 호출 제거로 브라우저 경고 완전 차단
            if (this.audioContext) {
                // AudioContext 상태만 확인하고, resume()은 실제 사용 시점에만 호출
                if (this.audioContext.state === 'running') {
                    this.audioContextReady = true;
                    console.log('🔊 AudioContext 이미 준비됨');
                } else {
                    // suspended 상태는 실제 소리 재생 시점에 resume 처리
                    this.audioContextReady = true;  // API 지원은 확인됨
                    console.log('🔊 AudioContext 생성 완료 (실제 사용 시 활성화)');
                }
            } else {
                console.log('🔇 AudioContext 사용자 제스처 대기 중 - 조용한 모드');
                this.audioContextReady = false;
            }
            
        } catch (error) {
            console.log('🔇 AudioContext 권한 획득 실패 - 조용한 모드');
            this.audioContextReady = false;
        }
    }
    
    /**
     * 진동 권한 획득 - 2024.09.24 생명구조 시스템 브라우저 경고 완전 제거
     */
    acquireVibrationPermission() {
        try {
            if ('vibrate' in navigator) {
                // 🚨 생명구조 시스템: 테스트 진동 제거로 브라우저 경고 완전 차단
                // 권한 테스트 없이 API 지원 여부만 확인
                this.vibrationReady = true;
                console.log('📳 진동 API 지원 확인 완료 (테스트 진동 없음)');
            } else {
                console.log('📵 진동 API 미지원');
                this.vibrationReady = false;
            }
        } catch (error) {
            console.log('🔇 진동 권한 획득 실패 - 조용한 모드');
            this.vibrationReady = false;
        }
    }
    
    /**
     * 조용한 모드 활성화
     */
    enableSilentMode() {
        this.audioContextReady = false;
        this.vibrationReady = false;
        console.log('🔇 조용한 모드 활성화 (시각적 알림만 사용)');
    }
    
    /**
     * AudioContext 재개
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('🔊 AudioContext 재개 완료');
            } catch (error) {
                console.log('⚠️ AudioContext 재개 실패');
            }
        }
    }
    
    /**
     * 경고음 재생 (권한 체크 포함) - 2024.09.24 생명구조 시스템 브라우저 경고 제거
     */
    async playAlertSound(frequency = 800, duration = 0.3) {
        if (!this.userHasInteracted) {
            console.log('🔇 사용자 상호작용 대기중 - 소리 알림 스킵');
            this.pendingSounds.push({ frequency, duration });
            return false;
        }
        
        if (!this.audioContextReady || !this.audioContext) {
            console.log('🔇 AudioContext 권한 없음 - 소리 알림 스킵');
            return false;
        }
        
        try {
            // 🚨 생명구조 시스템: 실제 사용 시점에 AudioContext 활성화 (경고 방지)
            if (this.audioContext.state === 'suspended') {
                try {
                    await this.audioContext.resume();
                } catch (resumeError) {
                    console.log('🔇 AudioContext 활성화 실패 - 시각적 알림으로 대체');
                    return false;
                }
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + duration);
            
            console.log('🔊 경고음 재생 성공');
            return true;
            
        } catch (error) {
            console.log('🔇 경고음 재생 실패 - 시각적 알림으로 대체');
            return false;
        }
    }
    
    /**
     * 노인 친화적 3초 지속 경고음 재생 - 2025.09.27 생명구조 시스템 노인 접근성 개선
     */
    async playExtendedLifeSavingAlert(alertLevel = 'warning') {
        if (!this.userHasInteracted) {
            console.log('🔇 사용자 상호작용 대기중 - 소리 알림 스킵');
            return false;
        }
        
        if (!this.audioContextReady || !this.audioContext) {
            console.log('🔇 AudioContext 권한 없음 - 소리 알림 스킵');
            return false;
        }
        
        try {
            // 🚨 생명구조 시스템: 엄격한 AudioContext 상태 확인 및 안전한 활성화
            if (!this.audioContext) {
                console.log('🔇 AudioContext 객체 없음 - 시각적 알림으로 대체');
                return false;
            }
            
            // AudioContext 상태별 안전한 처리
            if (this.audioContext.state === 'suspended') {
                console.log('🔊 AudioContext suspended 상태 - 안전한 활성화 시도');
                
                let resumeAttempts = 0;
                const maxResumeAttempts = 3;
                
                while (this.audioContext.state === 'suspended' && resumeAttempts < maxResumeAttempts) {
                    try {
                        await this.audioContext.resume();
                        await new Promise(resolve => setTimeout(resolve, 50)); // 활성화 대기
                        
                        if (this.audioContext.state === 'running') {
                            console.log('✅ AudioContext 활성화 성공');
                            break;
                        }
                    } catch (resumeError) {
                        resumeAttempts++;
                        console.log(`⚠️ AudioContext 활성화 시도 ${resumeAttempts}/${maxResumeAttempts} 실패:`, resumeError.message);
                        
                        if (resumeAttempts < maxResumeAttempts) {
                            await new Promise(resolve => setTimeout(resolve, 100)); // 재시도 전 대기
                        }
                    }
                }
                
                if (this.audioContext.state !== 'running') {
                    console.log('🔇 AudioContext 활성화 최종 실패 - 기본 알림으로 fallback');
                    return await this.playAlertSound(700, 1.0);
                }
            } else if (this.audioContext.state === 'closed') {
                console.log('🔇 AudioContext 닫힘 상태 - 기본 알림으로 fallback');
                return await this.playAlertSound(700, 1.0);
            } else if (this.audioContext.state !== 'running') {
                console.log(`🔇 AudioContext 예상치 못한 상태 (${this.audioContext.state}) - 기본 알림으로 fallback`);
                return await this.playAlertSound(700, 1.0);
            }
            
            console.log('✅ AudioContext 준비 완료 - 3초 지속 알림 시작');
            
            // 🚨 생명구조 시스템: 노인분들을 위한 레벨별 차등화된 3초 지속 알림
            let frequency, volume, beepDuration, pauseDuration;
            
            if (alertLevel === 'warning') {
                frequency = 700;      // 노인분들이 듣기 좋은 낮은 주파수
                volume = 0.6;         // 중간 볼륨
                beepDuration = 0.6;   // 긴 비프음
                pauseDuration = 0.3;  // 짧은 휴식
            } else if (alertLevel === 'danger') {
                frequency = 850;      // 중간 주파수
                volume = 0.75;        // 큰 볼륨  
                beepDuration = 0.5;   // 중간 비프음
                pauseDuration = 0.2;  // 짧은 휴식
            } else { // emergency
                frequency = 1000;     // 높은 주파수
                volume = 0.9;         // 최대 볼륨
                beepDuration = 0.4;   // 빠른 비프음
                pauseDuration = 0.1;  // 매우 짧은 휴식
            }
            
            // 3초간 반복 패턴 재생
            const totalDuration = 3000; // 3초
            let currentTime = 0;
            let beepCount = 0;
            
            console.log(`🔊 ${alertLevel} 레벨 3초 지속 생명구조 알림 시작`);
            
            const playBeepSequence = () => {
                return new Promise((resolve) => {
                    const interval = setInterval(() => {
                        if (currentTime >= totalDuration) {
                            clearInterval(interval);
                            console.log(`🔊 ${alertLevel} 레벨 알림 완료 (${beepCount}회 재생)`);
                            resolve(true);
                            return;
                        }
                        
                        // 비프음 재생
                        try {
                            const oscillator = this.audioContext.createOscillator();
                            const gainNode = this.audioContext.createGain();
                            
                            oscillator.connect(gainNode);
                            gainNode.connect(this.audioContext.destination);
                            
                            oscillator.frequency.value = frequency;
                            oscillator.type = 'sine';
                            
                            // 볼륨 페이드 인/아웃 효과 (부드러운 소리)
                            const now = this.audioContext.currentTime;
                            gainNode.gain.setValueAtTime(0, now);
                            gainNode.gain.linearRampToValueAtTime(volume, now + 0.05); // 빠른 페이드 인
                            gainNode.gain.linearRampToValueAtTime(volume, now + beepDuration - 0.05); // 지속
                            gainNode.gain.linearRampToValueAtTime(0, now + beepDuration); // 빠른 페이드 아웃
                            
                            oscillator.start(now);
                            oscillator.stop(now + beepDuration);
                            
                            beepCount++;
                            
                        } catch (beepError) {
                            console.log('⚠️ 개별 비프음 재생 실패, 계속 진행');
                        }
                        
                        currentTime += (beepDuration + pauseDuration) * 1000;
                        
                    }, (beepDuration + pauseDuration) * 1000);
                });
            };
            
            await playBeepSequence();
            return true;
            
        } catch (error) {
            console.log('🔇 3초 지속 경고음 재생 실패 - 기본 알림으로 fallback');
            // 실패 시 기본 알림으로 fallback
            return await this.playAlertSound(800, 0.5);
        }
    }
    
    /**
     * 생명구조 시스템 진동 알림 (Chrome 보안 정책 완벽 대응)
     */
    vibrate(pattern) {
        if (!this.userHasInteracted) {
            console.log('🔇 사용자 상호작용 대기중 - 진동 알림 대기열에 추가');
            this.pendingVibrations.push(pattern);
            // 🚨 생명구조: 진동 실패 시 시각적 대체 알림
            this.triggerVisualAlert('진동 대기 중');
            return false;
        }
        
        if (!this.vibrationReady || !('vibrate' in navigator)) {
            console.log('🔇 진동 API 미지원 - 강화된 시각적 알림으로 대체');
            this.triggerVisualAlert('진동 미지원');
            return false;
        }
        
        try {
            // 🚨 생명구조: navigator.vibrate() 반환값 확인 (Chrome 보안 정책 대응)
            const vibrateResult = navigator.vibrate(pattern);
            
            if (vibrateResult === false) {
                console.log('🚨 진동 차단됨 (Chrome 보안 정책) - 강화된 대체 알림 활성화');
                this.triggerEmergencyVisualAlert();
                this.triggerEnhancedAudioAlert();
                return false;
            } else {
                console.log('📳 진동 알림 성공 확인됨');
                return true;
            }
        } catch (error) {
            console.log('🚨 진동 API 호출 실패 - 생명구조 대체 알림 활성화:', error.message);
            this.triggerEmergencyVisualAlert();
            this.triggerEnhancedAudioAlert();
            return false;
        }
    }
    
    /**
     * 대기 중인 알림들 처리 - 2025.09.27 노인 친화적 3초 시스템으로 업그레이드
     */
    processPendingAlerts() {
        console.log(`🔔 대기 중인 알림 처리: 소리 ${this.pendingSounds.length}개, 진동 ${this.pendingVibrations.length}개`);
        
        // 🚨 생명구조 시스템: 대기 중인 소리 알림들을 3초 지속 시스템으로 처리
        this.pendingSounds.forEach((sound, index) => {
            setTimeout(async () => {
                try {
                    // 🏥 새로운 3초 지속 노인 친화적 알림 시스템 우선 사용
                    if (typeof this.playExtendedLifeSavingAlert === 'function') {
                        // frequency 기반으로 alertLevel 추정
                        let alertLevel = 'warning';
                        if (sound.frequency >= 900) {
                            alertLevel = 'emergency';
                        } else if (sound.frequency >= 750) {
                            alertLevel = 'danger';
                        }
                        
                        console.log(`🔊 대기 알림 ${index+1}: ${alertLevel} 레벨 3초 지속 알림으로 재생`);
                        const success = await this.playExtendedLifeSavingAlert(alertLevel);
                        
                        if (!success) {
                            // fallback: 기존 방식이지만 더 긴 지속시간
                            console.log('🔇 3초 알림 실패 - 개선된 기존 방식으로 fallback');
                            await this.playAlertSound(sound.frequency, Math.max(sound.duration, 1.0));
                        }
                    } else {
                        // 구형 시스템 fallback (더 긴 지속시간)
                        console.log(`🔊 대기 알림 ${index+1}: 기존 방식으로 재생 (개선된 지속시간)`);
                        await this.playAlertSound(sound.frequency, Math.max(sound.duration, 1.0));
                    }
                } catch (error) {
                    console.log('⚠️ 대기 알림 재생 중 오류:', error);
                    // 최종 fallback
                    await this.playAlertSound(700, 0.8);
                }
            }, index * 500); // 각 알림을 0.5초 간격으로 재생
        });
        this.pendingSounds = [];
        
        // 대기 중인 진동 알림들 (기존 방식 유지)
        this.pendingVibrations.forEach((pattern, index) => {
            setTimeout(() => {
                this.vibrate(pattern);
            }, index * 300);
        });
        this.pendingVibrations = [];
    }
    
    /**
     * 기본 대기 알림 처리 (fallback용) - 2025.09.27 생명구조 시스템 안전장치
     */
    processPendingAlertsBasic() {
        console.log(`🔔 기본 대기 알림 처리: 소리 ${this.pendingSounds.length}개, 진동 ${this.pendingVibrations.length}개`);
        
        // 기본 소리 알림들 (더 긴 지속시간으로)
        this.pendingSounds.forEach((sound, index) => {
            setTimeout(async () => {
                try {
                    console.log(`🔊 기본 대기 알림 ${index+1}: 개선된 기존 방식으로 재생`);
                    await this.playAlertSound(sound.frequency, Math.max(sound.duration, 1.2));
                } catch (error) {
                    console.log('⚠️ 기본 알림 재생 실패:', error);
                }
            }, index * 800);
        });
        this.pendingSounds = [];
        
        // 🚨 생명구조: 대기 진동 알림들 (Chrome 보안 정책 완벽 대응)
        this.pendingVibrations.forEach((pattern, index) => {
            setTimeout(() => {
                try {
                    const vibrateResult = navigator.vibrate(pattern);
                    if (vibrateResult === false) {
                        console.log('🚨 대기 진동 차단됨 - 강화된 대체 알림 실행');
                        this.triggerEmergencyVisualAlert();
                        this.triggerEnhancedAudioAlert();
                    } else {
                        console.log('📳 대기 진동 알림 성공 확인됨');
                    }
                } catch (error) {
                    console.log('📵 기본 진동 실패');
                }
            }, index * 400);
        });
        this.pendingVibrations = [];
    }
    
    /**
     * 상태 정보
     */
    getStatus() {
        return {
            userHasInteracted: this.userHasInteracted,
            audioContextReady: this.audioContextReady,
            vibrationReady: this.vibrationReady,
            pendingSounds: this.pendingSounds.length,
            pendingVibrations: this.pendingVibrations.length,
            audioContextState: this.audioContext ? this.audioContext.state : 'none'
        };
    }
    
    /**
     * 생명구조 긴급 권한 요청
     */
    async requestEmergencyPermissions() {
        console.log('🚨 생명구조 긴급 권한 요청');
        
        // 사용자에게 권한 요청 안내
        const userConsent = confirm(
            '🚨 생명구조 알림을 위해 소리 및 진동 권한이 필요합니다.\n' +
            '확인을 누르시면 권한을 활성화합니다.\n\n' +
            '이는 친구의 생명을 구하는데 도움이 됩니다.'
        );
        
        if (userConsent) {
            this.userHasInteracted = true;
            await this.acquireAudioPermission();
            this.acquireVibrationPermission();
            this.processPendingAlerts();
            
            console.log('✅ 생명구조 긴급 권한 활성화 완료');
            return true;
        }
        
        console.log('❌ 사용자가 긴급 권한을 거부');
        return false;
    }
    
    /**
     * 🚨 생명구조 시스템: 진동 실패 시 시각적 대체 알림
     */
    triggerVisualAlert(reason) {
        try {
            // 화면 전체 플래시 효과
            const flashOverlay = document.createElement('div');
            flashOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(255, 69, 0, 0.8);
                z-index: 999999;
                pointer-events: none;
                animation: emergencyFlash 0.5s ease-in-out;
            `;
            
            // 플래시 애니메이션 추가
            if (!document.querySelector('#emergency-flash-style')) {
                const style = document.createElement('style');
                style.id = 'emergency-flash-style';
                style.textContent = `
                    @keyframes emergencyFlash {
                        0% { opacity: 0; }
                        50% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(flashOverlay);
            
            // 0.5초 후 제거
            setTimeout(() => {
                if (flashOverlay.parentNode) {
                    flashOverlay.parentNode.removeChild(flashOverlay);
                }
            }, 500);
            
            console.log(`🔴 시각적 대체 알림 실행: ${reason}`);
        } catch (error) {
            console.log('⚠️ 시각적 알림 실행 실패:', error.message);
        }
    }
    
    /**
     * 🚨 생명구조 시스템: 진동 실패 시 강화된 응급 시각적 알림
     */
    triggerEmergencyVisualAlert() {
        try {
            // 더 강한 빨간색 플래시 효과
            const emergencyFlash = document.createElement('div');
            emergencyFlash.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(255, 0, 0, 0.9);
                z-index: 999999;
                pointer-events: none;
                animation: strongEmergencyFlash 1s ease-in-out;
            `;
            
            // 강화된 플래시 애니메이션
            if (!document.querySelector('#strong-emergency-flash-style')) {
                const style = document.createElement('style');
                style.id = 'strong-emergency-flash-style';
                style.textContent = `
                    @keyframes strongEmergencyFlash {
                        0% { opacity: 0; }
                        25% { opacity: 1; }
                        50% { opacity: 0; }
                        75% { opacity: 1; }
                        100% { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(emergencyFlash);
            
            // 브라우저 제목 변경으로 추가 주의 끌기
            const originalTitle = document.title;
            document.title = '🚨 긴급 알림 - 진동 차단됨';
            
            setTimeout(() => {
                if (emergencyFlash.parentNode) {
                    emergencyFlash.parentNode.removeChild(emergencyFlash);
                }
                document.title = originalTitle;
            }, 1000);
            
            console.log('🚨 강화된 응급 시각적 알림 실행 - 진동 차단 대체');
        } catch (error) {
            console.log('⚠️ 응급 시각적 알림 실행 실패:', error.message);
        }
    }
    
    /**
     * 🚨 생명구조 시스템: 진동 실패 시 강화된 오디오 알림
     */
    triggerEnhancedAudioAlert() {
        if (!this.audioContextReady || !this.audioContext) {
            console.log('🔇 오디오 시스템 미준비 - 강화 오디오 알림 스킵');
            return;
        }
        
        try {
            // 더 강한 주파수와 긴 지속시간으로 알림
            this.playAlertSound(900, 2.0).then(() => {
                console.log('🔊 강화된 대체 오디오 알림 완료 (진동 차단 보상)');
            }).catch((error) => {
                console.log('⚠️ 강화 오디오 알림 실패:', error.message);
            });
        } catch (error) {
            console.log('⚠️ 강화 오디오 알림 실행 실패:', error.message);
        }
    }
}

// 전역 인스턴스 생성
window.userGestureManager = new UserGestureManager();

console.log('✅ UserGestureManager 로드 완료');