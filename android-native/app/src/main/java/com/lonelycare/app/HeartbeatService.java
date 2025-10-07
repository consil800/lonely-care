package com.lonelycare.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.Log;

import java.util.Calendar;
import java.util.HashMap;
import java.util.Map;

public class HeartbeatService extends Service {
    private static final String TAG = "HeartbeatService";
    private static final String PREF_NAME = "heartbeat_prefs";
    private static final String KEY_FRIEND_PAIRS = "friend_pairs";
    
    private AlarmManager alarmManager;
    private SharedPreferences prefs;
    
    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "HeartbeatService 생성됨");
        
        alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        prefs = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "HeartbeatService 시작됨");
        
        String action = intent != null ? intent.getAction() : null;
        
        if ("SCHEDULE_HEARTBEAT".equals(action)) {
            String pairId = intent.getStringExtra("pair_id");
            int delaySeconds = intent.getIntExtra("delay_seconds", 1);
            scheduleHeartbeat(pairId, delaySeconds);
        } else if ("SEND_HEARTBEAT".equals(action)) {
            String pairId = intent.getStringExtra("pair_id");
            sendHeartbeat(pairId);
        } else if ("CHECK_HEARTBEAT".equals(action)) {
            checkAllHeartbeats();
        }
        
        return START_STICKY;
    }
    
    private void scheduleHeartbeat(String pairId, int delaySeconds) {
        Log.d(TAG, "하트비트 스케줄링: " + pairId + " (지연: " + delaySeconds + "초)");
        
        // 다음 정시에 실행되도록 계산
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.HOUR, 1);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, delaySeconds);
        calendar.set(Calendar.MILLISECOND, 0);
        
        Intent heartbeatIntent = new Intent(this, HeartbeatReceiver.class);
        heartbeatIntent.setAction("HEARTBEAT_ALARM");
        heartbeatIntent.putExtra("pair_id", pairId);
        heartbeatIntent.putExtra("delay_seconds", delaySeconds);
        
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            this, 
            pairId.hashCode(), 
            heartbeatIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        
        // 반복 알람 설정 (1시간마다)
        alarmManager.setRepeating(
            AlarmManager.RTC_WAKEUP,
            calendar.getTimeInMillis(),
            AlarmManager.INTERVAL_HOUR,
            pendingIntent
        );
        
        // 친구 쌍 정보 저장
        saveFriendPair(pairId, delaySeconds);
    }
    
    private void sendHeartbeat(String pairId) {
        Log.d(TAG, "하트비트 전송: " + pairId);
        
        // WebView로 하트비트 전송 요청
        Intent intent = new Intent("com.lonelycare.SEND_HEARTBEAT");
        intent.putExtra("pair_id", pairId);
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
    }
    
    private void checkAllHeartbeats() {
        Log.d(TAG, "모든 하트비트 상태 확인");
        
        // WebView로 하트비트 체크 요청
        Intent intent = new Intent("com.lonelycare.CHECK_HEARTBEATS");
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
    }
    
    private void saveFriendPair(String pairId, int delaySeconds) {
        Map<String, Integer> pairs = getFriendPairs();
        pairs.put(pairId, delaySeconds);
        
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Integer> entry : pairs.entrySet()) {
            if (sb.length() > 0) sb.append(";");
            sb.append(entry.getKey()).append(":").append(entry.getValue());
        }
        
        prefs.edit().putString(KEY_FRIEND_PAIRS, sb.toString()).apply();
    }
    
    private Map<String, Integer> getFriendPairs() {
        Map<String, Integer> pairs = new HashMap<>();
        String saved = prefs.getString(KEY_FRIEND_PAIRS, "");
        
        if (!saved.isEmpty()) {
            String[] items = saved.split(";");
            for (String item : items) {
                String[] parts = item.split(":");
                if (parts.length == 2) {
                    pairs.put(parts[0], Integer.parseInt(parts[1]));
                }
            }
        }
        
        return pairs;
    }
    
    public void rescheduleSavedHeartbeats() {
        Map<String, Integer> pairs = getFriendPairs();
        for (Map.Entry<String, Integer> entry : pairs.entrySet()) {
            scheduleHeartbeat(entry.getKey(), entry.getValue());
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "HeartbeatService 종료됨");
    }
}