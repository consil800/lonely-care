package com.lonelycare.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class SessionKeepAliveService extends Service {
    private static final String TAG = "SessionKeepAliveService";
    private static final String CHANNEL_ID = "session_keepalive_channel";
    private static final int NOTIFICATION_ID = 1002;
    
    private PowerManager.WakeLock wakeLock;
    private AlarmManager alarmManager;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "SessionKeepAliveService 생성됨");
        
        // Wake lock 획득 (배터리 최적화 무시)
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "LonelyCare:SessionKeepAlive");
        wakeLock.acquire();
        
        alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        
        // Foreground 서비스로 실행
        startForeground(NOTIFICATION_ID, createNotification());
        
        // 주기적인 세션 확인 스케줄링
        scheduleSessionCheck();
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "SessionKeepAliveService 시작됨");
        
        // 세션 상태 확인 및 갱신
        checkAndRefreshSession();
        
        // START_STICKY: 시스템이 서비스를 종료해도 자동으로 재시작
        return START_STICKY;
    }
    
    private void checkAndRefreshSession() {
        SharedPreferences prefs = getSharedPreferences("AnsimCare", Context.MODE_PRIVATE);
        String currentUser = prefs.getString("currentUser", null);
        
        if (currentUser != null) {
            // 세션 활성 상태 유지
            prefs.edit()
                .putLong("lastSessionUpdate", System.currentTimeMillis())
                .putString("sessionStatus", "active")
                .apply();
            
            Log.d(TAG, "세션 갱신됨");
            
            // MainActivity의 WebView에 세션 갱신 알림
            Intent broadcastIntent = new Intent("com.lonelycare.SESSION_REFRESH");
            sendBroadcast(broadcastIntent);
        }
    }
    
    private void scheduleSessionCheck() {
        // 10분마다 세션 체크
        Intent intent = new Intent(this, SessionCheckReceiver.class);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // 반복 알람 설정
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + AlarmManager.INTERVAL_FIFTEEN_MINUTES / 3, // 5분
            AlarmManager.INTERVAL_FIFTEEN_MINUTES / 3, // 5분마다
            pendingIntent
        );
        
        Log.d(TAG, "세션 체크 알람 설정됨 (5분마다)");
    }
    
    private Notification createNotification() {
        // 알림 채널 생성 (Android O 이상)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "백그라운드 보안",
                NotificationManager.IMPORTANCE_MIN  // IMPORTANCE_LOW에서 MIN으로 변경
            );
            channel.setDescription("백그라운드에서 안전을 모니터링합니다");
            channel.setShowBadge(false);      // 알림 배지 제거
            channel.enableLights(false);     // LED 표시등 비활성화
            channel.enableVibration(false);  // 진동 비활성화
            channel.setSound(null, null);    // 알림음 비활성화
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
        
        // MainActivity로 이동하는 인텐트
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            notificationIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("안심케어")
            .setContentText("백그라운드에서 안전을 지키고 있습니다")  // 더 간결한 메시지
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_MIN)     // PRIORITY_LOW에서 MIN으로 변경
            .setShowWhen(false)      // 시간 표시 비활성화
            .setOngoing(true)        // 스와이프로 제거 방지
            .setAutoCancel(false)    // 터치로 자동 제거 방지
            .setSilent(true)         // 완전히 조용한 알림
            .setBadgeIconType(NotificationCompat.BADGE_ICON_NONE)  // 배지 아이콘 제거
            .build();
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "SessionKeepAliveService 종료됨");
        
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        
        // 서비스가 종료되어도 다시 시작되도록 알람 설정
        Intent restartIntent = new Intent(this, SessionKeepAliveService.class);
        PendingIntent pendingIntent = PendingIntent.getService(
            this,
            1,
            restartIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        alarmManager.set(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + 1000, // 1초 후 재시작
            pendingIntent
        );
    }
}