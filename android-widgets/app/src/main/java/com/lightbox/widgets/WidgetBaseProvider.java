package com.lightbox.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import java.text.DateFormat;
import java.util.Date;

/**
 * One app, three genuine Android widgets.
 *
 * 2x2: capture a note, reopen studio, read offline capture count.
 * 4x2: current scene + real one-tap start/finish writing session.
 * 4x4: synced story, latest saved note, manual progress and session tools.
 *
 * All buttons are independent Android PendingIntents. There are no bitmap
 * mockups or invisible image-overlay "buttons".
 */
public abstract class WidgetBaseProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.saradhinitish.lightboxstudio.REFRESH_WIDGET";
    public static final String ACTION_SESSION = "com.saradhinitish.lightboxstudio.TOGGLE_SESSION";
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
        String action=intent.getAction();
        if (ACTION_SESSION.equals(action)) {
            WidgetSession.toggle(context); // updates ALL sizes, immediately
            return;
        }
        if (ACTION_REFRESH.equals(action)) {
            int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,
                                      AppWidgetManager.INVALID_APPWIDGET_ID);
            if(id!=AppWidgetManager.INVALID_APPWIDGET_ID)
                updateOne(context,AppWidgetManager.getInstance(context),id,kind());
        }
    }

    private static int layout(int kind) {
        return kind==0 ? R.layout.widget_quick_live :
               kind==1 ? R.layout.widget_wide_live : R.layout.widget_large_live;
    }
    private static PendingIntent activity(Context c,Class<?> target,int requestCode,boolean sync) {
        Intent i=new Intent(c,target);
        i.setAction(sync?"com.lightbox.widgets.OPEN_SYNC":"com.lightbox.widgets.OPEN");
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if(sync)i.putExtra(StudioLauncherActivity.EXTRA_OPEN_SYNC,true);
        return PendingIntent.getActivity(c,requestCode,i,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }

    static RemoteViews views(Context context,int widgetId,int kind,boolean interactive) {
        RemoteViews v=new RemoteViews(context.getPackageName(),layout(kind));
        WidgetState state=WidgetState.read(context);
        boolean hasStory=state.syncedAt>0;
        boolean active=WidgetSession.isActive(context);
        int captures=WidgetSession.captureCount(context);
        String title=hasStory?state.title:(kind==0?"Field notes":kind==1?"Scene desk":"Director’s desk");
        v.setTextViewText(R.id.widget_title,title);
        if(kind==0) {
            v.setTextViewText(R.id.widget_meta,captures+(captures==1?" note":" notes"));
        } else {
            String scene="--".equals(state.scene) || !hasStory ? "—" : state.scene;
            v.setTextViewText(R.id.widget_scene,kind==1?scene:"SCENE   "+scene);
            String words=java.text.NumberFormat.getIntegerInstance().format(state.words)+" words";
            v.setTextViewText(R.id.widget_count,hasStory ? words+" · last sync":"No story linked");
            v.setTextViewText(R.id.action_session,active?"Finish":"Start");
            v.setContentDescription(R.id.action_session,active?"Finish active writing session":"Start writing session");
            v.setTextColor(R.id.action_session,0xff181916);
        }
        if(kind==2){
            v.setTextViewText(R.id.widget_heading,hasStory?state.heading:"Link your first scene");
            v.setTextViewText(R.id.widget_draft,hasStory?state.draft:"Choose a story using Sync");
            String latest=WidgetSession.latestNote(context);
            v.setTextViewText(R.id.widget_recent,latest.isEmpty()?"No saved notes":latest);
            String sync=hasStory?"Synced "+DateFormat.getDateTimeInstance(DateFormat.SHORT,DateFormat.SHORT)
                .format(new Date(state.syncedAt)):"Manual story sync";
            v.setTextViewText(R.id.widget_sync_status,active?
                "Session since "+DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date(WidgetSession.startedAt(context))):sync);
            if(!hasStory||state.target<=0){
                v.setViewVisibility(R.id.widget_progress,View.GONE);
            }else{
                v.setViewVisibility(R.id.widget_progress,View.VISIBLE);
                v.setProgressBar(R.id.widget_progress,100,
                    Math.round(Math.min(100f,100f*state.words/state.target)),false);
            }
        }
        if(!interactive)return v;

        PendingIntent open=activity(context,StudioLauncherActivity.class,10000+widgetId,false);
        PendingIntent capture=activity(context,QuickCaptureActivity.class,20000+widgetId,false);
        if(kind!=0) v.setOnClickPendingIntent(R.id.widget_title,open);
        v.setOnClickPendingIntent(R.id.action_open,open);
        v.setOnClickPendingIntent(R.id.action_capture,capture);

        if(kind>=1) {
            Intent toggle=new Intent(context,kind==1?WideProvider.class:LargeProvider.class);
            toggle.setAction(ACTION_SESSION);
            toggle.setData(Uri.parse("lightboxstudio://session/"+kind+"/"+widgetId));
            PendingIntent session=PendingIntent.getBroadcast(context,30000+widgetId,toggle,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            v.setOnClickPendingIntent(R.id.action_session,session);
        }
        if(kind==2) {
            PendingIntent sync=activity(context,StudioLauncherActivity.class,40000+widgetId,true);
            v.setOnClickPendingIntent(R.id.action_sync,sync);
            Intent notes=new Intent(context,QuickCaptureActivity.class).putExtra(QuickCaptureActivity.ARCHIVE,true);
            notes.setAction("com.lightbox.widgets.NOTEBOOK");
            v.setOnClickPendingIntent(R.id.recent_area,PendingIntent.getActivity(context,widgetId,notes,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        }
        return v;
    }

    static void updateOne(Context context,AppWidgetManager manager,int id,int kind) {
        manager.updateAppWidget(id,views(context,id,kind,true));
    }
}
