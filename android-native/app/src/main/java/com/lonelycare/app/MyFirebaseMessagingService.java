package com.lonelycare.app;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import android.util.Log;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Vibrator;
import android.content.Context;
import android.graphics.Color;

/**
 * 생명구조 시스템 FCM 메시징 서비스
 * 백그라운드에서 친구 상태 알림을 수신하여 즉시 사용자에게 전달
 * 
 * 중요: 이 서비스는 앱이 백그라운드에 있을 때도 동작하여
 * 고독사 방지를 위한 실시간 알림을 보장합니다
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {
    
    private static final String TAG = "LifeSaverFCM";
    
    // 알림 채널 ID들 - 생명구조 시스템 우선순위별
    private static final String CHANNEL_EMERGENCY = "lonely_care_emergency";    // 응급상황
    private static final String CHANNEL_DANGER = "lonely_care_danger";          // 위험상황
    private static final String CHANNEL_WARNING = "lonely_care_warning";        // 주의상황
    private static final String CHANNEL_GENERAL = "lonely_care_general";        // 일반 알림
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "🚨 생명구조 시스템: FCM 메시지 수신됨");
        
        try {
            // 메시지 데이터 추출
            String alertLevel = remoteMessage.getData().get("alert_level");
            String friendId = remoteMessage.getData().get("friend_id");
            String friendName = remoteMessage.getData().get("friend_name");
            
            // 알림 기본 정보
            String title = "알 수 없는 알림";
            String body = "친구 상태를 확인해주세요";
            
            if (remoteMessage.getNotification() != null) {
                title = remoteMessage.getNotification().getTitle();
                body = remoteMessage.getNotification().getBody();
            }
            
            Log.d(TAG, String.format("📋 알림 정보: 레벨=%s, 친구=%s, 제목=%s", 
                alertLevel, friendName, title));
            
            // 알림 표시 (생명구조 시스템 핵심)
            showLifeSavingNotification(title, body, alertLevel, friendId, friendName);
            
            // WebView로 메시지 전달 (앱이 포그라운드에 있는 경우)
            sendMessageToWebView(remoteMessage);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ FCM 메시지 처리 중 오류", e);
            
            // 오류 발생 시에도 기본 알림은 표시 (생명구조 안전장치)
            showEmergencyFallbackNotification();
        }
    }
    
    /**
     * 생명구조 시스템 핵심: 레벨별 차등화된 알림 표시
     */
    private void showLifeSavingNotification(String title, String body, String alertLevel, 
                                          String friendId, String friendName) {
        try {
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            
            // 알림 채널 생성 (Android O 이상)
            createNotificationChannels(notificationManager);
            
            // 알림 레벨에 따른 설정
            NotificationConfig config = getNotificationConfig(alertLevel);
            
            // MainActivity로 이동하는 인텐트
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("friend_id", friendId);
            intent.putExtra("alert_level", alertLevel);
            intent.putExtra("from_notification", true);
            
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            
            // 알림 빌더 생성
            NotificationCompat.Builder notificationBuilder = 
                new NotificationCompat.Builder(this, config.channelId)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(title)
                    .setContentText(body)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                    .setAutoCancel(true)
                    .setPriority(config.priority)
                    .setCategory(config.category)
                    .setContentIntent(pendingIntent)
                    .setColor(config.color);
            
            // 응급상황 특별 설정
            if ("emergency".equals(alertLevel)) {
                // 119 신고 액션 버튼 추가
                Intent call119Intent = new Intent(this, MainActivity.class);
                call119Intent.putExtra("action", "call_119");
                call119Intent.putExtra("friend_id", friendId);
                call119Intent.putExtra("friend_name", friendName);
                
                PendingIntent call119PendingIntent = PendingIntent.getActivity(this, 1, call119Intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                
                notificationBuilder.addAction(R.drawable.ic_emergency, 
                    "🚨 119 신고", call119PendingIntent);
                
                // 사용자가 직접 닫을 때까지 유지
                notificationBuilder.setOngoing(true);
                notificationBuilder.setTimeoutAfter(0); // 타임아웃 없음
            }
            
            // 진동 설정
            if (config.vibrationPattern != null) {
                notificationBuilder.setVibrate(config.vibrationPattern);
            }
            
            // 소리 설정
            if (config.soundEnabled) {
                Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                notificationBuilder.setSound(defaultSoundUri);
            }
            
            // 알림 표시
            int notificationId = generateNotificationId(friendId, alertLevel);
            notificationManager.notify(notificationId, notificationBuilder.build());
            
            Log.d(TAG, String.format("✅ %s 레벨 알림 표시 완료 (ID: %d)", alertLevel, notificationId));
            
            // 추가 진동 (응급상황)
            if ("emergency".equals(alertLevel)) {
                triggerEmergencyVibration();
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ 알림 표시 실패", e);
        }
    }
    
    /**
     * 알림 채널 생성 (Android O 이상)
     */
    private void createNotificationChannels(NotificationManager notificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // 응급 채널
            NotificationChannel emergencyChannel = new NotificationChannel(
                CHANNEL_EMERGENCY,
                "🚨 응급상황 알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            emergencyChannel.setDescription("72시간 이상 무응답 - 119 신고 필요");
            emergencyChannel.enableLights(true);
            emergencyChannel.setLightColor(Color.RED);
            emergencyChannel.enableVibration(true);
            emergencyChannel.setVibrationPattern(new long[]{0, 500, 100, 500, 100, 500, 100, 500});
            emergencyChannel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            emergencyChannel.setBypassDnd(true); // 방해금지 모드 우회
            
            // 위험 채널
            NotificationChannel dangerChannel = new NotificationChannel(
                CHANNEL_DANGER,
                "🟠 위험상황 알림",
                NotificationManager.IMPORTANCE_HIGH
            );
            dangerChannel.setDescription("48시간 이상 무응답");
            dangerChannel.enableLights(true);
            dangerChannel.setLightColor(Color.parseColor("#FF6B35"));
            dangerChannel.enableVibration(true);
            dangerChannel.setVibrationPattern(new long[]{0, 300, 100, 300, 100, 300});
            
            // 주의 채널
            NotificationChannel warningChannel = new NotificationChannel(
                CHANNEL_WARNING,
                "🟡 주의상황 알림",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            warningChannel.setDescription("24시간 이상 무응답");
            warningChannel.enableLights(true);
            warningChannel.setLightColor(Color.YELLOW);
            warningChannel.enableVibration(true);
            warningChannel.setVibrationPattern(new long[]{0, 200, 100, 200});
            
            // 일반 채널
            NotificationChannel generalChannel = new NotificationChannel(
                CHANNEL_GENERAL,
                "📱 일반 알림",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            generalChannel.setDescription("시스템 알림");
            
            // 채널 등록
            notificationManager.createNotificationChannel(emergencyChannel);
            notificationManager.createNotificationChannel(dangerChannel);
            notificationManager.createNotificationChannel(warningChannel);
            notificationManager.createNotificationChannel(generalChannel);
            
            Log.d(TAG, "✅ 생명구조 시스템 알림 채널 생성 완료");
        }
    }
    
    /**
     * 알림 레벨별 설정 반환
     */
    private NotificationConfig getNotificationConfig(String alertLevel) {
        NotificationConfig config = new NotificationConfig();
        
        switch (alertLevel) {
            case "emergency":
                config.channelId = CHANNEL_EMERGENCY;
                config.priority = NotificationCompat.PRIORITY_MAX;
                config.category = NotificationCompat.CATEGORY_ALARM;
                config.color = Color.RED;
                config.vibrationPattern = new long[]{0, 500, 100, 500, 100, 500, 100, 500};
                config.soundEnabled = true;
                break;
                
            case "danger":
                config.channelId = CHANNEL_DANGER;
                config.priority = NotificationCompat.PRIORITY_HIGH;
                config.category = NotificationCompat.CATEGORY_STATUS;
                config.color = Color.parseColor("#FF6B35");
                config.vibrationPattern = new long[]{0, 300, 100, 300, 100, 300};
                config.soundEnabled = true;
                break;
                
            case "warning":
                config.channelId = CHANNEL_WARNING;
                config.priority = NotificationCompat.PRIORITY_DEFAULT;
                config.category = NotificationCompat.CATEGORY_STATUS;
                config.color = Color.YELLOW;
                config.vibrationPattern = new long[]{0, 200, 100, 200};
                config.soundEnabled = true;
                break;
                
            default:
                config.channelId = CHANNEL_GENERAL;
                config.priority = NotificationCompat.PRIORITY_DEFAULT;
                config.category = NotificationCompat.CATEGORY_MESSAGE;
                config.color = Color.BLUE;
                config.vibrationPattern = null;
                config.soundEnabled = false;
                break;
        }
        
        return config;
    }
    
    /**
     * 응급상황 추가 진동
     */
    private void triggerEmergencyVibration() {
        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                // 강력한 응급 진동 패턴
                long[] emergencyPattern = {0, 1000, 200, 1000, 200, 1000};
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(android.os.VibrationEffect.createWaveform(emergencyPattern, -1));
                } else {
                    vibrator.vibrate(emergencyPattern, -1);
                }
                
                Log.d(TAG, "🔔 응급상황 추가 진동 실행");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ 응급 진동 실패", e);
        }
    }
    
    /**
     * 오류 시 긴급 대체 알림
     */
    private void showEmergencyFallbackNotification() {
        try {
            NotificationManager notificationManager = 
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            
            createNotificationChannels(notificationManager);
            
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
            
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            
            NotificationCompat.Builder builder = 
                new NotificationCompat.Builder(this, CHANNEL_EMERGENCY)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle("🚨 외롭지마 긴급 알림")
                    .setContentText("친구 상태를 확인해주세요 (시스템 오류 발생)")
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(NotificationCompat.CATEGORY_ALARM)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setColor(Color.RED);
            
            notificationManager.notify(9999, builder.build());
            
            Log.d(TAG, "🛡️ 긴급 대체 알림 표시 완료");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ 긴급 대체 알림마저 실패", e);
        }
    }
    
    /**
     * WebView로 메시지 전달 (앱이 활성화된 경우)
     */
    private void sendMessageToWebView(RemoteMessage remoteMessage) {
        try {
            if (MainActivity.getCurrentInstance() != null) {
                MainActivity mainActivity = MainActivity.getCurrentInstance();
                
                mainActivity.runOnUiThread(() -> {
                    String jsCode = String.format(
                        "if (window.onFCMBackgroundMessage) { " +
                        "  window.onFCMBackgroundMessage(%s); " +
                        "} else { " +
                        "  console.log('📱 FCM 백그라운드 메시지 수신:', %s); " +
                        "}",
                        convertRemoteMessageToJson(remoteMessage),
                        convertRemoteMessageToJson(remoteMessage)
                    );
                    
                    mainActivity.webView.evaluateJavascript(jsCode, null);
                });
                
                Log.d(TAG, "📤 WebView로 메시지 전달 완료");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ WebView 메시지 전달 실패", e);
        }
    }
    
    /**
     * RemoteMessage를 JSON 문자열로 변환
     */
    private String convertRemoteMessageToJson(RemoteMessage remoteMessage) {
        try {
            StringBuilder json = new StringBuilder("{");
            
            if (remoteMessage.getNotification() != null) {
                json.append("\"notification\":{");
                json.append("\"title\":\"").append(escapeJson(remoteMessage.getNotification().getTitle())).append("\",");
                json.append("\"body\":\"").append(escapeJson(remoteMessage.getNotification().getBody())).append("\"");
                json.append("},");
            }
            
            json.append("\"data\":{");
            boolean first = true;
            for (String key : remoteMessage.getData().keySet()) {
                if (!first) json.append(",");
                json.append("\"").append(escapeJson(key)).append("\":\"").append(escapeJson(remoteMessage.getData().get(key))).append("\"");
                first = false;
            }
            json.append("}");
            
            json.append("}");
            
            return json.toString();
        } catch (Exception e) {
            Log.e(TAG, "❌ JSON 변환 실패", e);
            return "{}";
        }
    }
    
    /**
     * JSON 문자열 이스케이프
     */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    /**
     * 알림 ID 생성 (친구별, 레벨별 고유)
     */
    private int generateNotificationId(String friendId, String alertLevel) {
        String combined = (friendId != null ? friendId : "unknown") + "_" + 
                         (alertLevel != null ? alertLevel : "general");
        return Math.abs(combined.hashCode());
    }
    
    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "🔑 새 FCM 토큰 생성: " + token.substring(0, 20) + "...");
        
        try {
            // WebView로 토큰 전달
            sendTokenToWebView(token);
            
            // SharedPreferences에 저장
            getSharedPreferences("lonely_care_prefs", MODE_PRIVATE)
                .edit()
                .putString("fcm_token", token)
                .putLong("fcm_token_time", System.currentTimeMillis())
                .apply();
            
            Log.d(TAG, "✅ FCM 토큰 로컬 저장 완료");
            
        } catch (Exception e) {
            Log.e(TAG, "❌ FCM 토큰 처리 실패", e);
        }
    }
    
    /**
     * WebView로 FCM 토큰 전달
     */
    private void sendTokenToWebView(String token) {
        try {
            if (MainActivity.getCurrentInstance() != null) {
                MainActivity mainActivity = MainActivity.getCurrentInstance();
                
                mainActivity.runOnUiThread(() -> {
                    String jsCode = String.format(
                        "if (window.onFCMTokenReceived) { " +
                        "  window.onFCMTokenReceived('%s'); " +
                        "} else { " +
                        "  console.log('🔑 FCM 토큰 수신:', '%s'); " +
                        "}",
                        token, token.substring(0, 20) + "..."
                    );
                    
                    mainActivity.webView.evaluateJavascript(jsCode, null);
                });
                
                Log.d(TAG, "📤 FCM 토큰 WebView 전달 완료");
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ FCM 토큰 WebView 전달 실패", e);
        }
    }
    
    /**
     * 알림 설정 클래스
     */
    private static class NotificationConfig {
        String channelId;
        int priority;
        String category;
        int color;
        long[] vibrationPattern;
        boolean soundEnabled;
    }
}