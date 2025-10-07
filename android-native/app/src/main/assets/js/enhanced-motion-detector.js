/**
 * Enhanced Motion Detection System
 * 향상된 움직임 감지 시스템 - 앱의 핵심 기능
 * 
 * 기능:
 * 1. 다양한 센서로 움직임 감지 (가속도계, 자이로스코프, 터치, 스크롤)
 * 2. 1시간 단위로 움직임 카운터 관리
 * 3. 매시간 정해진 시간에 친구들에게 상태 전송
 * 4. 로컬스토리지 기반 안정적인 데이터 관리
 */

class EnhancedMotionDetector {
    constructor() {
        // 중복 초기화 방지 가드
        if (window.enhancedMotionDetectorInstance) {
            console.warn('⚠️ EnhancedMotionDetector 이미 초기화됨 - 기존 인스턴스 반환');
            return window.enhancedMotionDetectorInstance;
        }
        
        this.motionCount = 0;
        this.currentHourKey = '';
        this.lastSensorUpdate = Date.now();
        this.communicationOffsets = new Map(); // 친구별 통신 시간 오프셋
        this.friends = [];
        this.isInitialized = false; // 초기화 상태 추적
        
        // 센서 지원 여부
        this.sensors = {
            accelerometer: false,
            gyroscope: false,
            deviceMotion: false,
            touch: true,
            scroll: true
        };
        
        // 통신 타이머
        this.communicationTimer = null;
        this.hourlyResetTimer = null;
        
        // 디바운싱을 위한 타이머
        this.motionDebounceTimer = null;
        
        // 배터리 효율성 속성
        this.isPaused = false;
        this.lastHourlyReset = new Date().getHours();
        this.maxMotionsPerHour = 10;
        
        // 전역 인스턴스로 등록 (중복 방지)
        window.enhancedMotionDetectorInstance = this;
        
        console.log('🎯 Enhanced Motion Detector 초기화');
    }

    // 시스템 초기화
    async init() {
        try {
            console.log('🚀 Enhanced Motion Detection 시스템 시작');
            
            // 센서 지원 여부 확인
            await this.checkSensorSupport();
            
            // 로컬 데이터 로드
            this.loadLocalMotionData();
            
            // 친구 목록 및 통신 오프셋 로드
            await this.loadFriendsAndOffsets();
            
            // 센서 리스너 설정
            this.setupSensorListeners();
            
            // 사용자 상호작용 리스너 설정
            this.setupUserInteractionListeners();
            
            // 시간 관리 시스템 시작
            this.startTimeManagement();
            
            // 통신 스케줄러 시작
            this.startCommunicationScheduler();
            
            console.log('✅ Enhanced Motion Detection 시스템 활성화 완료');
            console.log(`📊 지원되는 센서:`, this.sensors);
            
        } catch (error) {
            console.error('❌ Enhanced Motion Detection 초기화 실패:', error);
        }
    }

