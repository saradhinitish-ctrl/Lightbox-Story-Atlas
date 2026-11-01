package com.lightbox.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;
import java.text.DateFormat;
import java.util.Date;

/**
 * These are actual Android RemoteViews, not a screenshot painted onto ImageView.
 * Each visible control owns its own PendingIntent and can be tapped independently.
 */
public abstract class WidgetBaseProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.saradhinitish.lightboxstudio.REFRESH_WIDGET";
    protected abstract int kind();

    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) updateOne(context,manager,id,kind());
    }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager,
                                                      int id, Bundle options) {
        updateOne(context,manager,id,kind());
    }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context,intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                                      AppWidgetManager.INVALID_APPWIDGET_ID);
            AppWidgetManager m=AppWidgetManager.getInstance(context);
            if(id != AppWidgetManager.INVALID_APPWIDGET_ID) updateOne(context,m,id,kind());
        }
    }

    private static int layout(int kind) {
        return kind==0 ? R.layout.widget_quick_live :
               kind==1 ? R.layout.widget_wide_live : R.layout.widget_large_live;
    }
    private static String clip(String value,int limit,String fallback) {
        if(value==null||value.trim().isEmpty()) return fallback;
        String safe=value.replaceAll("[\\p{Cntrl}]+"," ").trim();
        return safe.length()<=limit?safe:safe.substring(0,limit-1)+"…";
    }
    static RemoteViews views(Context context, int widgetId, int kind, boolean interactive) {
        RemoteViews v=new RemoteViews(context.getPackageName(),layout(kind));
        WidgetState state=WidgetState.read(context);
        v.setTextViewText(R.id.widget_title,clip(state.title,85,"YOUR NEXT STORY"));
        if(kind>=1) {
            v.setTextViewText(R.id.widget_count,
                    state.target>0?state.words+" / "+state.target+" WORDS":state.words+" WORDS");
            v.setTextViewText(R.id.widget_scene,clip(state.scene,7,"--"));
        }
        if(kind==2) {
            v.setTextViewText(R.id.widget_scene,"SCENE "+clip(state.scene,7,"--"));
            v.setTextViewText(R.id.widget_heading,clip(state.heading,155,"Open Lightbox to begin."));
            v.setTextViewText(R.id.widget_draft,clip(state.draft,55,"WORK IN PROGRESS"));
            int progress=state.target>0?
                    Math.round(Math.min(100f,100f*state.words/state.target)):0;
            v.setProgressBar(R.id.widget_progress,100,progress,false);
            String date=state.syncedAt<=0?"NOT SYNCED — TAP SYNC":
                    "LAST SYNC  "+DateFormat.getDateTimeInstance(DateFormat.SHORT,DateFormat.SHORT)
                                          .format(new Date(state.syncedAt));
            v.setTextViewText(R.id.widget_sync_status,date);
        }
        if(!interactive) return v;

        Intent open=new Intent(context,StudioLauncherActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent resume=PendingIntent.getActivity(context,10000+widgetId,
                    open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.action_open,resume);
        v.setOnClickPendingIntent(R.id.widget_title,resume);

        Intent note=new Intent(context,QuickCaptureActivity.class);
        note.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent capture=PendingIntent.getActivity(context,20000+widgetId,note,
                    PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.action_capture,capture);

        if(kind>=1) {
            Intent refresh=new Intent(context,kind==1?WideProvider.class:LargeProvider.class);
            refresh.setAction(ACTION_REFRESH);
            refresh.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId);
            refresh.setData(Uri.parse("lightboxstudio://widget/refresh/"+widgetId+"/"+kind));
            PendingIntent refreshing=PendingIntent.getBroadcast(context,30000+widgetId,refresh,
                    PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.action_refresh,refreshing);
        }
        if(kind==2) {
            Intent sync=new Intent(context,StudioLauncherActivity.class);
            sync.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
            sync.putExtra(StudioLauncherActivity.EXTRA_OPEN_SYNC,true);
            PendingIntent syncing=PendingIntent.getActivity(context,40000+widgetId,sync,
                    PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.action_sync,syncing);
        }
        return v;
    }
    static void updateOne(Context context, AppWidgetManager manager,int id,int kind) {
        manager.updateAppWidget(id,views(context,id,kind,true));
    }
}
