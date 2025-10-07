/**
 * 관리자 알림 기능
 * 전체 사용자에게 FCM 푸시 알림 전송
 */

class AdminNotificationManager {
    constructor() {
        this.fcmService = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // FCM Service 대기
            await this.waitForService('fcmService', 5000);
            this.fcmService = window.fcmService;
            
            // UI 요소 설정
            this.setupUI();
            
            this.isInitialized = true;
            console.log('✅ 관리자 알림 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ 관리자 알림 시스템 초기화 실패:', error);
        }
    }

    async waitForService(serviceName, timeout = 5000) {
        const startTime = Date.now();
        
        while (!window[serviceName]) {
            if (Date.now() - startTime > timeout) {
                throw new Error(`${serviceName} 로드 타임아웃`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return window[serviceName];
    }

    setupUI() {
        // 전체 알림 섹션 추가
        this.addNotificationSection();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
    }

    addNotificationSection() {
        // 기존 페이지에 알림 섹션이 있는지 확인
        if (document.getElementById('admin-notification-section')) {
            return;
        }

        // 알림 섹션 HTML
        const notificationHTML = `
            <div id="admin-notification-section" class="admin-section">
                <h2>📢 전체 알림 발송</h2>
                <div class="notification-form">
                    <div class="form-group">
                        <label for="notification-title">알림 제목</label>
                        <input type="text" id="notification-title" placeholder="알림 제목을 입력하세요" maxlength="50">
                    </div>
                    <div class="form-group">
                        <label for="notification-message">알림 내용</label>
                        <textarea id="notification-message" placeholder="알림 내용을 입력하세요" rows="4" maxlength="200"></textarea>
                        <div class="char-count">0 / 200</div>
                    </div>
                    <div class="form-group">
                        <label for="notification-type">알림 유형</label>
                        <select id="notification-type">
                            <option value="normal">일반 공지</option>
                            <option value="warning">주의 사항</option>
                            <option value="danger">중요 공지</option>
                            <option value="emergency">긴급 공지</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="notification-test-mode">
                            테스트 모드 (관리자에게만 전송)
                        </label>
                    </div>
                    <div class="button-group">
                        <button id="send-notification-btn" class="btn btn-primary">
                            <span class="btn-text">알림 전송</span>
                            <span class="btn-loading" style="display: none;">전송 중...</span>
                        </button>
                        <button id="preview-notification-btn" class="btn btn-secondary">미리보기</button>
                    </div>
                    <div id="notification-result" class="result-message" style="display: none;"></div>
                </div>
                
                <div class="notification-history">
                    <h3>📋 최근 전송 기록</h3>
                    <div id="notification-history-list">
                        <p class="no-data">전송 기록이 없습니다.</p>
                    </div>
                </div>
            </div>
        `;

        // 스타일 추가
        const style = document.createElement('style');
        style.textContent = `
            #admin-notification-section {
                margin: 20px;
                padding: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .notification-form {
                max-width: 600px;
                margin: 20px 0;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: bold;
                color: #333;
            }
            
            .form-group input[type="text"],
            .form-group textarea,
            .form-group select {
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .form-group textarea {
                resize: vertical;
                min-height: 80px;
            }
            
            .char-count {
                text-align: right;
                font-size: 12px;
                color: #666;
                margin-top: 5px;
            }
            
            .button-group {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-primary {
                background: #e74c3c;
                color: white;
            }
            
            .btn-primary:hover {
                background: #c0392b;
            }
            
            .btn-secondary {
                background: #95a5a6;
                color: white;
            }
            
            .btn-secondary:hover {
                background: #7f8c8d;
            }
            
            .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .result-message {
                margin-top: 15px;
                padding: 10px;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .result-message.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            
            .result-message.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            
            .notification-history {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #ddd;
            }
            
            .notification-history h3 {
                margin-bottom: 15px;
            }
            
            .history-item {
                padding: 10px;
                margin-bottom: 10px;
                background: #f8f9fa;
                border-radius: 4px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .history-item .time {
                font-size: 12px;
                color: #666;
            }
            
            .history-item .status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 12px;
                background: #28a745;
                color: white;
            }
            
            .no-data {
                text-align: center;
                color: #999;
                padding: 20px;
            }
        `;
        document.head.appendChild(style);

        // 적절한 위치에 섹션 추가
        const mainContent = document.querySelector('.content') || document.querySelector('main') || document.body;
        const section = document.createElement('div');
        section.innerHTML = notificationHTML;
        mainContent.appendChild(section.firstElementChild);
    }

    setupEventListeners() {
        // 전송 버튼
        const sendBtn = document.getElementById('send-notification-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendNotification());
        }

        // 미리보기 버튼
        const previewBtn = document.getElementById('preview-notification-btn');
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewNotification());
        }

        // 글자 수 카운트
        const messageTextarea = document.getElementById('notification-message');
        if (messageTextarea) {
            messageTextarea.addEventListener('input', (e) => {
                const charCount = e.target.value.length;
                const charCountEl = e.target.parentElement.querySelector('.char-count');
                if (charCountEl) {
                    charCountEl.textContent = `${charCount} / 200`;
                }
            });
        }
    }

    async sendNotification() {
        const title = document.getElementById('notification-title').value.trim();
        const message = document.getElementById('notification-message').value.trim();
        const type = document.getElementById('notification-type').value;
        const isTestMode = document.getElementById('notification-test-mode').checked;

        // 유효성 검사
        if (!title) {
            this.showResult('알림 제목을 입력해주세요.', 'error');
            return;
        }

        if (!message) {
            this.showResult('알림 내용을 입력해주세요.', 'error');
            return;
        }

        // 확인 대화상자
        const targetText = isTestMode ? '관리자에게만' : '모든 사용자에게';
        const confirmed = confirm(`${targetText} 알림을 전송하시겠습니까?\n\n제목: ${title}\n내용: ${message}`);
        
        if (!confirmed) {
            return;
        }

        // 버튼 상태 변경
        const sendBtn = document.getElementById('send-notification-btn');
        const btnText = sendBtn.querySelector('.btn-text');
        const btnLoading = sendBtn.querySelector('.btn-loading');
        
        sendBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';

        try {
            let result;
            
            // Firebase Functions를 통한 알림 전송
            const response = await fetch(window.fcmEndpoints?.sendBroadcastNotification || 'https://us-central1-lonely-care-app.cloudfunctions.net/sendBroadcastNotification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: title,
                    body: message,
                    type: 'admin',
                    alertLevel: type,
                    testMode: isTestMode
                })
            });

            if (response.ok) {
                result = await response.json();
                
                // 결과 표시
                if (result.successCount > 0) {
                    this.showResult(
                        `✅ 알림 전송 완료! (성공: ${result.successCount}명, 실패: ${result.failureCount}명)`,
                        'success'
                    );
                    
                    // 기록 추가
                    this.addToHistory(title, message, {
                        success: result.successCount,
                        total: result.targetCount || result.successCount + result.failureCount
                    });
                    
                    // 폼 초기화
                    document.getElementById('notification-title').value = '';
                    document.getElementById('notification-message').value = '';
                    document.querySelector('.char-count').textContent = '0 / 200';
                } else {
                    this.showResult(
                        `❌ 알림 전송 실패. 수신 가능한 사용자가 없습니다.`,
                        'error'
                    );
                }
            } else {
                const errorText = await response.text();
                console.error('알림 전송 API 오류:', errorText);
                this.showResult(
                    `❌ 서버 오류로 전송 실패. 다시 시도해주세요.`,
                    'error'
                );
            }

        } catch (error) {
            console.error('알림 전송 오류:', error);
            this.showResult(
                `❌ 오류: ${error.message}`,
                'error'
            );
        } finally {
            // 버튼 상태 복원
            sendBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    previewNotification() {
        const title = document.getElementById('notification-title').value.trim() || '알림 제목';
        const message = document.getElementById('notification-message').value.trim() || '알림 내용';
        const type = document.getElementById('notification-type').value;

        // 브라우저 알림으로 미리보기
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/lonely-care/icon.png',
                badge: '/lonely-care/icon.png',
                tag: 'preview'
            });
        } else {
            // 팝업으로 미리보기
            alert(`[미리보기]\n\n제목: ${title}\n내용: ${message}\n유형: ${type}`);
        }
    }

    showResult(message, type) {
        const resultEl = document.getElementById('notification-result');
        if (resultEl) {
            resultEl.textContent = message;
            resultEl.className = `result-message ${type}`;
            resultEl.style.display = 'block';

            // 5초 후 자동 숨김
            setTimeout(() => {
                resultEl.style.display = 'none';
            }, 5000);
        }
    }

    addToHistory(title, message, result) {
        const historyList = document.getElementById('notification-history-list');
        if (!historyList) return;

        // 기존 "전송 기록이 없습니다" 메시지 제거
        const noDataEl = historyList.querySelector('.no-data');
        if (noDataEl) {
            noDataEl.remove();
        }

        // 새 기록 추가
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div>
                <strong>${title}</strong>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">${message}</div>
            </div>
            <div style="text-align: right;">
                <div class="status">${result.success}/${result.total}명</div>
                <div class="time">${new Date().toLocaleString()}</div>
            </div>
        `;

        // 최상단에 추가
        historyList.insertBefore(historyItem, historyList.firstChild);

        // 최대 10개까지만 표시
        const items = historyList.querySelectorAll('.history-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }
}

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 관리자 페이지인지 확인
    if (window.location.pathname.includes('admin')) {
        setTimeout(() => {
            window.adminNotificationManager = new AdminNotificationManager();
            console.log('✅ 관리자 알림 시스템 로드 완료');
        }, 1500);
    }
});

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminNotificationManager;
}