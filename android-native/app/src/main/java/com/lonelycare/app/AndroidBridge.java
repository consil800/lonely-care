package com.lonelycare.app;

import android.content.Context;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.content.Intent;
import org.json.JSONObject;
import android.app.Activity;
import android.net.Uri;
import android.util.Base64;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import android.content.ContentResolver;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import android.os.Build;

public class AndroidBridge implements SensorEventListener {
    private static final String TAG = "AndroidBridge";
    private Context context;
    private MainActivity activity;
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private Handler handler;
    private boolean isMonitoring = false;
    private long lastMotionTime;
    private static final long NO_MOTION_THRESHOLD = 30 * 60 * 1000; // 30분
    
    // 현재 선택 중인 파일 타입 저장
    private String currentFileType = "profile";
    
    // 알림 채널 ID
    private static final String CHANNEL_ID = "lonely_care_notifications";
    private static final String CHANNEL_NAME = "친구 상태 알림";
    private int notificationId = 100;
    private NotificationManager notificationManager;
    
    public AndroidBridge(Context context, MainActivity activity) {
        this.context = context;
        this.activity = activity;
        this.handler = new Handler(Looper.getMainLooper());
        this.sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        this.accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        this.lastMotionTime = System.currentTimeMillis();
        this.notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }
    
