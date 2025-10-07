/**
 * 긴급 임시 로그인 시스템 - 생명 구조를 위한 즉시 접근 보장
 * 카카오 로그인 문제 해결 전까지 사용할 임시 시스템
 */

class EmergencyLogin {
    constructor() {
        this.isEnabled = true; // 긴급 상황이므로 기본 활성화
        console.log('🚨 긴급 임시 로그인 시스템 초기화 - 생명 구조 우선');
    }

    /**
     * 긴급 임시 로그인 UI 생성
     */
    createEmergencyLoginUI() {
        const emergencyContainer = document.createElement('div');
        emergencyContainer.id = 'emergency-login-container';
        emergencyContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        emergencyContainer.innerHTML = `
            <div style="
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                max-width: 400px;
                width: 90%;
                text-align: center;
            ">
                <div style="
                    background: #FF6B6B;
                    color: white;
                    padding: 15px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    font-weight: bold;
                    font-size: 16px;
                ">
                    🚨 긴급 접근 모드
                </div>
                
                <h2 style="
                    color: #2C3E50;
                    margin-bottom: 10px;
                    font-size: 24px;
                ">Lonely Care</h2>
                
                <p style="
                    color: #7F8C8D;
                    margin-bottom: 30px;
                    line-height: 1.6;
                ">
                    현재 카카오 로그인에 문제가 있어 임시 로그인을 제공합니다.<br>
                    <strong>생명을 구하는 서비스이므로 즉시 접근이 가능합니다.</strong>
                </p>

                <form id="emergency-login-form">
                    <input 
                        type="text" 
                        id="emergency-name" 
                        placeholder="이름을 입력하세요"
                        required
                        style="
                            width: 100%;
                            padding: 15px;
                            border: 2px solid #E0E0E0;
                            border-radius: 10px;
                            font-size: 16px;
                            margin-bottom: 15px;
                            box-sizing: border-box;
                        "
                    />
                    
                    <input 
                        type="tel" 
                        id="emergency-phone" 
                        placeholder="전화번호 (010-1234-5678)"
                        required
                        style="
                            width: 100%;
                            padding: 15px;
                            border: 2px solid #E0E0E0;
                            border-radius: 10px;
                            font-size: 16px;
                            margin-bottom: 20px;
                            box-sizing: border-box;
                        "
                    />

                    <button 
                        type="submit"
                        style="
                            width: 100%;
                            padding: 15px;
                            background: #27AE60;
                            color: white;
                            border: none;
                            border-radius: 10px;
                            font-size: 18px;
                            font-weight: bold;
                            cursor: pointer;
                            transition: background 0.3s;
                        "
                        onmouseover="this.style.background='#229954'"
                        onmouseout="this.style.background='#27AE60'"
                    >
                        🛡️ 긴급 접속하기
                    </button>
                </form>

                <div style="
                    margin-top: 20px;
                    padding: 15px;
                    background: #FFF3CD;
                    border-radius: 10px;
                    color: #856404;
                    font-size: 14px;
                ">
                    ⚠️ 임시 계정입니다. 카카오 로그인 복구 후 정식 계정으로 전환 가능합니다.
                </div>

                <div style="
                    margin-top: 15px;
                    font-size: 12px;
                    color: #95A5A6;
                ">
                    고독사 방지를 위한 생명안전 서비스
                </div>
            </div>
        `;

        return emergencyContainer;
    }

    /**
     * 긴급 로그인 시스템 활성화
     */
    async activate() {
        console.log('🚨 긴급 로그인 시스템 활성화 중...');
        
        // 기존 로그인 컨테이너 숨기기
        const loginContainer = document.getElementById('loginContainer');
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }

        // 긴급 로그인 UI 생성
        const emergencyUI = this.createEmergencyLoginUI();
        document.body.appendChild(emergencyUI);

        // 폼 이벤트 리스너 추가
        const form = document.getElementById('emergency-login-form');
        form.addEventListener('submit', (e) => this.handleEmergencyLogin(e));

