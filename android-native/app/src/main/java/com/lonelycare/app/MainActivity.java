package com.lonelycare.app;

import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.webkit.WebChromeClient;
import android.webkit.ConsoleMessage;
import android.util.Log;
import android.webkit.JsResult;
import android.content.DialogInterface;
import androidx.appcompat.app.AlertDialog;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import android.util.Base64;
import android.content.IntentFilter;
import android.os.Build;
import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import android.Manifest;
import android.net.Uri;
import android.webkit.ValueCallback;
import android.app.Activity;
// Firebase FCM 생명구조 시스템 import
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import androidx.annotation.NonNull;

public class MainActivity extends AppCompatActivity {
    public WebView webView;
    private AndroidBridge androidBridge;
    public KakaoLoginManager kakaoLoginManager;
    private BroadcastReceiver motionReceiver;
    private BroadcastReceiver heartbeatReceiver;
    private BroadcastReceiver checkHeartbeatReceiver;
    private BroadcastReceiver sessionRefreshReceiver;
    
    // 파일 업로드를 위한 변수들
    private ValueCallback<Uri[]> filePathCallback;
    public static final int FILE_CHOOSER_RESULT_CODE = 10000;
    
    // 생명구조 시스템: 현재 인스턴스 참조 (FCM 서비스용)
    private static MainActivity currentInstance;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // 생명구조 시스템: 현재 인스턴스 설정
        currentInstance = this;

        webView = findViewById(R.id.webview);
        androidBridge = new AndroidBridge(this, this);
        kakaoLoginManager = new KakaoLoginManager(this, this);
        
        // 카카오 해시키 로그 출력
        printHashKey();
        
        // Android 13+ 알림 권한 요청
        requestNotificationPermission();
        
        // 움직임 감지 서비스 시작
        startMotionDetectionService();
        
        // 하트비트 서비스 시작
        startHeartbeatService();
        
        // 움직임 감지 브로드캐스트 리시버 등록
        setupMotionReceiver();
        
        // 하트비트 브로드캐스트 리시버 등록
        setupHeartbeatReceivers();
        
        // 세션 갱신 브로드캐스트 리시버 등록
        setupSessionRefreshReceiver();
        
        // 생명구조 시스템: FCM 토큰 초기화
        initializeFCMToken();
        
        WebSettings webSettings = webView.getSettings();
        
        // WebView 설정
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        
        // 팝업 창 지원 활성화 (카카오 OAuth 팝업용)
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setSupportMultipleWindows(true);
        
        // 🚨 CRITICAL FIX: WebView 캐시 완전 무효화 (JavaScript 파일 업데이트 반영을 위해)
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        
        // 기존 캐시 완전 삭제
        webView.clearCache(true);
        webView.clearHistory();
        webView.clearFormData();
        
