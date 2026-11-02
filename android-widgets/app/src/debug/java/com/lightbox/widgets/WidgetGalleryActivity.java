package com.lightbox.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.RemoteViews;
import android.widget.ScrollView;
import android.widget.TextView;

/** DEBUG-ONLY real widget host: binds the provider and tests actual PendingIntents.
 * A RemoteViews.apply() preview alone is NOT a launcher and is unsuitable as
 * proof that PendingIntent buttons work.
 * --ei variant 0|1|2   --ei testAction 0=open 1=note 2=sync 3=session
 */
public final class WidgetGalleryActivity extends Activity {
    private static final String TAG="LightboxWidgetQA";
    private AppWidgetHost host;
    private int twinId=AppWidgetManager.INVALID_APPWIDGET_ID;
    private int id=AppWidgetManager.INVALID_APPWIDGET_ID;
    private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private TextView text(String value,int size,boolean bold){
        TextView v=new TextView(this);
        v.setText(value);v.setTextColor(Color.rgb(24,25,22));v.setTextSize(size);
        v.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        return v;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        final int variant=Math.max(0,Math.min(2,getIntent().getIntExtra("variant",0)));
        int width=variant==0?165:335,height=variant==2?335:166;
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(239,237,230));
        LinearLayout column=new LinearLayout(this);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        column.setPadding(dp(17),dp(56),dp(17),dp(22));
        scroll.addView(column);
        column.addView(text("LIGHTBOX / LIVE WIDGET HOST",13,true));
        TextView heading=text(variant==0?"2 × 2  QUICK RETURN":
          variant==1?"4 × 2  CURRENT SCENE":"4 × 4  STORY IN PROGRESS",18,true);
        LinearLayout.LayoutParams h=new LinearLayout.LayoutParams(-2,-2);
        h.topMargin=dp(25);column.addView(heading,h);

        Class<?> provider=variant==0?QuickProvider.class:
                          variant==1?WideProvider.class:LargeProvider.class;
        host=new AppWidgetHost(this,19001);
        id=host.allocateAppWidgetId();
        AppWidgetManager manager=AppWidgetManager.getInstance(this);
        ComponentName component=new ComponentName(this,provider);
        boolean granted=manager.bindAppWidgetIdIfAllowed(id,component);
        Log.i(TAG,"Binding widget id="+id+" allowed="+granted);
        View widget;
        if(granted) {
            AppWidgetProviderInfo info=manager.getAppWidgetInfo(id);
            AppWidgetHostView real=host.createView(this,id,info);
            widget=real;
        } else {
            // Still capture visual layout if bind permission was not granted.
            widget=WidgetBaseProvider.views(this,id,variant,true).apply(this,column);
        }
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(dp(width),dp(height));
        p.topMargin=dp(25);column.addView(widget,p);
        TextView guide=text(granted?"REAL APPWIDGETHOST / LIVE CONTROLS":
            "BIND PERMISSION NOT GRANTED / VISUAL FALLBACK",11,false);
        LinearLayout.LayoutParams caption=new LinearLayout.LayoutParams(-2,-2);
        caption.topMargin=dp(20);column.addView(guide,caption);
        // A second, independently bound instance must reflect the first widget's action.
        boolean twin=getIntent().getBooleanExtra("twin",false);
        AppWidgetHostView second=null;
        if(twin && granted){
            twinId=host.allocateAppWidgetId();
            if(!manager.bindAppWidgetIdIfAllowed(twinId,component))
                throw new AssertionError("Second widget binding denied");
            second=host.createView(this,twinId,manager.getAppWidgetInfo(twinId));
            column.addView(second,new LinearLayout.LayoutParams(dp(width),dp(height)));
            manager.updateAppWidget(twinId,WidgetBaseProvider.views(this,twinId,variant,true));
        }
        final AppWidgetHostView twinView=second;
        setContentView(scroll);
        if(granted) {
            host.startListening();
            manager.updateAppWidget(id,WidgetBaseProvider.views(this,id,variant,true));
        }
        final int action=getIntent().getIntExtra("testAction",-1);
        final int target=action==0?R.id.action_open:
            action==1?R.id.action_capture:action==2?R.id.action_sync:
            action==3?R.id.action_session:action==4?R.id.recent_area:0;
        if(target!=0 && (action!=2 || variant==2) && (action!=3 || variant>=1)) {
            widget.postDelayed(()->{
                View control=widget.findViewById(target);
                Log.i(TAG,"Action="+action+" targetPresent="+(control!=null)+
                         " clickEnabled="+(control!=null && control.isClickable()));
                if(control!=null) {
                    boolean dispatched=control.performClick();
                    Log.i(TAG,"Action click dispatched="+dispatched);
                    if(action==3) widget.postDelayed(()->Log.i(TAG,
                        "Session active="+WidgetSession.isActive(this)),750);
                    if(twinView!=null)widget.postDelayed(()->{
                        TextView status=twinView.findViewById(R.id.action_session);
                        Log.i(TAG,"Second widget session="+(status==null?"missing":status.getText()));
                    },1600);
                }
            },1200);
        }
    }
    @Override protected void onDestroy() {
        if(host!=null) {
            host.stopListening();
            if(twinId!=AppWidgetManager.INVALID_APPWIDGET_ID)host.deleteAppWidgetId(twinId);
            if(id!=AppWidgetManager.INVALID_APPWIDGET_ID) host.deleteAppWidgetId(id);
        }
        super.onDestroy();
    }
}