    @JavascriptInterface
    public void startSensorService() {
        Log.d(TAG, "센서 서비스 시작");
        if (!isMonitoring && accelerometer != null) {
            sensorManager.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_NORMAL);
            isMonitoring = true;
            startMotionCheck();
            showToast("움직임 감지 시작");
        }
    }
    
    @JavascriptInterface
    public void stopSensorService() {
        Log.d(TAG, "센서 서비스 중지");
        if (isMonitoring) {
            sensorManager.unregisterListener(this);
            isMonitoring = false;
            showToast("움직임 감지 중지");
        }
    }
    
    @JavascriptInterface
    public String getSensorStatus() {
        try {
            JSONObject status = new JSONObject();
            status.put("isMonitoring", isMonitoring);
            status.put("lastMotionTime", lastMotionTime);
            status.put("hasAccelerometer", accelerometer != null);
            return status.toString();
        } catch (Exception e) {
            return "{}";
        }
    }
    
    @JavascriptInterface
    public void vibrate() {
        android.os.Vibrator vibrator = (android.os.Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            vibrator.vibrate(200);
        }
    }
    
    @JavascriptInterface
    public void showToast(String message) {
        handler.post(() -> {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
        });
    }
    
    @JavascriptInterface
    public void openExternalUrl(String url) {
        Log.d(TAG, "외부 URL 열기 요청: " + url);
        handler.post(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                Log.d(TAG, "외부 URL 열기 성공: " + url);
                showToast("외부 브라우저에서 링크를 엽니다");
            } catch (Exception e) {
                Log.e(TAG, "외부 URL 열기 실패: " + e.getMessage());
                showToast("링크를 열 수 없습니다");
            }
        });
    }
    
    @JavascriptInterface
    public void saveData(String key, String value) {
        context.getSharedPreferences("AnsimCare", Context.MODE_PRIVATE)
            .edit()
            .putString(key, value)
            .apply();
    }
    
    @JavascriptInterface
    public String getData(String key) {
        return context.getSharedPreferences("AnsimCare", Context.MODE_PRIVATE)
            .getString(key, "");
    }
    
    @JavascriptInterface
    public void loginWithKakao() {
        Log.d(TAG, "WebView에서 카카오 로그인 요청");
        handler.post(() -> {
            if (activity != null && activity.kakaoLoginManager != null) {
                activity.kakaoLoginManager.login();
            } else {
                showToast("카카오 로그인 매니저가 초기화되지 않았습니다.");
            }
        });
    }
    
    @JavascriptInterface
    public void clearData() {
        context.getSharedPreferences("AnsimCare", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply();
    }
    
    @JavascriptInterface
    public void kakaoLogout() {
        Log.d(TAG, "JavaScript에서 카카오 로그아웃 요청");
        handler.post(() -> {
            if (activity.kakaoLoginManager != null) {
                activity.kakaoLoginManager.logout();
            }
        });
    }
    
    @JavascriptInterface
    public void scheduleHeartbeat(String pairId, int delaySeconds) {
        Log.d(TAG, "하트비트 스케줄링 요청: " + pairId + ", 지연: " + delaySeconds + "초");
        
        Intent serviceIntent = new Intent(context, HeartbeatService.class);
        serviceIntent.setAction("SCHEDULE_HEARTBEAT");
        serviceIntent.putExtra("pair_id", pairId);
        serviceIntent.putExtra("delay_seconds", delaySeconds);
        context.startService(serviceIntent);
    }
    
    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_ACCELEROMETER) {
            float x = event.values[0];
            float y = event.values[1];
            float z = event.values[2];
            
            float magnitude = (float) Math.sqrt(x*x + y*y + z*z);
            float movement = Math.abs(magnitude - 9.8f);
            
            if (movement > 0.5f) {
                lastMotionTime = System.currentTimeMillis();
                
                activity.runOnUiThread(() -> {
                    activity.webView.evaluateJavascript(
                        "if(window.onMotionDetected) window.onMotionDetected({magnitude:" + magnitude + "})",
                        null
                    );
                });
            }
        }
    }
    
    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // 정확도 변경 처리
    }
    
    @JavascriptInterface
    public void updateSessionStatus(String status) {
        Log.d(TAG, "세션 상태 업데이트: " + status);
        // SharedPreferences에 세션 상태 저장
        context.getSharedPreferences("AnsimCare", Context.MODE_PRIVATE)
            .edit()
            .putString("sessionStatus", status)
            .putLong("lastSessionUpdate", System.currentTimeMillis())
            .apply();
    }
    
    @JavascriptInterface
    public void keepSessionAlive() {
        Log.d(TAG, "세션 유지 요청");
        // 백그라운드에서도 세션 유지를 위해 알람 매니저 사용
        Intent serviceIntent = new Intent(context, SessionKeepAliveService.class);
        context.startService(serviceIntent);
    }
    
    @JavascriptInterface
    public boolean isSessionActive() {
        long lastUpdate = context.getSharedPreferences("AnsimCare", Context.MODE_PRIVATE)
            .getLong("lastSessionUpdate", 0);
        long currentTime = System.currentTimeMillis();
        // 10분 이내에 업데이트가 있었으면 세션 활성
        return (currentTime - lastUpdate) < (10 * 60 * 1000);
    }
    
    private void startMotionCheck() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (isMonitoring) {
                    long currentTime = System.currentTimeMillis();
                    long timeSinceMotion = currentTime - lastMotionTime;
                    
                    if (timeSinceMotion > NO_MOTION_THRESHOLD) {
                        int hours = (int) (timeSinceMotion / (1000 * 60 * 60));
                        
                        activity.runOnUiThread(() -> {
                            activity.webView.evaluateJavascript(
                                "if(window.onNoMotionAlert) window.onNoMotionAlert(" + hours + ")",
                                null
                            );
                        });
                    }
                    
                    handler.postDelayed(this, 5 * 60 * 1000);
                }
            }
        }, 5 * 60 * 1000);
    }
    
    // 파일 선택을 위한 메서드 추가
    @JavascriptInterface
    public void selectImageFile(String type) {
        Log.d(TAG, "이미지 파일 선택 요청: " + type);
        
        // 현재 선택 중인 파일 타입 저장
        this.currentFileType = type;
        
        activity.runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.setType("image/*");
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                
                // 이미지 타입만 허용
                String[] mimeTypes = {"image/jpeg", "image/jpg", "image/png", "image/gif"};
                intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
                
                // 파일 선택기 시작
                activity.startActivityForResult(
                    Intent.createChooser(intent, "이미지를 선택하세요"),
                    MainActivity.FILE_CHOOSER_RESULT_CODE
                );
                
                Log.d(TAG, "파일 선택 액티비티 시작됨 - 타입: " + type);
                
            } catch (Exception e) {
                Log.e(TAG, "파일 선택 실패: " + e.getMessage());
                showToast("파일 선택에 실패했습니다.");
            }
        });
    }
    
    // 파일 선택 결과를 JavaScript로 전달 (Base64 변환 포함)
    public void handleFileSelected(String fileUri) {
        Log.d(TAG, "파일 선택 결과 처리: " + fileUri);
        
        activity.runOnUiThread(() -> {
            if (fileUri != null) {
                try {
                    // content:// URI를 Base64로 변환
                    String base64Data = convertUriToBase64(fileUri);
                    if (base64Data != null) {
                        Log.d(TAG, "Base64 변환 성공, 크기: " + (base64Data.length() / 1024) + "KB");
                        
                        // Base64 데이터와 파일 타입을 JavaScript로 전달
                        activity.webView.evaluateJavascript(
                            "if(window.handleNativeFileSelected) window.handleNativeFileSelected('" + base64Data + "', '" + currentFileType + "')",
                            null
                        );
                    } else {
                        Log.e(TAG, "Base64 변환 실패");
                        activity.webView.evaluateJavascript(
                            "if(window.handleNativeFileSelected) window.handleNativeFileSelected(null)",
                            null
                        );
                    }
                } catch (Exception e) {
                    Log.e(TAG, "파일 처리 실패: " + e.getMessage());
                    activity.webView.evaluateJavascript(
                        "if(window.handleNativeFileSelected) window.handleNativeFileSelected(null)",
                        null
                    );
                }
            } else {
                // 파일 선택이 취소된 경우
                activity.webView.evaluateJavascript(
                    "if(window.handleNativeFileSelected) window.handleNativeFileSelected(null)",
                    null
                );
            }
        });
    }
    
    // content:// URI를 Base64로 변환하는 메서드
    private String convertUriToBase64(String uriString) {
        try {
            Uri uri = Uri.parse(uriString);
            ContentResolver contentResolver = context.getContentResolver();
            InputStream inputStream = contentResolver.openInputStream(uri);
            
            if (inputStream == null) {
                Log.e(TAG, "InputStream이 null입니다");
                return null;
            }
            
            // InputStream을 ByteArray로 변환
            ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            
            while ((length = inputStream.read(buffer)) != -1) {
                byteArrayOutputStream.write(buffer, 0, length);
            }
            
            byte[] byteArray = byteArrayOutputStream.toByteArray();
            inputStream.close();
            byteArrayOutputStream.close();
            
            // Base64로 인코딩
            String base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP);
            
            // MIME 타입 추가 (기본값: image/jpeg)
            String mimeType = contentResolver.getType(uri);
            if (mimeType == null) {
                mimeType = "image/jpeg";
            }
            
            return "data:" + mimeType + ";base64," + base64;
            
        } catch (Exception e) {
            Log.e(TAG, "Base64 변환 실패: " + e.getMessage());
            return null;
        }
    }
    
    // 네이티브 Android 알림 표시
    @JavascriptInterface
    public void showNotification(String title, String message) {
        Log.d(TAG, "네이티브 알림 표시 요청: " + title);
        
        handler.post(() -> {
            try {
                NotificationManager notificationManager = 
                    (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                
                // Android 8.0 이상에서는 알림 채널 필요
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        CHANNEL_NAME,
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("친구의 안전 상태를 알려주는 중요한 알림입니다");
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 500, 200, 500});
                    notificationManager.createNotificationChannel(channel);
                }
                
                // 알림 클릭 시 앱 열기
                Intent intent = new Intent(context, MainActivity.class);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, 
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.M 
                        ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        : PendingIntent.FLAG_UPDATE_CURRENT
                );
                
                // 알림 아이콘 및 색상 결정 (이모지 아이콘 기반)
                int icon = android.R.drawable.ic_dialog_alert;
                int color = 0xFFFF0000; // 기본 빨간색
                String notificationCategory = NotificationCompat.CATEGORY_ALARM;
                
                // 제목에서 이모지나 키워드로 레벨 판단
                if (title.contains("🟡") || title.contains("주의")) {
                    color = 0xFFFFC107; // 노란색
                    icon = android.R.drawable.ic_dialog_info;
                    notificationCategory = NotificationCompat.CATEGORY_STATUS;
                } else if (title.contains("🟠") || title.contains("경고")) {
                    color = 0xFFFF6F00; // 주황색
                    icon = android.R.drawable.ic_dialog_alert;
                    notificationCategory = NotificationCompat.CATEGORY_ALARM;
                } else if (title.contains("🔴") || title.contains("긴급")) {
                    color = 0xFFDC3545; // 진한 빨간색
                    icon = android.R.drawable.ic_dialog_alert;
                    notificationCategory = NotificationCompat.CATEGORY_ALARM;
                }
                
                // 알림 생성
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(icon)
                    .setContentTitle("🚨 lonely-care 알림")
                    .setContentText(title)
                    .setSubText("친구 안전 확인 시스템")
                    .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText(message)
                        .setBigContentTitle(title) // 이미 이모지가 포함된 제목 사용
                        .setSummaryText("lonely-care"))
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setCategory(notificationCategory)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setColor(color)
                    .setVibrate(new long[]{0, 1000, 500, 1000})
                    .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                    .setLights(color, 3000, 3000)
                    .setOngoing(false)
                    .setShowWhen(true);
                
                // 알림 표시
                notificationManager.notify(notificationId++, builder.build());
                Log.d(TAG, "네이티브 알림 표시 완료");
                
            } catch (Exception e) {
                Log.e(TAG, "알림 표시 실패: " + e.getMessage());
            }
        });
    }
    
    // 알림 권한 확인
    @JavascriptInterface
    public boolean checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") 
                == android.content.pm.PackageManager.PERMISSION_GRANTED;
        }
        return true; // Android 13 미만은 권한 불필요
    }
    
    // 알림 배지 클리어
    @JavascriptInterface
    public void clearNotificationBadge() {
        Log.d(TAG, "알림 배지 클리어 요청");
        handler.post(() -> {
            try {
                // 모든 알림 취소
                notificationManager.cancelAll();
                
                // 배지 카운트 초기화 (일부 런처에서 지원)
                Intent intent = new Intent("android.intent.action.BADGE_COUNT_UPDATE");
                intent.putExtra("badge_count", 0);
                intent.putExtra("badge_count_package_name", context.getPackageName());
                context.sendBroadcast(intent);
                
                Log.d(TAG, "알림 배지 클리어 완료");
            } catch (Exception e) {
                Log.e(TAG, "배지 클리어 실패: " + e.getMessage());
            }
        });
    }
    
    // 앱이 포그라운드로 올 때 자동 배지 클리어
    @JavascriptInterface
    public void onAppForeground() {
        Log.d(TAG, "앱이 포그라운드로 전환됨 - 배지 자동 클리어");
        clearNotificationBadge();
    }
}