        // 쿠키도 삭제 (추가 안전장치)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            android.webkit.CookieManager.getInstance().removeAllCookies(null);
            android.webkit.CookieManager.getInstance().flush();
        }
        
        Log.d("WebView", "🔥 CACHE CLEARED: 모든 WebView 캐시 삭제 완료");
        
        // WebView 디버깅 강제 활성화
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
        
        // JavaScript 인터페이스 추가
        webView.addJavascriptInterface(androidBridge, "AndroidBridge");
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Log.d("WebView", "🚫🚫🚫🚫🚫 URL 로딩 시도 감지: " + url);
                
                // 카카오 OAuth 콜백 처리 (네이티브 키 스킴)
                if (url.startsWith("kakao4c6c86023ea810f377103a07f7b3fde5://")) {
                    Log.d("WebView", "🎯 카카오 OAuth 콜백 감지: " + url);
                    
                    // URL에서 인증 코드 추출
                    Uri uri = Uri.parse(url);
                    String code = uri.getQueryParameter("code");
                    String error = uri.getQueryParameter("error");
                    
                    if (code != null) {
                        Log.d("WebView", "✅ 인증 코드 받음: " + code);
                        // JavaScript로 OAuth 콜백 처리
                        String jsCode = String.format("if(window.handleOAuthCallback) { window.handleOAuthCallback('%s'); }", code);
                        view.evaluateJavascript(jsCode, null);
                    } else if (error != null) {
                        Log.e("WebView", "❌ OAuth 에러: " + error);
                        String errorDesc = uri.getQueryParameter("error_description");
                        String jsCode = String.format("if(window.onKakaoLoginFailure) { window.onKakaoLoginFailure('%s: %s'); }", 
                                                    error, errorDesc != null ? errorDesc : "");
                        view.evaluateJavascript(jsCode, null);
                    }
                    
                    return true; // 이 URL은 WebView에서 로드하지 않음
                }
                
                // 카카오 OAuth URL 허용
                if (url.startsWith("https://kauth.kakao.com/") || 
                    url.startsWith("https://kapi.kakao.com/") ||
                    url.startsWith("https://t1.kakaocdn.net/")) {
                    Log.d("WebView", "✅ 카카오 OAuth URL 허용: " + url);
                    return false; // WebView에서 정상 처리
                }
                
                // Firebase SDK URL 허용
                if (url.startsWith("https://www.gstatic.com/firebasejs/") ||
                    url.startsWith("https://firebaseinstallations.googleapis.com/") ||
                    url.startsWith("https://firebase-api.com/") ||
                    url.contains("firebase")) {
                    Log.d("WebView", "✅ Firebase URL 허용: " + url);
                    return false; // WebView에서 정상 처리
                }
                
                // 기타 HTTPS URL은 차단 (보안상)
                if (url.startsWith("https://")) {
                    Log.d("WebView", "🚫 기타 HTTPS URL 차단: " + url);
                    return true; // 차단
                }
                
                // 🚫🚫🚫 HTTP URL도 localhost 외에는 모두 차단  
                if (url.startsWith("http://") && !url.contains("localhost") && !url.contains("127.0.0.1")) {
                    Log.d("WebView", "💀💀💀 외부 HTTP URL 완전 차단: " + url);
                    return true;
                }
                
                // 전화 걸기 스킴 처리
                if (url.startsWith("tel:")) {
                    Log.d("WebView", "전화 걸기 스킴 감지: " + url);
                    try {
                        Intent intent = new Intent(Intent.ACTION_DIAL);
                        intent.setData(Uri.parse(url));
                        startActivity(intent);
                        Log.d("WebView", "전화 앱 실행 성공: " + url);
                    } catch (Exception e) {
                        Log.e("WebView", "전화 앱 실행 실패: " + e.getMessage());
                    }
                    return true; // WebView에서 처리하지 않음
                }
                
                // 카카오 리다이렉트 스킴 처리
                if (url.startsWith("kakao")) {
                    Log.d("WebView", "카카오 리다이렉트 스킴 감지: " + url);
                    return true; // 시스템이 처리하도록 함
                }
                
                // 로컬 파일 처리
                if (url.startsWith("file://")) {
                    return false;
                }
                
                // 🚫🚫🚫 모든 외부 URL 차단됨 (위에서 이미 처리)
                Log.d("WebView", "✅ 로컬 파일만 허용: " + url);
                
                return false;
            }
            
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d("WebView", "Page finished loading: " + url);
                
                // 페이지 로드 완료 후 앱 초기화 확인
                if (url.contains("index.html") || url.equals("file:///android_asset/index.html")) {
                    view.evaluateJavascript(
                        "console.log('WebView에서 페이지 로드 완료'); " +
                        "if (typeof checkLoginStatus === 'function') { " +
                        "  console.log('로그인 상태 재확인'); " +
                        "  checkLoginStatus(); " +
                        "} else { " +
                        "  console.log('checkLoginStatus 함수 없음'); " +
                        "}", 
                        null
                    );
                }
            }
        });
        
        // WebChromeClient 추가 - JavaScript 콘솔 로그와 알림 처리, 팝업 창 지원
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                String message = consoleMessage.message();
                String sourceId = consoleMessage.sourceId();
                int lineNumber = consoleMessage.lineNumber();
                ConsoleMessage.MessageLevel level = consoleMessage.messageLevel();
                
                // 카카오 관련 오류를 특별히 강조
                if (message.contains("Kakao") || message.contains("kakao") || message.contains("Auth.login")) {
                    Log.e("🔴 Kakao Error", level + ": " + message + " at " + sourceId + ":" + lineNumber);
                }
                // 파일 로드 실패 오류도 강조
                else if (message.contains("Failed to load resource") || message.contains("404") || message.contains("favicon") || message.contains("icon.png")) {
                    Log.w("🟡 Resource Error", level + ": " + message + " at " + sourceId + ":" + lineNumber);
                }
                else {
                    Log.d("WebView Console", level + ": " + message + " at " + sourceId + ":" + lineNumber);
                }
                
                return true;
            }
            
            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("lonely-care")
                    .setMessage(message)
                    .setPositiveButton("확인", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm();
                        }
                    })
                    .setCancelable(false)
                    .create()
                    .show();
                return true;
            }
            
            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
                Log.d("WebView", "팝업 창 생성 요청 - isDialog: " + isDialog + ", isUserGesture: " + isUserGesture);
                
                // 카카오 OAuth 팝업인 경우 같은 WebView에서 처리
                WebView newWebView = new WebView(MainActivity.this);
                WebSettings newWebSettings = newWebView.getSettings();
                newWebSettings.setJavaScriptEnabled(true);
                newWebSettings.setDomStorageEnabled(true);
                newWebSettings.setAllowFileAccess(true);
                newWebSettings.setAllowContentAccess(true);
                
                newWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView view, String url) {
                        Log.d("WebView Popup", "팝업에서 URL 로딩: " + url);
                        
                        // oauth.html 콜백 페이지는 원래 WebView에서 처리
                        if (url.contains("oauth.html")) {
                            Log.d("WebView Popup", "OAuth 콜백을 메인 WebView로 전달: " + url);
                            webView.post(() -> webView.loadUrl(url));
                            return true;
                        }
                        
                        return false;
                    }
                });
                
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(newWebView);
                resultMsg.sendToTarget();
                
                Log.d("WebView", "팝업 창 생성 완료");
                return true;
            }
            
            // 파일 업로드를 위한 핵심 메서드 추가
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                Log.d("WebView", "파일 선택기 요청됨");
                
                // 이전 콜백이 있다면 취소
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;
                
                // 파일 선택 Intent 생성
                Intent intent = fileChooserParams.createIntent();
                
                try {
                    // 이미지만 선택하도록 제한
                    intent.setType("image/*");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg", "image/jpg", "image/png", "image/gif"});
                    
                    Log.d("WebView", "파일 선택 액티비티 시작");
                    startActivityForResult(intent, FILE_CHOOSER_RESULT_CODE);
                    
                } catch (Exception e) {
                    Log.e("WebView", "파일 선택기 시작 실패: " + e.getMessage());
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                
                return true;
            }
        });
        
        // assets 폴더의 index.html 로드
        webView.loadUrl("file:///android_asset/index.html");
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        Log.d("MainActivity", "onResume - 앱이 포그라운드로 전환됨");
        
        // 앱이 포그라운드로 올 때 알림 배지 자동 클리어
        if (androidBridge != null) {
            androidBridge.onAppForeground();
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Log.d("MainActivity", "onNewIntent 호출됨");
        setIntent(intent); // 새 Intent 설정

        // 1. 카카오 OAuth 리다이렉트 처리
        if (intent != null && intent.getData() != null) {
            Uri data = intent.getData();
            Log.d("MainActivity", "Intent 데이터: " + data.toString());

            if (data.getScheme() != null && data.getScheme().startsWith("kakao")) {
                Log.d("MainActivity", "카카오 OAuth 리다이렉트 감지: " + data.getScheme());

                // authorization_code 추출
                String authCode = data.getQueryParameter("code");
                String error = data.getQueryParameter("error");

                if (error != null) {
                    Log.e("MainActivity", "OAuth 에러 발생: " + error);
                    // WebView에 에러 전달
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (window.onKakaoLoginFailure) { " +
                            "  window.onKakaoLoginFailure('" + error + "'); " +
                            "}", null);
                    });
                    return;
                }

                if (authCode != null) {
                    Log.d("MainActivity", "✅ 인증 코드 수신: " + authCode.substring(0, Math.min(10, authCode.length())) + "...");

                    // WebView에 인증 코드 전달하여 토큰 교환 진행
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (window.handleOAuthCallback) { " +
                            "  window.handleOAuthCallback('" + authCode + "'); " +
                            "} else { " +
                            "  console.log('❌ handleOAuthCallback 함수 없음'); " +
                            "}", null);
                    });
                } else {
                    Log.e("MainActivity", "❌ 인증 코드가 없습니다");
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (window.onKakaoLoginFailure) { " +
                            "  window.onKakaoLoginFailure('인증 코드가 없습니다'); " +
                            "}", null);
                    });
                }
            }
        }

        // 2. FCM 알림에서 온 인텐트 처리
        if (intent.getBooleanExtra("from_notification", false)) {
            String friendId = intent.getStringExtra("friend_id");
            String alertLevel = intent.getStringExtra("alert_level");
            String action = intent.getStringExtra("action");

            Log.d("LifeSaverFCM", String.format("📱 알림에서 앱 열림: friendId=%s, level=%s, action=%s",
                friendId, alertLevel, action));

            // WebView로 알림 정보 전달
            if (webView != null && friendId != null) {
                runOnUiThread(() -> {
                    String jsCode = String.format(
                        "if (window.onNotificationOpened) { " +
                        "  window.onNotificationOpened({friendId:'%s', alertLevel:'%s', action:'%s'}); " +
                        "} else { " +
                        "  console.log('📱 알림에서 앱 열림:', {friendId:'%s', alertLevel:'%s', action:'%s'}); " +
                        "}",
                        friendId, alertLevel != null ? alertLevel : "",
                        action != null ? action : "",
                        friendId, alertLevel != null ? alertLevel : "",
                        action != null ? action : ""
                    );

                    webView.evaluateJavascript(jsCode, null);
                });
            }

            // 119 신고 액션 처리
            if ("call_119".equals(action)) {
                handle119CallAction(intent.getStringExtra("friend_name"));
            }
        }
    }
    
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
    
    // 카카오 해시키 출력
    private void printHashKey() {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
            for (Signature signature : info.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                String hashKey = Base64.encodeToString(md.digest(), Base64.DEFAULT);
                Log.d("KakaoHashKey", "카카오 해시키: " + hashKey);
                Log.d("KakaoHashKey", "패키지명: " + getPackageName());
                
                // 토스트는 제거 (로그만 유지)
            }
        } catch (PackageManager.NameNotFoundException | NoSuchAlgorithmException e) {
            Log.e("KakaoHashKey", "해시키 생성 실패: " + e.getMessage());
        }
    }
    
    // 움직임 감지 서비스 시작
    private void startMotionDetectionService() {
        // 권한 확인
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACTIVITY_RECOGNITION}, 100);
                return;
            }
        }
        
        Intent serviceIntent = new Intent(this, MotionDetectionService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
    
    // 움직임 감지 브로드캐스트 리시버 설정
    private void setupMotionReceiver() {
        motionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonelycare.MOTION_DETECTED".equals(intent.getAction())) {
                    long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());
                    
                    // WebView에 움직임 알림
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (typeof updateActivityFromSensor === 'function') { " +
                            "  updateActivityFromSensor(" + timestamp + "); " +
                            "}", null);
                    });
                }
            }
        };
        
        IntentFilter filter = new IntentFilter("com.lonelycare.MOTION_DETECTED");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(motionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(motionReceiver, filter);
        }
    }
    
    // 하트비트 서비스 시작
    private void startHeartbeatService() {
        Intent serviceIntent = new Intent(this, HeartbeatService.class);
        startService(serviceIntent);
    }
    
    // 하트비트 브로드캐스트 리시버들 설정
    private void setupHeartbeatReceivers() {
        // 하트비트 전송 리시버
        heartbeatReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonelycare.SEND_HEARTBEAT".equals(intent.getAction())) {
                    String pairId = intent.getStringExtra("pair_id");
                    long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());
                    
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (typeof sendHeartbeatToPair === 'function') { " +
                            "  sendHeartbeatToPair('" + pairId + "', " + timestamp + "); " +
                            "}", null);
                    });
                }
            }
        };
        
        // 하트비트 체크 리시버
        checkHeartbeatReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonelycare.CHECK_HEARTBEATS".equals(intent.getAction())) {
                    long timestamp = intent.getLongExtra("timestamp", System.currentTimeMillis());
                    
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (typeof checkAllHeartbeats === 'function') { " +
                            "  checkAllHeartbeats(" + timestamp + "); " +
                            "}", null);
                    });
                }
            }
        };
        
        IntentFilter heartbeatFilter = new IntentFilter("com.lonelycare.SEND_HEARTBEAT");
        IntentFilter checkFilter = new IntentFilter("com.lonelycare.CHECK_HEARTBEATS");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(heartbeatReceiver, heartbeatFilter, Context.RECEIVER_NOT_EXPORTED);
            registerReceiver(checkHeartbeatReceiver, checkFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(heartbeatReceiver, heartbeatFilter);
            registerReceiver(checkHeartbeatReceiver, checkFilter);
        }
    }
    
    // 알림 권한 요청 (Android 13+)
    // 알림 권한 요청 코드
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 101;
    
    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                Log.d("LifeSaverFCM", "🔔 Android 13+ 알림 권한 요청");
                ActivityCompat.requestPermissions(this, 
                    new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST_CODE);
            } else {
                Log.d("LifeSaverFCM", "✅ 알림 권한 이미 허용됨");
                onNotificationPermissionGranted();
            }
        } else {
            Log.d("LifeSaverFCM", "✅ Android 12 이하 - 알림 권한 자동 허용");
            onNotificationPermissionGranted();
        }
    }
    
    /**
     * 권한 요청 결과 처리 - 생명구조 시스템
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("LifeSaverFCM", "✅ 알림 권한 허용됨 - 생명구조 시스템 활성화");
                onNotificationPermissionGranted();
            } else {
                Log.w("LifeSaverFCM", "❌ 알림 권한 거부됨 - 백그라운드 알림 불가");
                showNotificationPermissionDeniedMessage();
            }
        }
    }
    
    /**
     * 알림 권한 허용 시 처리
     */
    private void onNotificationPermissionGranted() {
        Log.d("LifeSaverFCM", "🚨 생명구조 시스템: 알림 권한 확보 완료");
        
        // WebView로 권한 상태 전달
        if (webView != null) {
            runOnUiThread(() -> {
                String jsCode = 
                    "if (window.onNotificationPermissionGranted) { " +
                    "  window.onNotificationPermissionGranted(); " +
                    "} else { " +
                    "  console.log('🔔 알림 권한 허용됨'); " +
                    "}";
                
                webView.evaluateJavascript(jsCode, null);
            });
        }
    }
    
    /**
     * 알림 권한 거부 시 처리
     */
    private void showNotificationPermissionDeniedMessage() {
        // 중요한 알림이므로 사용자에게 다시 설명
        runOnUiThread(() -> {
            androidx.appcompat.app.AlertDialog dialog = new androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("🚨 생명구조 시스템 알림")
                .setMessage("친구들의 안전상태 알림을 받기 위해서는 알림 권한이 필요합니다.\n\n" +
                          "설정 > 앱 > 외롭지마 > 알림에서 권한을 허용해주세요.")
                .setPositiveButton("설정으로 이동", (dialog1, which) -> {
                    // 앱 설정 화면으로 이동
                    Intent intent = new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                })
                .setNegativeButton("나중에", null)
                .create();
            
            dialog.show();
        });
        
        // WebView로 권한 거부 상태 전달
        if (webView != null) {
            runOnUiThread(() -> {
                String jsCode = 
                    "if (window.onNotificationPermissionDenied) { " +
                    "  window.onNotificationPermissionDenied(); " +
                    "} else { " +
                    "  console.warn('❌ 알림 권한 거부됨 - 백그라운드 알림 불가'); " +
                    "}";
                
                webView.evaluateJavascript(jsCode, null);
            });
        }
    }
    
    // 세션 갱신 브로드캐스트 리시버 설정
    private void setupSessionRefreshReceiver() {
        sessionRefreshReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonelycare.SESSION_REFRESH".equals(intent.getAction())) {
                    Log.d("MainActivity", "세션 갱신 알림 수신");
                    
                    // WebView에 세션 갱신 알림
                    webView.post(() -> {
                        webView.evaluateJavascript(
                            "if (typeof refreshSessionFromBackground === 'function') { " +
                            "  refreshSessionFromBackground(); " +
                            "}", null);
                    });
                }
            }
        };
        
        IntentFilter filter = new IntentFilter("com.lonelycare.SESSION_REFRESH");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(sessionRefreshReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(sessionRefreshReceiver, filter);
        }
    }
    
    // 파일 선택 결과 처리를 위한 onActivityResult 추가
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            Log.d("WebView", "파일 선택 결과: requestCode=" + requestCode + ", resultCode=" + resultCode);
            
            Uri[] results = null;
            
            if (resultCode == Activity.RESULT_OK) {
                if (data != null) {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        Log.d("WebView", "선택된 파일: " + dataString);
                        results = new Uri[]{Uri.parse(dataString)};
                        
                        // AndroidBridge를 통해 JavaScript로 결과 전달
                        if (androidBridge != null) {
                            androidBridge.handleFileSelected(dataString);
                        }
                    }
                }
            } else {
                Log.d("WebView", "파일 선택 취소됨");
                
                // AndroidBridge를 통해 취소 알림
                if (androidBridge != null) {
                    androidBridge.handleFileSelected(null);
                }
            }
            
            // WebView 콜백 처리 (기존 방식도 유지)
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            }
        }
    }
    
    @Override
    protected void onDestroy() {
        if (motionReceiver != null) {
            unregisterReceiver(motionReceiver);
        }
        if (heartbeatReceiver != null) {
            unregisterReceiver(heartbeatReceiver);
        }
        if (checkHeartbeatReceiver != null) {
            unregisterReceiver(checkHeartbeatReceiver);
        }
        if (sessionRefreshReceiver != null) {
            unregisterReceiver(sessionRefreshReceiver);
        }
        if (androidBridge != null) {
            androidBridge.stopSensorService();
        }
        
        // 생명구조 시스템: 현재 인스턴스 정리
        currentInstance = null;
        
        super.onDestroy();
    }
    
    // ========== 생명구조 시스템 FCM 메서드들 ==========
    
    /**
     * 현재 MainActivity 인스턴스 반환 (FCM 서비스용)
     */
    public static MainActivity getCurrentInstance() {
        return currentInstance;
    }
    
    /**
     * FCM 토큰 초기화 및 WebView 전달
     */
    private void initializeFCMToken() {
        Log.d("LifeSaverFCM", "🔑 FCM 토큰 초기화 시작");
        
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(new OnCompleteListener<String>() {
                @Override
                public void onComplete(@NonNull Task<String> task) {
                    if (!task.isSuccessful()) {
                        Log.w("LifeSaverFCM", "❌ FCM 토큰 가져오기 실패", task.getException());
                        return;
                    }

                    // FCM 토큰 획득 성공
                    String token = task.getResult();
                    Log.d("LifeSaverFCM", "✅ FCM 토큰 생성 성공: " + token.substring(0, 20) + "...");
                    
                    // SharedPreferences에 저장
                    getSharedPreferences("lonely_care_prefs", MODE_PRIVATE)
                        .edit()
                        .putString("fcm_token", token)
                        .putLong("fcm_token_time", System.currentTimeMillis())
                        .apply();
                    
                    // WebView로 토큰 전달
                    sendFCMTokenToWebView(token);
                }
            });
    }
    
    /**
     * FCM 토큰을 WebView로 전달
     */
    private void sendFCMTokenToWebView(String token) {
        if (webView != null) {
            runOnUiThread(() -> {
                String jsCode = String.format(
                    "if (window.onFCMTokenReceived) { " +
                    "  window.onFCMTokenReceived('%s'); " +
                    "  console.log('🔑 Android에서 FCM 토큰 수신'); " +
                    "} else { " +
                    "  console.log('⚠️ onFCMTokenReceived 핸들러가 없음'); " +
                    "  window.androidFCMToken = '%s'; " +
                    "}",
                    token, token
                );
                
                webView.evaluateJavascript(jsCode, null);
                Log.d("LifeSaverFCM", "📤 FCM 토큰 WebView 전달 완료");
            });
        }
    }
    
    /**
     * 알림에서 앱이 열렸을 때 처리
     */
    
    /**
     * 119 신고 액션 처리
     */
    private void handle119CallAction(String friendName) {
        Log.d("LifeSaverFCM", "🚨 119 신고 액션 처리: " + friendName);
        
        // WebView로 119 신고 명령 전달
        if (webView != null) {
            runOnUiThread(() -> {
                String jsCode = String.format(
                    "if (window.handle119Emergency) { " +
                    "  window.handle119Emergency('%s'); " +
                    "} else { " +
                    "  console.log('🚨 119 신고 요청: %s'); " +
                    "  alert('119에 %s님에 대한 응급신고를 진행합니다.'); " +
                    "}",
                    friendName != null ? friendName : "친구",
                    friendName != null ? friendName : "친구",
                    friendName != null ? friendName : "친구"
                );
                
                webView.evaluateJavascript(jsCode, null);
            });
        }
    }
}