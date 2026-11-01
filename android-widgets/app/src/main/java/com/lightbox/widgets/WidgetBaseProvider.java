package com.lightbox.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.widget.RemoteViews;
import android.view.View;
import android.graphics.Bitmap;

public abstract class WidgetBaseProvider extends AppWidgetProvider {
    protected abstract int kind();
    @Override public void onUpdate(Context context,AppWidgetManager manager,int[] ids) {
        for(int id:ids) updateOne(context,manager,id,kind());
    }
    @Override public void onAppWidgetOptionsChanged(Context context,AppWidgetManager manager,int id,Bundle options) {
        updateOne(context,manager,id,kind());
    }
    static void updateOne(Context context,AppWidgetManager manager,int id,int kind) {
        Bundle opts=manager.getAppWidgetOptions(id);
        int minW=kind==0?150:320, minH=kind==2?318:150;
        if(opts!=null){
            minW=opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,minW);
            minH=opts.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,minH);
        }
        float d=context.getResources().getDisplayMetrics().density;
        // RemoteViews bitmaps are kept small to respect launcher IPC memory limits.
        int width=Math.min(900,Math.max(110,Math.round(minW*d)));
        int height=Math.min(900,Math.max(110,Math.round(minH*d)));
        Bitmap art=WidgetPainter.draw(kind,WidgetState.read(context),width,height);
        RemoteViews rv=new RemoteViews(context.getPackageName(),R.layout.widget_shell);
        rv.setImageViewBitmap(R.id.art,art);
        Intent open=new Intent(context, StudioLauncherActivity.class);
        PendingIntent resume=PendingIntent.getActivity(context,10000+id,open,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        rv.setOnClickPendingIntent(R.id.resumeTap,resume);
        rv.setOnClickPendingIntent(R.id.art,resume);
        if(kind==2){
            rv.setViewVisibility(R.id.captureTap,View.VISIBLE);
            Intent capture=new Intent(context,QuickCaptureActivity.class);
            PendingIntent note=PendingIntent.getActivity(context,20000+id,capture,
                PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            rv.setOnClickPendingIntent(R.id.captureTap,note);
        }else rv.setViewVisibility(R.id.captureTap,View.GONE);
        manager.updateAppWidget(id,rv);
    }
}