        console.log('✅ 긴급 로그인 UI 표시 완료');
    }

    /**
     * 긴급 로그인 처리
     */
    async handleEmergencyLogin(event) {
        event.preventDefault();
        
        const name = document.getElementById('emergency-name').value.trim();
        const phone = document.getElementById('emergency-phone').value.trim();

        if (!name || !phone) {
            alert('이름과 전화번호를 모두 입력해주세요.');
            return;
        }

        try {
            console.log('🚨 긴급 로그인 처리 시작:', { name, phone });
            
            // 임시 사용자 ID 생성 (전화번호 기반)
            const emergencyUserId = 'emergency_' + phone.replace(/[^0-9]/g, '');
            
            // 임시 사용자 정보 생성
            const emergencyUserInfo = {
                id: emergencyUserId,
                name: name,
                nickname: name,
                phone: phone,
                provider: 'emergency',
                is_emergency_user: true,
                emergency_contact1: phone,
                emergency_name1: name,
                created_at: new Date().toISOString(),
                profile_image: '',
                email: `${emergencyUserId}@emergency.lonely-care.com`
            };

            console.log('📝 긴급 사용자 정보 생성:', emergencyUserInfo);

            // Firebase에 임시 사용자 저장
            if (window.db) {
                try {
                    await window.db.collection('users').doc(emergencyUserId).set(emergencyUserInfo);
                    console.log('✅ Firebase에 긴급 사용자 저장 완료');
                } catch (error) {
                    console.warn('⚠️ Firebase 저장 실패 (로컬 저장으로 대체):', error);
                }
            }

            // 로컬 스토리지에 사용자 정보 저장
            localStorage.setItem('currentUser', JSON.stringify(emergencyUserInfo));
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('isEmergencyLogin', 'true');

            console.log('💾 로컬 스토리지 저장 완료');

            // 로그인 성공 처리
            this.completeEmergencyLogin(emergencyUserInfo);

        } catch (error) {
            console.error('❌ 긴급 로그인 처리 중 오류:', error);
            alert('긴급 로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    /**
     * 긴급 로그인 완료 처리
     */
    completeEmergencyLogin(userInfo) {
        console.log('🎉 긴급 로그인 완료:', userInfo.name);

        // 긴급 로그인 UI 제거
        const emergencyContainer = document.getElementById('emergency-login-container');
        if (emergencyContainer) {
            emergencyContainer.style.display = 'none';
        }

        // 메인 auth 시스템에 사용자 정보 전달
        if (window.auth && typeof window.auth.processKakaoUser === 'function') {
            window.auth.processKakaoUser(userInfo);
        }

        // 성공 알림 표시
        this.showSuccessMessage(userInfo.name);

        // 메인 화면으로 전환
        setTimeout(() => {
            if (typeof showMainScreen === 'function') {
                showMainScreen();
            } else if (typeof checkLoginStatus === 'function') {
                checkLoginStatus();
            } else {
                // 페이지 새로고침으로 로그인 상태 적용
                window.location.reload();
            }
        }, 2000);
    }

    /**
     * 성공 메시지 표시
     */
    showSuccessMessage(name) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #27AE60;
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 18px;
            font-weight: bold;
            z-index: 10001;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            text-align: center;
        `;
        
        successDiv.innerHTML = `
            <div>🎉 환영합니다, ${name}님!</div>
            <div style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
                Lonely Care 생명안전 서비스에 접속되었습니다.
            </div>
        `;
        
        document.body.appendChild(successDiv);
        
        // 2초 후 제거
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 2000);
    }

    /**
     * 긴급 로그인 해제 (정식 로그인으로 복구 시)
     */
    deactivate() {
        const emergencyContainer = document.getElementById('emergency-login-container');
        if (emergencyContainer) {
            emergencyContainer.remove();
        }
        
        localStorage.removeItem('isEmergencyLogin');
        console.log('✅ 긴급 로그인 시스템 해제됨');
    }

    /**
     * 현재 긴급 로그인 상태인지 확인
     */
    isEmergencyLoginActive() {
        return localStorage.getItem('isEmergencyLogin') === 'true';
    }
}

// 전역 객체로 등록
window.emergencyLogin = new EmergencyLogin();
console.log('🚨 긴급 로그인 시스템 준비 완료');