    // 센서 지원 여부 확인
    async checkSensorSupport() {
        console.log('🔍 디바이스 센서 지원 여부 확인 중...');
        
        // DeviceMotionEvent (가속도계 + 자이로스코프)
        if (typeof DeviceMotionEvent !== 'undefined') {
            this.sensors.deviceMotion = true;
            
            // iOS 13+에서는 권한 요청 필요
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceMotionEvent.requestPermission();
                    this.sensors.deviceMotion = permission === 'granted';
                    console.log('📱 DeviceMotion 권한:', permission);
                } catch (error) {
                    console.log('⚠️ DeviceMotion 권한 요청 실패:', error);
                    this.sensors.deviceMotion = false;
                }
            }
        }
        
        // DeviceOrientationEvent (자이로스코프)
        if (typeof DeviceOrientationEvent !== 'undefined') {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    this.sensors.gyroscope = permission === 'granted';
                    console.log('🧭 DeviceOrientation 권한:', permission);
                } catch (error) {
                    console.log('⚠️ DeviceOrientation 권한 요청 실패:', error);
                }
            } else {
                this.sensors.gyroscope = true;
            }
        }
        
        console.log('✅ 센서 지원 확인 완료:', this.sensors);
    }

    // 로컬 움직임 데이터 로드
    loadLocalMotionData() {
        const currentHour = new Date();
        currentHour.setMinutes(0, 0, 0); // 정시로 설정
        this.currentHourKey = currentHour.toISOString();
        
        const savedData = localStorage.getItem(`motion_count_${this.currentHourKey}`);
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                this.motionCount = data.count || 0;
                console.log(`📊 저장된 움직임 카운트 로드: ${this.motionCount}`);
            } catch (error) {
                console.warn('⚠️ 저장된 움직임 데이터 파싱 실패:', error);
                this.motionCount = 0;
            }
        } else {
            this.motionCount = 0;
        }
        
        this.saveMotionDataToLocal();
    }

    // 친구 목록 및 통신 오프셋 로드
    async loadFriendsAndOffsets() {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser || !storage?.supabase?.client) {
                console.log('⚠️ 사용자 정보 또는 DB 연결 없음');
                return;
            }

            // Enhanced 스키마 적용 전까지 기본 친구 목록만 조회
            const { data: friends, error } = await storage.supabase.client
                .from('friends')
                .select('friend_id, users!friends_friend_id_fkey(name)')
                .eq('user_id', currentUser.id)
                .eq('status', 'active');

            if (error) {
                console.error('❌ 친구 목록 로드 실패:', error);
                // Enhanced 스키마 적용 전까지는 빈 배열로 처리
                console.log('⚠️ Enhanced 스키마 미적용으로 인한 오류 - 임시로 빈 친구 목록 사용');
                this.friends = [];
                return;
            }

            this.friends = friends || [];
            this.communicationOffsets.clear();

            // Enhanced 스키마 적용 전까지는 랜덤 오프셋 생성
            this.friends.forEach(friend => {
                const randomOffset = Math.floor(Math.random() * 3600); // 0-3599초 
                this.communicationOffsets.set(friend.friend_id, randomOffset);
            });

            console.log(`👥 친구 ${this.friends.length}명의 통신 오프셋 로드 완료`);
            
        } catch (error) {
            console.error('❌ 친구 데이터 로드 실패:', error);
        }
    }

    // 센서 리스너 설정
    setupSensorListeners() {
        // DeviceMotionEvent (가속도계) - 향상된 진동 필터링
        if (this.sensors.deviceMotion) {
            let lastMotionTime = 0;
            let vibrationBuffer = []; // 진동 패턴 감지용
            let consecutiveHighValues = 0;
            
            window.addEventListener('devicemotion', (event) => {
                const now = Date.now();
                if (now - lastMotionTime < 300) return; // 0.3초 디바운싱
                
                const acc = event.acceleration || event.accelerationIncludingGravity;
                if (acc) {
                    const totalAcceleration = Math.abs(acc.x) + Math.abs(acc.y) + Math.abs(acc.z);
                    
                    // 진동 패턴 감지를 위한 버퍼 관리
                    vibrationBuffer.push({
                        value: totalAcceleration,
                        timestamp: now
                    });
                    
                    // 최근 3초간의 데이터만 유지
                    vibrationBuffer = vibrationBuffer.filter(item => now - item.timestamp < 3000);
                    
                    // 전화 진동 패턴 감지 (규칙적인 고진동)
                    const isPhoneVibration = this.detectPhoneVibration(vibrationBuffer);
                    
                    // 임계값을 넘고 전화 진동이 아닌 경우에만 움직임으로 판정
                    if (totalAcceleration > 2.5 && !isPhoneVibration) {
                        // 연속된 높은 값이 아닌 경우에만 (사람의 자연스러운 움직임)
                        if (consecutiveHighValues < 3) {
                            this.recordMotion('accelerometer');
                            lastMotionTime = now;
                            consecutiveHighValues = 0;
                        } else {
                            consecutiveHighValues++;
                        }
                    } else if (totalAcceleration <= 1.0) {
                        consecutiveHighValues = 0; // 낮은 값이 나오면 카운터 리셋
                    }
                    
                    if (isPhoneVibration) {
                        console.log('📱 전화 진동 패턴 감지 - 움직임에서 제외');
                    }
                }
            });
            
            console.log('📱 가속도계 리스너 활성화');
        }

        // DeviceOrientationEvent (자이로스코프)
        if (this.sensors.gyroscope) {
            let lastOrientation = { alpha: 0, beta: 0, gamma: 0 };
            let lastOrientationTime = 0;
            
            window.addEventListener('deviceorientation', (event) => {
                const now = Date.now();
                if (now - lastOrientationTime < 1000) return; // 1초 디바운싱
                
                const { alpha, beta, gamma } = event;
                if (alpha !== null && beta !== null && gamma !== null) {
                    const deltaAlpha = Math.abs(alpha - lastOrientation.alpha);
                    const deltaBeta = Math.abs(beta - lastOrientation.beta);
                    const deltaGamma = Math.abs(gamma - lastOrientation.gamma);
                    
                    // 각도 변화가 임계값을 넘으면 움직임으로 판정
                    if (deltaAlpha > 10 || deltaBeta > 10 || deltaGamma > 10) {
                        this.recordMotion('gyroscope');
                        lastOrientation = { alpha, beta, gamma };
                        lastOrientationTime = now;
                    }
                }
            });
            
            console.log('🧭 자이로스코프 리스너 활성화');
        }
    }

    // 사용자 상호작용 리스너 설정
    setupUserInteractionListeners() {
        // 터치 이벤트
        let lastTouchTime = 0;
        const touchHandler = () => {
            const now = Date.now();
            if (now - lastTouchTime > 1000) { // 1초 디바운싱
                this.recordMotion('touch');
                lastTouchTime = now;
            }
        };

        document.addEventListener('touchstart', touchHandler, { passive: true });
        document.addEventListener('touchmove', touchHandler, { passive: true });
        document.addEventListener('click', touchHandler);
        
        // 스크롤 이벤트
        let lastScrollTime = 0;
        const scrollHandler = () => {
            const now = Date.now();
            if (now - lastScrollTime > 2000) { // 2초 디바운싱
                this.recordMotion('scroll');
                lastScrollTime = now;
            }
        };
        
        document.addEventListener('scroll', scrollHandler, { passive: true });
        window.addEventListener('scroll', scrollHandler, { passive: true });
        
        // 키보드 입력 (웹에서)
        document.addEventListener('keydown', () => {
            this.recordMotion('keyboard');
        });
        
        console.log('👆 사용자 상호작용 리스너 활성화');
    }

    // 전화 진동 패턴 감지 함수
    detectPhoneVibration(vibrationBuffer) {
        if (vibrationBuffer.length < 5) return false;
        
        // 최근 데이터 분석
        const recentData = vibrationBuffer.slice(-10); // 최근 10개 데이터
        const highValueCount = recentData.filter(item => item.value > 3.0).length;
        const totalValues = recentData.length;
        
        // 1. 높은 진동값의 비율이 80% 이상
        const highValueRatio = highValueCount / totalValues;
        
        // 2. 규칙적인 패턴 감지 (진동 간격이 일정한지)
        const intervals = [];
        for (let i = 1; i < recentData.length; i++) {
            intervals.push(recentData[i].timestamp - recentData[i-1].timestamp);
        }
        
        // 평균 간격 계산
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        
        // 간격의 표준편차 계산 (규칙성 측정)
        const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
        const standardDeviation = Math.sqrt(variance);
        
        // 3. 전화 진동 특징 판정
        const isRegularPattern = standardDeviation < 100; // 간격이 매우 규칙적
        const isHighIntensity = highValueRatio > 0.8; // 80% 이상 고진동
        const isShortInterval = avgInterval < 400; // 0.4초 미만 간격
        
        // 전화 진동으로 판정하는 조건
        const isPhoneVibration = isRegularPattern && isHighIntensity && isShortInterval;
        
        if (isPhoneVibration) {
            console.log(`📞 전화 진동 감지: 고진동비율=${(highValueRatio*100).toFixed(1)}%, 평균간격=${avgInterval.toFixed(1)}ms, 편차=${standardDeviation.toFixed(1)}`);
        }
        
        return isPhoneVibration;
    }

    // 움직임 기록 - 향상된 검증 시스템
    recordMotion(source) {
        // 배터리 효율성: 일시정지 상태이면 무시
        if (this.isPaused) {
            console.log(`🔋 배터리 최적화 - 일시정지 중 (${source} 무시)`);
            return;
        }
        
        if (this.motionDebounceTimer) {
            clearTimeout(this.motionDebounceTimer);
        }
        
        this.motionDebounceTimer = setTimeout(() => {
            // 다중 센서 검증 시스템
            const isValidMotion = this.validateMotion(source);
            
            if (isValidMotion) {
                this.motionCount++;
                this.lastSensorUpdate = Date.now();
                
                // 배터리 효율성: 10회 도달 시 일시정지
                this.checkBatteryOptimization();
                
                console.log(`✅ 유효한 움직임 감지 (+1): ${this.motionCount} [${source}]`);
                
                // 로컬 저장소 업데이트
                this.saveMotionDataToLocal();
                
                // UI 업데이트 (있다면)
                this.updateMotionUI();
            } else {
                console.log(`⚠️ 의심스러운 움직임 감지 - 무시됨 [${source}]`);
            }
            
        }, 100); // 100ms 디바운싱
    }

    // 움직임 유효성 검증
    validateMotion(source) {
        const now = Date.now();
        
        // 최근 5초간의 센서 활동 기록 초기화
        if (!this.recentSensorActivity) {
            this.recentSensorActivity = {};
        }
        
        // 현재 센서 활동 기록
        if (!this.recentSensorActivity[source]) {
            this.recentSensorActivity[source] = [];
        }
        
        this.recentSensorActivity[source].push(now);
        
        // 5초 이상 된 기록 제거
        Object.keys(this.recentSensorActivity).forEach(sensorType => {
            this.recentSensorActivity[sensorType] = this.recentSensorActivity[sensorType]
                .filter(timestamp => now - timestamp < 5000);
        });
        
        // 검증 규칙들
        
        // 1. 가속도계만 단독으로 매우 빈번하게 감지되는 경우 (전화 진동 의심)
        if (source === 'accelerometer') {
            const accelCount = this.recentSensorActivity.accelerometer?.length || 0;
            const otherSensorCount = Object.keys(this.recentSensorActivity)
                .filter(key => key !== 'accelerometer')
                .reduce((sum, key) => sum + (this.recentSensorActivity[key]?.length || 0), 0);
            
            // 가속도계만 10번 이상 감지되고 다른 센서는 전혀 없으면 의심
            if (accelCount > 10 && otherSensorCount === 0) {
                console.log('🚨 가속도계 단독 과다 감지 - 전화 진동 가능성');
                return false;
            }
        }
        
        // 2. 사용자 상호작용(터치, 스크롤 등)이 있으면 확실히 유효
        if (['touch', 'scroll', 'keyboard', 'click'].includes(source)) {
            return true;
        }
        
        // 3. 센서 조합으로 검증 (자이로스코프 + 가속도계)
        const hasMultipleSensors = Object.keys(this.recentSensorActivity)
            .filter(key => (this.recentSensorActivity[key]?.length || 0) > 0).length > 1;
        
        if (hasMultipleSensors) {
            return true; // 여러 센서가 동시에 감지되면 실제 움직임일 가능성 높음
        }
        
        // 4. 기본적으로 허용하되, 의심스러운 패턴만 차단
        return true;
    }

    // 로컬 저장소에 움직임 데이터 저장
    saveMotionDataToLocal() {
        const data = {
            count: this.motionCount,
            hourStarted: this.currentHourKey,
            lastUpdate: new Date().toISOString(),
            sensors: Object.keys(this.sensors).filter(s => this.sensors[s])
        };
        
        localStorage.setItem(`motion_count_${this.currentHourKey}`, JSON.stringify(data));
    }

    // 시간 관리 시스템 시작
    startTimeManagement() {
        // 매시간 0분 0초에 카운터 리셋
        const now = new Date();
        const msUntilNextHour = (60 - now.getMinutes()) * 60 * 1000 - now.getSeconds() * 1000 - now.getMilliseconds();
        
        setTimeout(() => {
            this.resetHourlyCounter();
            
            // 이후 매시간 실행
            this.hourlyResetTimer = setInterval(() => {
                this.resetHourlyCounter();
            }, 60 * 60 * 1000); // 1시간
            
        }, msUntilNextHour);
        
        console.log(`⏰ 다음 카운터 리셋까지: ${Math.round(msUntilNextHour / 1000)}초`);
    }

    // 시간별 카운터 리셋
    resetHourlyCounter() {
        console.log(`🔄 시간별 카운터 리셋 (이전 카운트: ${this.motionCount})`);
        
        // 이전 시간의 데이터를 히스토리로 저장
        this.saveHourlyHistory();
        
        // 새로운 시간 키 설정
        const newHour = new Date();
        newHour.setMinutes(0, 0, 0);
        this.currentHourKey = newHour.toISOString();
        
        // 카운터 리셋
        this.motionCount = 0;
        this.isPaused = false; // 배터리 효율성 상태도 리셋
        this.lastHourlyReset = new Date().getHours();
        this.saveMotionDataToLocal();
        
        console.log(`✅ 새로운 시간 시작: ${this.currentHourKey} (배터리 최적화 해제)`);
    }

    // 배터리 효율성 체크
    checkBatteryOptimization() {
        const currentHour = new Date().getHours();
        
        // 시간이 바뀌었으면 카운터와 일시정지 상태 리셋
        if (this.lastHourlyReset !== currentHour) {
            this.isPaused = false;
            this.lastHourlyReset = currentHour;
            console.log(`🔋 시간 변경으로 배터리 최적화 해제 (${currentHour}시)`);
        }
        
        // 10회 이상 감지되면 배터리 절약을 위해 일시정지
        if (this.motionCount >= this.maxMotionsPerHour && !this.isPaused) {
            this.isPaused = true;
            console.log(`🔋 배터리 최적화: ${this.maxMotionsPerHour}회 도달, 다음 시간까지 일시정지`);
        }
    }

    // 시간별 히스토리 저장 (최근 7일만 보관)
    saveHourlyHistory() {
        const historyKey = `motion_history`;
        let history = [];
        
        try {
            const saved = localStorage.getItem(historyKey);
            if (saved) {
                history = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ 히스토리 로드 실패:', error);
        }
        
        // 현재 시간 데이터 추가
        history.push({
            hour: this.currentHourKey,
            motionCount: this.motionCount,
            savedAt: new Date().toISOString()
        });
        
        // 7일(168시간) 이상된 데이터 제거
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        history = history.filter(item => new Date(item.hour) > weekAgo);
        
        // 히스토리 저장
        localStorage.setItem(historyKey, JSON.stringify(history));
        console.log(`📊 움직임 히스토리 저장 (총 ${history.length}개 항목)`);
    }

    // 통신 스케줄러 시작
    startCommunicationScheduler() {
        // 매 10초마다 통신 시간 확인
        this.communicationTimer = setInterval(() => {
            this.checkCommunicationTime();
        }, 10000);
        
        console.log('📡 통신 스케줄러 시작 (10초마다 확인)');
    }

    // 통신 시간 확인 및 전송
    checkCommunicationTime() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();
        const currentOffset = currentMinute * 60 + currentSecond;
        
        this.communicationOffsets.forEach(async (offset, friendId) => {
            // 현재 시간이 예정된 통신 시간과 일치하는지 확인 (±10초 허용)
            if (Math.abs(currentOffset - offset) <= 10) {
                console.log(`📡 친구 ${friendId}에게 통신 시간: ${currentHour}:${Math.floor(offset/60).toString().padStart(2,'0')}:${(offset%60).toString().padStart(2,'0')}`);
                await this.sendStatusToFriend(friendId);
            }
        });
    }

    // 친구에게 상태 전송 (수면 최적화 버전)
    async sendStatusToFriend(friendId) {
        try {
            const currentUser = auth?.getCurrentUser();
            if (!currentUser || !storage?.supabase?.client) {
                console.log('⚠️ 사용자 정보 또는 DB 연결 없음');
                return;
            }
            
            // UserIdUtils로 사용자 ID 정규화 (중복 방지)
            const normalizedUserId = UserIdUtils.normalizeKakaoId(currentUser.id || currentUser.kakao_id);
            console.log(`🔄 사용자 ID 정규화: ${currentUser.id} → ${normalizedUserId}`);

            // 디바이스 상태 정보 수집
            const deviceStatus = navigator.onLine ? 'online' : 'offline';
            const batteryLevel = await this.getBatteryLevel();
            const statusType = (this.motionCount > 0 && deviceStatus === 'online') ? 'normal' : 'abnormal';
            
            console.log(`📤 친구 ${friendId}에게 상태 전송: 움직임=${this.motionCount}, 상태=${deviceStatus}, 타입=${statusType}`);

            // 🌙 수면 시간 최적화 로직
            const isSleepTime = this.isSleepTime();
            const shouldOptimize = statusType === 'abnormal' && isSleepTime;

            if (shouldOptimize) {
                // 수면 시간 중 비정상 상태는 로컬 저장 + 배치 처리
                await this.handleSleepTimeAbnormal(friendId, {
                    motionCount: this.motionCount,
                    deviceStatus,
                    batteryLevel,
                    timestamp: new Date().toISOString()
                });
            } else {
                // 정상 상태이거나 기상 시간 중이면 DB 직접 저장
                const { data, error } = await storage.supabase.client
                    .rpc('process_friend_status_communication', {
                        p_sender_id: normalizedUserId, // 정규화된 사용자 ID 사용
                        p_receiver_id: friendId,
                        p_motion_count: this.motionCount,
                        p_device_status: deviceStatus,
                        p_battery_level: batteryLevel
                    });

                if (error) {
                    console.error('❌ 상태 통신 실패:', error);
                    // 실패 시 로컬 백업 저장
                    this.saveFailedCommunicationToLocal(friendId, {
                        motionCount: this.motionCount,
                        deviceStatus,
                        batteryLevel,
                        error: error.message
                    });
                    return;
                }

                console.log(`✅ 친구 ${friendId}에게 DB 직접 전송 완료`);
            }
            
            // 전송 후 카운터 리셋
            this.motionCount = 0;
            this.saveMotionDataToLocal();

        } catch (error) {
            console.error('❌ 친구 상태 전송 오류:', error);
        }
    }

    // 수면 시간 체크
    isSleepTime() {
        const now = new Date();
        const currentHour = now.getHours();
        
        // 기본 수면 시간: 22:00 ~ 08:00
        const sleepStart = 22;
        const sleepEnd = 8;
        
        // 사용자 설정이 있다면 우선 사용
        const userSleepSettings = this.getUserSleepSettings();
        if (userSleepSettings) {
            return currentHour >= userSleepSettings.start || currentHour < userSleepSettings.end;
        }
        
        // 기본값 사용
        return currentHour >= sleepStart || currentHour < sleepEnd;
    }

    // 사용자 수면 설정 가져오기 (로컬스토리지에서)
    getUserSleepSettings() {
        try {
            const settings = localStorage.getItem('user_sleep_settings');
            return settings ? JSON.parse(settings) : null;
        } catch (error) {
            console.warn('⚠️ 수면 설정 로드 실패:', error);
            return null;
        }
    }

    // 수면 시간 중 비정상 상태 처리
    async handleSleepTimeAbnormal(friendId, statusData) {
        const now = new Date();
        const sleepDataKey = `sleep_abnormal_${friendId}_${now.toDateString()}`;
        
        try {
            // 기존 수면 비정상 데이터 로드
            let sleepAbnormalData = [];
            const existing = localStorage.getItem(sleepDataKey);
            if (existing) {
                sleepAbnormalData = JSON.parse(existing);
            }
            
            // 새 데이터 추가
            sleepAbnormalData.push({
                ...statusData,
                hour: now.getHours(),
                savedAt: statusData.timestamp
            });
            
            // 로컬 저장
            localStorage.setItem(sleepDataKey, JSON.stringify(sleepAbnormalData));
            
            console.log(`🌙 수면 시간 비정상 데이터 로컬 저장: ${sleepAbnormalData.length}개 누적`);
            
            // 24시간 누적 체크 (수면+기상 시간 합산)
            const totalAbnormalHours = await this.getTotalAbnormalHours(friendId);
            
            if (totalAbnormalHours >= 24) {
                console.log(`⚠️ 24시간 연속 비정상 감지 - DB 저장 및 알림 시작`);
                
                // 24시간 도달 시에만 DB에 일괄 저장
                await this.processSleepAbnormalBatch(friendId);
                
                // 알림 발송
                await this.triggerCriticalAlert(friendId, totalAbnormalHours);
            }
            
        } catch (error) {
            console.error('❌ 수면 시간 비정상 처리 실패:', error);
        }
    }

    // 총 비정상 시간 계산 (수면 + 기상 시간 합산)
    async getTotalAbnormalHours(friendId) {
        try {
            // 1. 로컬스토리지의 수면 시간 비정상 데이터
            const last3Days = [];
            for (let i = 0; i < 3; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = `sleep_abnormal_${friendId}_${date.toDateString()}`;
                const data = localStorage.getItem(key);
                if (data) {
                    last3Days.push(...JSON.parse(data));
                }
            }
            
            // 2. DB의 최근 통신 기록
            const { data: recentComms, error } = await storage.supabase.client
                .from('friend_status_communications')
                .select('status_type, actual_send_time')
                .eq('sender_user_id', auth.getCurrentUser().id)
                .eq('receiver_user_id', friendId)
                .gte('actual_send_time', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
                .order('actual_send_time', { ascending: false });
            
            if (error) {
                console.warn('⚠️ 최근 통신 기록 조회 실패:', error);
                return last3Days.length; // 로컬 데이터만으로 대략 계산
            }
            
            // 3. 연속 비정상 시간 계산
            let consecutiveAbnormalHours = 0;
            const allData = [...last3Days, ...(recentComms || [])];
            
            // 시간순 정렬 후 연속 비정상 체크
            allData.sort((a, b) => new Date(b.savedAt || b.actual_send_time) - new Date(a.savedAt || a.actual_send_time));
            
            for (const record of allData) {
                if (record.motionCount === 0 || record.status_type === 'abnormal') {
                    consecutiveAbnormalHours++;
                } else {
                    break; // 정상 통신이 나오면 연속 중단
                }
            }
            
            return consecutiveAbnormalHours;
            
        } catch (error) {
            console.error('❌ 비정상 시간 계산 실패:', error);
            return 0;
        }
    }

    // 수면 비정상 데이터 일괄 처리
    async processSleepAbnormalBatch(friendId) {
        try {
            const now = new Date();
            const batchData = [];
            
            // 최근 3일간의 수면 비정상 데이터 수집
            for (let i = 0; i < 3; i++) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const key = `sleep_abnormal_${friendId}_${date.toDateString()}`;
                const data = localStorage.getItem(key);
                
                if (data) {
                    const sleepData = JSON.parse(data);
                    batchData.push(...sleepData);
                    
                    // 처리된 데이터는 삭제
                    localStorage.removeItem(key);
                }
            }
            
            if (batchData.length === 0) return;
            
            console.log(`📦 수면 비정상 데이터 일괄 처리: ${batchData.length}개`);
            
            // DB에 일괄 저장 (배치 인서트)
            const currentUser = auth.getCurrentUser();
            const batchInserts = batchData.map(data => ({
                sender_user_id: currentUser.id,
                receiver_user_id: friendId,
                motion_count: data.motionCount,
                device_status: data.deviceStatus,
                battery_level: data.batteryLevel,
                scheduled_time: data.timestamp,
                actual_send_time: data.timestamp,
                status_type: 'abnormal',
                communication_offset: this.communicationOffsets.get(friendId) || 0,
                created_at: data.timestamp
            }));
            
            const { error } = await storage.supabase.client
                .from('friend_status_communications')
                .insert(batchInserts);
            
            if (error) {
                console.error('❌ 배치 저장 실패:', error);
                // 실패한 데이터 다시 로컬 저장
                localStorage.setItem(`failed_batch_${friendId}_${now.getTime()}`, JSON.stringify(batchData));
            } else {
                console.log('✅ 수면 비정상 데이터 배치 저장 완료');
            }
            
        } catch (error) {
            console.error('❌ 배치 처리 실패:', error);
        }
    }

    // 24시간 도달 시 긴급 알림 발송
    async triggerCriticalAlert(friendId, abnormalHours) {
        try {
            console.log(`🚨 ${friendId} 친구의 ${abnormalHours}시간 연속 비정상 - 긴급 알림 발송`);
            
            // 기존 알림 시스템 연동
            if (window.notificationsManager) {
                await window.notificationsManager.sendFriendInactiveNotification({
                    friend_id: friendId,
                    friend_name: '친구', // 실제 이름 조회 필요
                    alert_level: abnormalHours >= 72 ? 'emergency' : abnormalHours >= 48 ? 'danger' : 'warning',
                    hours_since_heartbeat: abnormalHours
                });
            }
            
        } catch (error) {
            console.error('❌ 긴급 알림 발송 실패:', error);
        }
    }

    // 통신 실패 시 로컬 백업
    saveFailedCommunicationToLocal(friendId, data) {
        const failedKey = `failed_comm_${friendId}_${Date.now()}`;
        localStorage.setItem(failedKey, JSON.stringify({
            ...data,
            timestamp: new Date().toISOString(),
            retry_count: 0
        }));
        
        console.log(`💾 통신 실패 데이터 로컬 백업: ${failedKey}`);
        
        // 재시도 스케줄링 (5분 후)
        setTimeout(() => {
            this.retryFailedCommunications();
        }, 5 * 60 * 1000);
    }

    // 실패한 통신 재시도
    async retryFailedCommunications() {
        try {
            const failedKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('failed_comm_'))
                .slice(0, 10); // 최대 10개씩 처리
            
            for (const key of failedKeys) {
                const data = JSON.parse(localStorage.getItem(key));
                
                // 재시도 횟수 제한 (3회)
                if (data.retry_count >= 3) {
                    localStorage.removeItem(key);
                    continue;
                }
                
                // 재시도 로직
                const success = await this.retryFriendCommunication(data);
                if (success) {
                    localStorage.removeItem(key);
                    console.log(`✅ 실패 통신 재시도 성공: ${key}`);
                } else {
                    // 재시도 횟수 증가
                    data.retry_count++;
                    localStorage.setItem(key, JSON.stringify(data));
                }
            }
            
        } catch (error) {
            console.error('❌ 실패 통신 재시도 오류:', error);
        }
    }

    // 개별 통신 재시도
    async retryFriendCommunication(failedData) {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return false;
            
            const { error } = await storage.supabase.client
                .rpc('process_friend_status_communication', {
                    p_sender_id: currentUser.id,
                    p_receiver_id: failedData.friendId,
                    p_motion_count: failedData.motionCount,
                    p_device_status: failedData.deviceStatus,
                    p_battery_level: failedData.batteryLevel
                });
            
            return !error;
        } catch (error) {
            console.error('❌ 개별 통신 재시도 실패:', error);
            return false;
        }
    }

    // 배터리 레벨 가져오기 (지원되는 경우)
    async getBatteryLevel() {
        try {
            if ('getBattery' in navigator) {
                const battery = await navigator.getBattery();
                return Math.round(battery.level * 100);
            }
        } catch (error) {
            console.log('⚠️ 배터리 정보 접근 실패:', error);
        }
        return null;
    }

    // UI 업데이트 (선택적)
    updateMotionUI() {
        // 현재 움직임 카운트를 UI에 표시
        const motionElement = document.getElementById('current-motion-count');
        if (motionElement) {
            motionElement.textContent = this.motionCount;
        }
        
        // 상태 표시
        const statusElement = document.getElementById('motion-status');
        if (statusElement) {
            if (this.motionCount > 0) {
                statusElement.textContent = '활동 중';
                statusElement.className = 'motion-status active';
            } else {
                statusElement.textContent = '비활성';
                statusElement.className = 'motion-status inactive';
            }
        }
    }

    // 현재 상태 조회
    getCurrentStatus() {
        return {
            motionCount: this.motionCount,
            currentHour: this.currentHourKey,
            lastUpdate: new Date(this.lastSensorUpdate).toLocaleString(),
            supportedSensors: Object.keys(this.sensors).filter(s => this.sensors[s]),
            friendsCount: this.friends.length,
            nextCommunications: this.getNextCommunications()
        };
    }

    // 다음 통신 시간들 조회
    getNextCommunications() {
        const now = new Date();
        const currentOffset = now.getMinutes() * 60 + now.getSeconds();
        
        return Array.from(this.communicationOffsets.entries()).map(([friendId, offset]) => {
            let nextTime;
            if (offset > currentOffset) {
                // 이번 시간 내
                nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), Math.floor(offset/60), offset%60);
            } else {
                // 다음 시간
                nextTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()+1, Math.floor(offset/60), offset%60);
            }
            
            return {
                friendId,
                nextTime: nextTime.toLocaleTimeString(),
                secondsUntil: Math.round((nextTime - now) / 1000)
            };
        }).sort((a, b) => a.secondsUntil - b.secondsUntil);
    }

    // 시스템 종료
    destroy() {
        if (this.communicationTimer) {
            clearInterval(this.communicationTimer);
        }
        if (this.hourlyResetTimer) {
            clearInterval(this.hourlyResetTimer);
        }
        if (this.motionDebounceTimer) {
            clearTimeout(this.motionDebounceTimer);
        }
        
        console.log('🛑 Enhanced Motion Detector 종료');
    }
}

