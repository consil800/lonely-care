package com.lonelycare.app;

import android.content.Context;
import android.util.Log;
import android.os.Handler;
import com.kakao.sdk.common.KakaoSdk;
import com.kakao.sdk.user.UserApiClient;
import com.kakao.sdk.user.model.User;
import kotlin.Unit;

public class KakaoLoginManager {
    private static final String TAG = "KakaoLoginManager";
    private static final String KAKAO_NATIVE_KEY = "4c6c86023ea810f377103a07f7b3fde5";
    
    private Context context;
    private MainActivity activity;
    
    public KakaoLoginManager(Context context, MainActivity activity) {
        this.context = context;
        this.activity = activity;
        initializeKakao();
    }
    
    private void initializeKakao() {
        try {
            // 카카오 SDK 초기화
            KakaoSdk.init(context, KAKAO_NATIVE_KEY);
            Log.d(TAG, "카카오 SDK 초기화 완료");
        } catch (Exception e) {
            Log.e(TAG, "카카오 SDK 초기화 실패: " + e.getMessage());
        }
    }
    
    public void login() {
        Log.d(TAG, "🚨 === 생명구조 시스템 카카오 로그인 시작 ===");
        Log.d(TAG, "카카오 네이티브 키: " + KAKAO_NATIVE_KEY);
        
        // 🚨 생명구조 시스템: JavaScript로 즉시 시작 알림
        notifyJavaScript(
            "console.log('🚨 생명구조 시스템: AndroidBridge 네이티브 로그인 시작됨');" +
            "console.log('카카오 네이티브 키: " + KAKAO_NATIVE_KEY + "');"
        );
        
        try {
            // 🚨 생명구조 시스템: 카카오 SDK 상태 검증
            if (UserApiClient.getInstance() == null) {
                throw new Exception("카카오 UserApiClient가 null입니다 - SDK 초기화 실패");
            }
            
            // 카카오톡 설치 여부 확인 후 로그인
            boolean isKakaoTalkAvailable = UserApiClient.getInstance().isKakaoTalkLoginAvailable(context);
            Log.d(TAG, "카카오톡 설치 여부: " + isKakaoTalkAvailable);
            
            // 🚨 생명구조 시스템: 상세 상태를 JavaScript로 전송
            notifyJavaScript(
                "console.log('🔍 카카오톡 설치 여부: " + isKakaoTalkAvailable + "');" +
                "console.log('🔍 Context 상태: " + (context != null ? "정상" : "null") + "');" +
                "console.log('🔍 Activity 상태: " + (activity != null ? "정상" : "null") + "');"
            );
            
            if (isKakaoTalkAvailable) {
                Log.d(TAG, "✅ 카카오톡으로 로그인 시도");
                notifyJavaScript("console.log('✅ 카카오톡으로 로그인 시도 중...');");
                loginWithKakaoTalk();
            } else {
                Log.d(TAG, "✅ 카카오계정으로 로그인 시도 (카카오톡 미설치)");
                notifyJavaScript("console.log('✅ 카카오계정으로 로그인 시도 중... (카카오톡 미설치)');");
                loginWithKakaoAccount();
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ 카카오 로그인 초기 오류: " + e.getMessage());
            Log.e(TAG, "예외 스택트레이스: ", e);
            
            // 🚨 생명구조 시스템: 상세 오류를 JavaScript로 전송
            String errorDetail = "카카오 로그인 초기 오류: " + e.getMessage() + 
                               " (클래스: " + e.getClass().getSimpleName() + ")";
            notifyJavaScript(
                "console.error('🚨 생명구조 시스템: " + errorDetail.replace("'", "\\'") + "');" +
                "console.error('🔄 3초 내 웹 OAuth로 자동 전환 예정');"
            );
            
            notifyLoginError(errorDetail);
        }
    }
    
    private void loginWithKakaoTalk() {
        Log.d(TAG, "=== 카카오톡 로그인 함수 진입 ===");
        UserApiClient.getInstance().loginWithKakaoTalk(context, (token, error) -> {
            if (error != null) {
                Log.e(TAG, "❌ 카카오톡 로그인 실패: " + error.getMessage());
                Log.e(TAG, "오류 코드: " + error.getClass().getSimpleName());
                // 카카오톡 로그인 실패 시 카카오계정으로 로그인 시도
                Log.d(TAG, "🔄 카카오계정 로그인으로 대체 시도");
                loginWithKakaoAccount();
            } else if (token != null) {
                Log.d(TAG, "✅ 카카오톡 로그인 성공!");
                Log.d(TAG, "액세스 토큰 존재: " + (token.getAccessToken() != null));
                getUserInfo();
            } else {
                Log.e(TAG, "❌ 카카오톡 로그인 - 토큰과 에러가 모두 null");
                loginWithKakaoAccount();
            }
            return Unit.INSTANCE;
        });
    }
    
    private void loginWithKakaoAccount() {
        Log.d(TAG, "=== 카카오계정 로그인 함수 진입 ===");
        UserApiClient.getInstance().loginWithKakaoAccount(context, (token, error) -> {
            if (error != null) {
                Log.e(TAG, "❌ 카카오계정 로그인 실패: " + error.getMessage());
                Log.e(TAG, "오류 코드: " + error.getClass().getSimpleName());
                // 사용자가 로그인을 취소한 경우는 에러 메시지를 표시하지 않음
                if (!error.getMessage().contains("user cancelled") && 
                    !error.getMessage().contains("KakaoTalk login has been canceled")) {
                    Log.e(TAG, "🚨 최종 로그인 실패 - JavaScript로 에러 전송");
                    notifyLoginError("카카오 로그인에 실패했습니다: " + error.getMessage());
                } else {
                    Log.d(TAG, "사용자가 로그인을 취소함 - 에러 알림 없음");
                }
            } else if (token != null) {
                Log.d(TAG, "✅ 카카오계정 로그인 성공!");
                Log.d(TAG, "액세스 토큰 존재: " + (token.getAccessToken() != null));
                getUserInfo();
            } else {
                Log.e(TAG, "❌ 카카오계정 로그인 - 토큰과 에러가 모두 null");
                notifyLoginError("카카오 로그인에서 알 수 없는 오류가 발생했습니다");
            }
            return Unit.INSTANCE;
        });
    }
    
    public void getUserInfo() {
        UserApiClient.getInstance().me((user, error) -> {
            if (error != null) {
                Log.e(TAG, "사용자 정보 요청 실패: " + error.getMessage());
                notifyLoginError("사용자 정보를 가져올 수 없습니다: " + error.getMessage());
            } else if (user != null) {
                Log.d(TAG, "사용자 정보 요청 성공");
                processUserInfo(user);
            }
            return Unit.INSTANCE;
        });
    }
    
    private void processUserInfo(User user) {
        try {
            String userId = String.valueOf(user.getId());
            String nickname = user.getKakaoAccount() != null && 
                            user.getKakaoAccount().getProfile() != null ? 
                            user.getKakaoAccount().getProfile().getNickname() : "카카오 사용자";
            String email = user.getKakaoAccount() != null ? 
                          user.getKakaoAccount().getEmail() : "";
            String profileImage = user.getKakaoAccount() != null && 
                                user.getKakaoAccount().getProfile() != null ? 
                                user.getKakaoAccount().getProfile().getProfileImageUrl() : "";
            
            Log.d(TAG, "🚨 생명구조 시스템: 사용자 정보 처리 시작 - ID: " + userId + ", 닉네임: " + nickname);
            
            // 🚨 생명구조 시스템: 안전한 JavaScript 처리
            activity.runOnUiThread(() -> {
                Handler handler = new Handler();
                handler.postDelayed(() -> {
                    // 🚨 1단계: 안전한 JSON 객체 생성 (특수문자 완전 이스케이프)
                    String safeUserId = escapeJavaScript(userId);
                    String safeNickname = escapeJavaScript(nickname);
                    String safeEmail = escapeJavaScript(email);
                    String safeProfileImage = escapeJavaScript(profileImage);
                    
                    Log.d(TAG, "🔐 생명구조 시스템: 안전한 사용자 데이터 생성 완료");
                    
                    // 🚨 2단계: 단순하고 안전한 JavaScript 실행 (긴 코드 분할)
                    executeJavaScriptStep1(safeUserId, safeNickname, safeEmail, safeProfileImage);
                    
                }, 500); // 0.5초 지연으로 안정성 확보
            });
        } catch (Exception e) {
            Log.e(TAG, "🚨 생명구조 시스템: 사용자 정보 처리 중 오류: " + e.getMessage());
            Log.e(TAG, "스택 트레이스: ", e);
            notifyLoginError("사용자 정보 처리 중 오류가 발생했습니다");
        }
    }
    
    // 🚨 생명구조 시스템: JavaScript 특수문자 안전 이스케이프
    private String escapeJavaScript(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\")
                   .replace("'", "\\'")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
    
    // 🚨 생명구조 시스템: 1단계 - 기본 로그인 처리 (kakao_id 필드 추가)
    private void executeJavaScriptStep1(String userId, String nickname, String email, String profileImage) {
        String jsCode1 = 
            "console.log('🚨 생명구조 시스템: 카카오 로그인 성공 처리 시작');" +
            "window.kakaoUserInfo = {" +  // 🚨 중요: window 객체에 저장하여 전역 접근 가능
            "  id: '" + userId + "'," +
            "  kakao_id: '" + userId + "'," +  // 🚨 중요: index.html 검증을 위한 kakao_id 필드 추가
            "  kakaoId: '" + userId + "'," +   // 🚨 중요: 호환성을 위한 kakaoId 필드도 추가
            "  username: 'kakao_" + userId + "'," +
            "  name: '" + nickname + "'," +
            "  nickname: '" + nickname + "'," +
            "  email: '" + email + "'," +
            "  profile_image: '" + profileImage + "'," +
            "  provider: 'kakao'" +
            "};" +
            "console.log('✅ 사용자 정보 객체 생성 완료 (kakao_id 포함): ' + JSON.stringify(window.kakaoUserInfo));";
        
        activity.webView.evaluateJavascript(jsCode1, result -> {
            Log.d(TAG, "🚨 생명구조 1단계 JavaScript 실행 완료 (kakao_id 포함)");
            // 2단계 실행
            executeJavaScriptStep2();
        });
    }
    
    // 🚨 생명구조 시스템: 2단계 - localStorage 저장 (ES5 완전 호환)
    private void executeJavaScriptStep2() {
        String jsCode2 = 
            "localStorage.setItem('currentUser', JSON.stringify(window.kakaoUserInfo));" +
            "localStorage.setItem('isLoggedIn', 'true');" +
            "console.log('OK');";
        
        activity.webView.evaluateJavascript(jsCode2, result -> {
            Log.d(TAG, "🚨 생명구조 2단계 완료");
            // 3단계 실행
            executeJavaScriptStep3();
        });
    }
    
    // 🚨 생명구조 시스템: 3단계 - 콜백 실행 (ES5 초간단)
    private void executeJavaScriptStep3() {
        String jsCode3 = 
            "if (window._kakaoNativeLoginTimeout) clearTimeout(window._kakaoNativeLoginTimeout);" +
            "if (window.onKakaoLoginSuccess) window.onKakaoLoginSuccess(window.kakaoUserInfo);" +
            "console.log('Done');";
        
        activity.webView.evaluateJavascript(jsCode3, result -> {
            Log.d(TAG, "🎉 생명구조 3단계 완료");
        });
    }
    
    // 🚨 생명구조 시스템: 최종 단계 - 상태 업데이트 (초간단)
    private void executeFinalStep() {
        String finalJs = "console.log('Login completed');";
        activity.webView.evaluateJavascript(finalJs, result -> {
            Log.d(TAG, "🎉 생명구조 시스템: 카카오 로그인 완료");
        });
    }
    
    private void notifyLoginError(String errorMessage) {
        Log.e(TAG, "JavaScript로 로그인 오류 전송: " + errorMessage);
        activity.runOnUiThread(() -> {
            String jsCode = String.format(
                "console.error('🚨 생명구조 시스템: AndroidBridge 로그인 오류 - %s');" +
                "if (window.onKakaoLoginError) { " +
                "  console.log('✅ onKakaoLoginError 콜백 실행');" +
                "  window.onKakaoLoginError('%s'); " +
                "} else {" +
                "  console.warn('⚠️ onKakaoLoginError 콜백이 없습니다');" +
                "}",
                errorMessage.replace("'", "\\'"),
                errorMessage.replace("'", "\\'")
            );
            
            activity.webView.evaluateJavascript(jsCode, null);
        });
    }
    
    // 🚨 생명구조 시스템: JavaScript 통신 헬퍼 메서드 추가
    private void notifyJavaScript(String jsCode) {
        activity.runOnUiThread(() -> {
            activity.webView.evaluateJavascript(jsCode, null);
        });
    }
    
    public void logout() {
        UserApiClient.getInstance().logout((error) -> {
            if (error != null) {
                Log.e(TAG, "카카오 로그아웃 실패: " + error.getMessage());
            } else {
                Log.d(TAG, "카카오 로그아웃 성공");
            }
            return Unit.INSTANCE;
        });
    }
    
    public void unlink() {
        UserApiClient.getInstance().unlink((error) -> {
            if (error != null) {
                Log.e(TAG, "카카오 연결 끊기 실패: " + error.getMessage());
            } else {
                Log.d(TAG, "카카오 연결 끊기 성공");
            }
            return Unit.INSTANCE;
        });
    }
}