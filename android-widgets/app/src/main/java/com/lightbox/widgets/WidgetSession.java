package com.lightbox.widgets;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Offline, real one-tap functions shared by every installed widget.
 * Session mode is a timestamped state, NOT a fake word-count activity detector.
 * Captures are device-local and never silently inserted into a screenplay.
 */
public final class WidgetSession {
    private static final String STATE="lightbox.widget.session.v1";
    private static final String CAPTURES="lightbox.widget.capture.v1";
    private WidgetSession(){}

    public static boolean isActive(Context c){
        return c.getSharedPreferences(STATE,Context.MODE_PRIVATE).getBoolean("active",false);
    }
    public static long startedAt(Context c){
        return c.getSharedPreferences(STATE,Context.MODE_PRIVATE).getLong("started",0);
    }
    public static int completedCount(Context c){
        return c.getSharedPreferences(STATE,Context.MODE_PRIVATE).getInt("completed",0);
    }
    public static void toggle(Context c){
        SharedPreferences p=c.getSharedPreferences(STATE,Context.MODE_PRIVATE);
        boolean active=p.getBoolean("active",false);
        SharedPreferences.Editor e=p.edit();
        if(active){
            e.putBoolean("active",false).putLong("started",0L);
            e.putInt("completed",Math.max(0,p.getInt("completed",0))+1);
            e.putLong("lastFinished",System.currentTimeMillis());
        }else{
            e.putBoolean("active",true).putLong("started",System.currentTimeMillis());
        }
        e.apply();
        WidgetState.refreshAll(c);
    }
    private static JSONArray notes(Context c){
        try {
            return new JSONArray(c.getSharedPreferences(CAPTURES,Context.MODE_PRIVATE)
                                  .getString("notes","[]"));
        }catch(Exception ignored){return new JSONArray();}
    }
    public static int captureCount(Context c){return notes(c).length();}
    public static String latestNote(Context c){
        JSONObject obj=notes(c).optJSONObject(0);
        if(obj==null)return "";
        return WidgetState.shortText(obj.optString("text",""),165);
    }
}
