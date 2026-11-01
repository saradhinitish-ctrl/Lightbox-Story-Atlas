package com.lightbox.widgets;
import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.RemoteViews;

/**
 * Debug-only emulator testing of ACTUAL Android RemoteViews, not rasterized art.
 * --ei variant 0|1|2   --ei testAction 0=open 1=capture 2=sync 3=refresh
 */
public final class WidgetGalleryActivity extends Activity {
    private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private TextView label(String value,int size,boolean bold){
        TextView t=new TextView(this);t.setText(value);t.setTextSize(size);
        t.setTextColor(Color.rgb(24,25,22));
        t.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));return t;
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        int variant=Math.max(0,Math.min(2,getIntent().getIntExtra("variant",0)));
        int width=variant==0?165:335,height=variant==2?335:166;
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(Color.rgb(239,237,230));
        LinearLayout column=new LinearLayout(this);
        column.setGravity(Gravity.CENTER_HORIZONTAL);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setPadding(dp(17),dp(56),dp(17),dp(22));
        scroll.addView(column);
        column.addView(label("LIGHTBOX / FUNCTIONAL ANDROID QA",14,true));
        TextView heading=label(variant==0?"2 × 2   QUICK RETURN":
                                variant==1?"4 × 2   CURRENT SCENE":
                                "4 × 4   STORY IN PROGRESS",17,true);
        LinearLayout.LayoutParams textParams=new LinearLayout.LayoutParams(-2,-2);
        textParams.topMargin=dp(20);column.addView(heading,textParams);

        // This is the SAME RemoteViews hierarchy and PendingIntents used on
        // the real launcher. Showing an ImageView here would conceal broken taps.
        RemoteViews rv=WidgetBaseProvider.views(this,9500+variant,variant,true);
        View real=rv.apply(this,column);
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(dp(width),dp(height));
        params.topMargin=dp(25);column.addView(real,params);
        TextView guide=label("REAL NATIVE VIEWS • TAP BUTTONS TO TEST",11,false);
        LinearLayout.LayoutParams caption=new LinearLayout.LayoutParams(-2,-2);
        caption.topMargin=dp(20);column.addView(guide,caption);
        setContentView(scroll);

        // Optional automated tap through RemoteViews PendingIntent.
        int action=getIntent().getIntExtra("testAction",-1);
        int target=action==0?R.id.action_open:action==1?R.id.action_capture:
                   action==2?R.id.action_sync:action==3?R.id.action_refresh:0;
        if(target!=0 && (variant==2 || action<2) && (variant>=1 || action!=3)) {
            View control=real.findViewById(target);
            if(control!=null) real.postDelayed(()->control.performClick(),450);
        }
    }
}
