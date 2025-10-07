/**
 * 비동기 처리 최적화 헬퍼
 * 병렬 처리, 작업 큐, 스케줄링을 통한 성능 최적화
 */
class AsyncOptimizer {
    constructor() {
        this.taskQueue = [];
        this.runningTasks = new Set();
        this.maxConcurrency = 3; // 최대 3개 작업 동시 실행
        this.isProcessing = false;
        this.taskId = 0;
        this.taskResults = new Map();
        
        // 성능 메트릭
        this.metrics = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            averageExecutionTime: 0
        };
        
        this.setupPerformanceMonitoring();
    }
    
    /**
     * 병렬 작업 실행
     * @param {Array<Function>} tasks - 실행할 비동기 함수들
     * @param {Object} options - 옵션 (concurrency, timeout 등)
     * @returns {Promise<Array>} 결과 배열
     */
    async executeParallel(tasks, options = {}) {
        const {
            concurrency = this.maxConcurrency,
            timeout = 30000,
            failFast = false
        } = options;
        
        console.log(`🚀 병렬 작업 실행: ${tasks.length}개 작업, 동시성: ${concurrency}`);
        
        const startTime = Date.now();
        const results = [];
        const executing = [];
        
        for (let i = 0; i < tasks.length; i++) {
            const taskPromise = this.executeWithTimeout(tasks[i], timeout, `Task-${i}`);
            results.push(taskPromise);
            
            if (results.length >= concurrency) {
                executing.push(taskPromise);
                
                if (executing.length >= concurrency) {
                    if (failFast) {
                        await Promise.all(executing.splice(0, concurrency));
                    } else {
                        await Promise.allSettled(executing.splice(0, concurrency));
                    }
                }
            }
        }
        
        // 남은 작업들 처리
        const finalResults = failFast 
            ? await Promise.all(results)
            : await Promise.allSettled(results);
        
        const executionTime = Date.now() - startTime;
        console.log(`✅ 병렬 작업 완료: ${executionTime}ms`);
        
        return finalResults;
    }
    
    /**
     * 타임아웃과 함께 작업 실행
     * @param {Function} task - 실행할 작업
     * @param {number} timeout - 타임아웃 (ms)
     * @param {string} taskName - 작업 이름
     * @returns {Promise} 작업 결과
     */
    async executeWithTimeout(task, timeout, taskName = 'Unknown') {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${taskName} 타임아웃 (${timeout}ms)`)), timeout)
        );
        
        const taskPromise = Promise.resolve().then(task);
        
        try {
            return await Promise.race([taskPromise, timeoutPromise]);
        } catch (error) {
            console.warn(`⚠️ ${taskName} 실패:`, error.message);
            throw error;
        }
    }
    
    /**
     * 작업을 큐에 추가
     * @param {Function} task - 실행할 작업
     * @param {Object} options - 옵션 (priority, timeout 등)
     * @returns {Promise} 작업 결과
     */
    async enqueue(task, options = {}) {
        const {
            priority = 0,
            timeout = 30000,
            retries = 0,
            name = `Task-${++this.taskId}`
        } = options;
        
        return new Promise((resolve, reject) => {
            const taskWrapper = {
                id: this.taskId,
                name,
                task,
                priority,
                timeout,
                retries,
                currentAttempt: 0,
                resolve,
                reject,
                addedAt: Date.now()
            };
            
            // 우선순위에 따라 삽입
            const insertIndex = this.taskQueue.findIndex(t => t.priority < priority);
            if (insertIndex === -1) {
                this.taskQueue.push(taskWrapper);
            } else {
                this.taskQueue.splice(insertIndex, 0, taskWrapper);
            }
            
            this.processQueue();
        });
    }
    
    /**
     * 큐 처리
     */
    async processQueue() {
        if (this.isProcessing || this.runningTasks.size >= this.maxConcurrency) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.taskQueue.length > 0 && this.runningTasks.size < this.maxConcurrency) {
            const taskWrapper = this.taskQueue.shift();
            this.runTask(taskWrapper);
        }
        
        this.isProcessing = false;
    }
    
    /**
     * 개별 작업 실행
     * @param {Object} taskWrapper - 작업 래퍼
     */
    async runTask(taskWrapper) {
        const { id, name, task, timeout, retries, resolve, reject } = taskWrapper;
        
        this.runningTasks.add(id);
        this.metrics.totalTasks++;
        
        const startTime = Date.now();
        
        try {
            console.log(`🔄 작업 시작: ${name}`);
            
            const result = await this.executeWithTimeout(task, timeout, name);
            
            const executionTime = Date.now() - startTime;
            this.updateMetrics(executionTime, true);
            
            console.log(`✅ 작업 완료: ${name} (${executionTime}ms)`);
            
            this.taskResults.set(id, { success: true, result, executionTime });
            resolve(result);
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // 재시도 가능한 경우
            if (taskWrapper.currentAttempt < retries) {
                taskWrapper.currentAttempt++;
                console.log(`🔄 작업 재시도: ${name} (${taskWrapper.currentAttempt}/${retries})`);
                
                // 백오프 지연 후 재시도
                const delay = Math.pow(2, taskWrapper.currentAttempt) * 1000;
                setTimeout(() => {
                    this.taskQueue.unshift(taskWrapper); // 큐 앞쪽에 재삽입
                    this.processQueue();
                }, delay);
                
                this.runningTasks.delete(id);
                return;
            }
            
            this.updateMetrics(executionTime, false);
            
            console.error(`❌ 작업 실패: ${name} (${executionTime}ms)`, error);
            
            this.taskResults.set(id, { success: false, error, executionTime });
            reject(error);
        } finally {
            this.runningTasks.delete(id);
            this.processQueue(); // 다음 작업 처리
        }
    }
    
    /**
     * 앱 초기화 데이터를 병렬로 로드
     * @param {string} userId - 사용자 ID
     * @returns {Promise<Object>} 초기화 데이터
     */
    async loadAppInitialData(userId) {
        console.log('🚀 앱 초기 데이터 병렬 로드 시작');
        
        const tasks = [
            // 1. 친구 데이터 (네트워크 최적화 사용)
            async () => {
                if (window.networkOptimizer) {
                    return await window.networkOptimizer.fetchFriendsData(userId);
                }
                return null;
            },
            
            // 2. 알림 설정 로드
            async () => {
                const settings = StorageHelper?.get('notification_settings') || {
                    enabled: true,
                    friend_status_alerts: true,
                    emergency_alerts: true,
                    auto_report_notifications: false
                };
                return settings;
            },
            
            // 3. 사용자 프로필 이미지 프리로드
            async () => {
                const currentUser = StorageHelper?.getUser();
                if (currentUser?.profile_image_url && window.imageCacheManager) {
                    return await window.imageCacheManager.loadImage(currentUser.profile_image_url);
                }
                return null;
            },
            
            // 4. 앱 설정 로드
            async () => {
                return StorageHelper?.get('app_settings') || {
                    theme: 'auto',
                    language: 'ko',
                    heartbeat_interval: 60
                };
            }
        ];
        
        const results = await this.executeParallel(tasks, { 
            concurrency: 4,
            failFast: false,
            timeout: 15000
        });
        
        // 결과 정리
        const [friendsData, notificationSettings, profileImage, appSettings] = results;
        
        const initialData = {
            friendsData: friendsData.status === 'fulfilled' ? friendsData.value : null,
            notificationSettings: notificationSettings.status === 'fulfilled' ? notificationSettings.value : {},
            profileImage: profileImage.status === 'fulfilled' ? profileImage.value : null,
            appSettings: appSettings.status === 'fulfilled' ? appSettings.value : {},
            loadTime: Date.now()
        };
        
        console.log('✅ 앱 초기 데이터 로드 완료:', {
            friendsCount: initialData.friendsData?.friends?.length || 0,
            hasProfileImage: !!initialData.profileImage,
            settingsLoaded: Object.keys(initialData.appSettings).length > 0
        });
        
        return initialData;
    }
    
    /**
     * 백그라운드 작업 스케줄링
     * @param {Function} task - 백그라운드 작업
     * @param {number} interval - 실행 간격 (ms)
     * @param {Object} options - 옵션
     * @returns {number} 스케줄 ID
     */
    scheduleBackground(task, interval, options = {}) {
        const { 
            immediate = false,
            maxRuns = Infinity,
            onError = (error) => console.error('백그라운드 작업 오류:', error)
        } = options;
        
        let runCount = 0;
        
        const wrappedTask = async () => {
            try {
                if (runCount >= maxRuns) {
                    clearInterval(intervalId);
                    return;
                }
                
                await this.enqueue(task, {
                    name: `Background-${runCount}`,
                    priority: -1, // 낮은 우선순위
                    timeout: 60000
                });
                
                runCount++;
            } catch (error) {
                onError(error);
            }
        };
        
        const intervalId = setInterval(wrappedTask, interval);
        
        if (immediate) {
            wrappedTask();
        }
        
        return intervalId;
    }
    
    /**
     * 리소스 집약적 작업을 청크로 분할 실행
     * @param {Array} items - 처리할 항목들
     * @param {Function} processor - 각 항목을 처리하는 함수
     * @param {Object} options - 옵션
     * @returns {Promise<Array>} 처리 결과
     */
    async processInChunks(items, processor, options = {}) {
        const {
            chunkSize = 10,
            delayBetweenChunks = 50,
            onProgress = null
        } = options;
        
        const results = [];
        const totalChunks = Math.ceil(items.length / chunkSize);
        
        for (let i = 0; i < items.length; i += chunkSize) {
            const chunk = items.slice(i, i + chunkSize);
            const chunkIndex = Math.floor(i / chunkSize);
            
            console.log(`📦 청크 처리: ${chunkIndex + 1}/${totalChunks} (${chunk.length}개 항목)`);
            
            // 청크 내 병렬 처리
            const chunkTasks = chunk.map(item => () => processor(item));
            const chunkResults = await this.executeParallel(chunkTasks, {
                concurrency: Math.min(chunkSize, 3),
                failFast: false
            });
            
            results.push(...chunkResults);
            
            // 진행률 콜백
            if (onProgress) {
                onProgress({
                    completed: chunkIndex + 1,
                    total: totalChunks,
                    percentage: Math.round(((chunkIndex + 1) / totalChunks) * 100)
                });
            }
            
            // 청크 간 지연 (UI 블록 방지)
            if (i + chunkSize < items.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenChunks));
            }
        }
        
        console.log(`✅ 청크 처리 완료: ${results.length}개 항목`);
        return results;
    }
    
    /**
     * 메트릭 업데이트
     * @param {number} executionTime - 실행 시간
     * @param {boolean} success - 성공 여부
     */
    updateMetrics(executionTime, success) {
        if (success) {
            this.metrics.completedTasks++;
        } else {
            this.metrics.failedTasks++;
        }
        
        // 이동 평균 계산
        const totalCompleted = this.metrics.completedTasks;
        this.metrics.averageExecutionTime = 
            ((this.metrics.averageExecutionTime * (totalCompleted - 1)) + executionTime) / totalCompleted;
    }
    
    /**
     * 성능 모니터링 설정
     */
    setupPerformanceMonitoring() {
        // 메모리 사용량 모니터링 (5분마다)
        setInterval(() => {
            if (performance.memory) {
                const memoryInfo = {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                };
                
                console.log('📊 메모리 사용량:', memoryInfo);
            }
        }, 5 * 60 * 1000);
        
        // 큐 상태 모니터링 (1분마다)
        setInterval(() => {
            if (this.taskQueue.length > 0 || this.runningTasks.size > 0) {
                console.log('📋 작업 큐 상태:', {
                    waiting: this.taskQueue.length,
                    running: this.runningTasks.size,
                    metrics: this.getMetrics()
                });
            }
        }, 60 * 1000);
    }
    
    /**
     * 성능 메트릭 조회
     * @returns {Object} 메트릭 정보
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.completedTasks > 0 
                ? Math.round((this.metrics.completedTasks / this.metrics.totalTasks) * 100)
                : 0,
            queueSize: this.taskQueue.length,
            runningTasks: this.runningTasks.size
        };
    }
    
    /**
     * 큐 초기화
     */
    clearQueue() {
        const cancelledCount = this.taskQueue.length;
        this.taskQueue.forEach(task => {
            task.reject(new Error('Queue cleared'));
        });
        this.taskQueue.length = 0;
        
        console.log(`🗑️ 작업 큐 초기화: ${cancelledCount}개 작업 취소`);
    }
    
    /**
     * 우선순위 작업 추가 (기존 작업들보다 우선)
     * @param {Function} task - 우선 실행할 작업
     * @param {Object} options - 옵션
     * @returns {Promise} 작업 결과
     */
    async urgent(task, options = {}) {
        return await this.enqueue(task, {
            ...options,
            priority: 999, // 최고 우선순위
            name: options.name || 'Urgent-Task'
        });
    }
}

// 전역 인스턴스 생성
window.asyncOptimizer = new AsyncOptimizer();

console.log('⚡ AsyncOptimizer 초기화 완료');