// 전역 인스턴스 생성
let enhancedMotionDetector;

// 초기화 함수
async function initEnhancedMotionDetector() {
    if (!enhancedMotionDetector) {
        enhancedMotionDetector = new EnhancedMotionDetector();
        window.enhancedMotionDetector = enhancedMotionDetector;
        
        await enhancedMotionDetector.init();
        console.log('🎯 Enhanced Motion Detector 전역 등록 완료');
    }
    return enhancedMotionDetector;
}

// 전역 함수로 등록
window.initEnhancedMotionDetector = initEnhancedMotionDetector;

// 로그인 후 자동 시작
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        if (auth?.getCurrentUser()) {
            await initEnhancedMotionDetector();
        }
    }, 5000); // 5초 후 시작 (다른 시스템 로드 대기)
});

// 전역 테스트 함수들
window.getMotionStatus = () => {
    if (enhancedMotionDetector) {
        return enhancedMotionDetector.getCurrentStatus();
    }
    return null;
};

window.testManualMotion = () => {
    if (enhancedMotionDetector) {
        enhancedMotionDetector.recordMotion('manual_test');
        return enhancedMotionDetector.motionCount;
    }
    return 0;
};

// 전화 진동 테스트 함수
window.simulatePhoneVibration = () => {
    if (enhancedMotionDetector) {
        console.log('📱 전화 진동 시뮬레이션 시작...');
        let count = 0;
        const interval = setInterval(() => {
            enhancedMotionDetector.recordMotion('accelerometer');
            count++;
            if (count >= 15) {
                clearInterval(interval);
                console.log('📱 전화 진동 시뮬레이션 종료');
            }
        }, 200); // 0.2초 간격으로 15번 (전화 진동 패턴)
        
        return '전화 진동 시뮬레이션 실행 중...';
    }
    return '모션 감지기가 초기화되지 않음';
};

// 센서 활동 현황 조회
window.getSensorActivity = () => {
    if (enhancedMotionDetector && enhancedMotionDetector.recentSensorActivity) {
        const activity = {};
        Object.keys(enhancedMotionDetector.recentSensorActivity).forEach(sensor => {
            activity[sensor] = enhancedMotionDetector.recentSensorActivity[sensor].length;
        });
        console.table(activity);
        return activity;
    }
    return '센서 활동 데이터 없음';
};

window.showNextCommunications = () => {
    if (enhancedMotionDetector) {
        const nextComms = enhancedMotionDetector.getNextCommunications();
        console.table(nextComms);
        return nextComms;
    }
    return [];
};

// 데이터베이스 테스트 함수들
window.testFriendCommunication = async (friendId, motionCount = 5) => {
    if (enhancedMotionDetector) {
        await enhancedMotionDetector.sendStatusToFriend(friendId);
        return `친구 ${friendId}에게 모션카운트 ${motionCount}으로 테스트 통신 발송`;
    }
    return '모션 감지기가 초기화되지 않음';
};

window.checkDatabaseTables = async () => {
    try {
        const currentUser = auth?.getCurrentUser();
        if (!currentUser) return '로그인 필요';
        
        console.log('📊 데이터베이스 테이블 확인 중...');
        
        // 친구 관계 및 통신 오프셋 확인
        const { data: friends, error: friendsError } = await storage.supabase.client
            .from('friends')
            .select('friend_id, communication_offset, users!friends_friend_id_fkey(name)')
            .eq('user_id', currentUser.id)
            .eq('status', 'active');
        
        console.log('👥 친구 관계:', friends);
        
        // 사용자 현재 상태 확인
        const { data: currentStatus, error: statusError } = await storage.supabase.client
            .from('user_current_status')
            .select('*')
            .eq('user_id', currentUser.id);
        
        console.log('📈 현재 상태:', currentStatus);
        
        // 최근 통신 기록 확인
        const { data: communications, error: commError } = await storage.supabase.client
            .from('friend_status_communications')
            .select('*')
            .eq('sender_user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
        
        console.log('📡 최근 통신 기록:', communications);
        
        return {
            friends: friends?.length || 0,
            currentStatus: currentStatus?.[0] || '없음',
            recentCommunications: communications?.length || 0
        };
        
    } catch (error) {
        console.error('❌ 데이터베이스 확인 실패:', error);
        return error.message;
    }
};

// 전역 초기화 함수 (중복 방지)
window.initEnhancedMotionDetector = async function() {
    if (window.enhancedMotionDetectorInstance && window.enhancedMotionDetectorInstance.isInitialized) {
        console.log('🔄 EnhancedMotionDetector 이미 초기화됨 - 기존 인스턴스 사용');
        return window.enhancedMotionDetectorInstance;
    }
    
    if (!window.enhancedMotionDetectorInstance) {
        console.log('🚀 새로운 EnhancedMotionDetector 인스턴스 생성');
        window.enhancedMotionDetectorInstance = new EnhancedMotionDetector();
    }
    
    if (!window.enhancedMotionDetectorInstance.isInitialized) {
        console.log('🔧 EnhancedMotionDetector 초기화 중...');
        await window.enhancedMotionDetectorInstance.init();
        window.enhancedMotionDetectorInstance.isInitialized = true;
        console.log('✅ EnhancedMotionDetector 초기화 완료');
    }
    
    return window.enhancedMotionDetectorInstance;
};

console.log('🎯 Enhanced Motion Detector 로드 완료');
console.log('📋 테스트 함수들:');
console.log('  - getMotionStatus() : 현재 모션 상태 조회');  
console.log('  - testManualMotion() : 수동 모션 추가');
console.log('  - simulatePhoneVibration() : 전화 진동 시뮬레이션 (오탐지 테스트)');
console.log('  - getSensorActivity() : 최근 5초간 센서 활동 현황');
console.log('  - showNextCommunications() : 다음 통신 시간들');
console.log('  - testFriendCommunication(friendId) : 친구에게 테스트 통신');
console.log('  - checkDatabaseTables() : 데이터베이스 테이블 확인');