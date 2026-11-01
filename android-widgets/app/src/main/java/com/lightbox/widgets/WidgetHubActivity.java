package com.lightbox.widgets;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public final class WidgetHubActivity extends Activity {
    private static final int PAPER=Color.rgb(239,237,230), INK=Color.rgb(24,25,22),
        MUTED=Color.rgb(83,86,77), LIME=Color.rgb(198,255,0);
    private LinearLayout root;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        boolean synced=WidgetState.accept(this,getIntent().getData());
        render();
        WidgetState.publishPreviews(this);
        if(synced)Toast.makeText(this,"Story sent to your widgets",Toast.LENGTH_LONG).show();
    }
    @Override protected void onNewIntent(Intent intent){
        super.onNewIntent(intent);setIntent(intent);
        boolean synced=WidgetState.accept(this,intent.getData());
        render();if(synced)Toast.makeText(this,"Widgets updated",Toast.LENGTH_LONG).show();
    }

    private int px(float dp){return (int)(dp*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String message,int size,int color,boolean bold) {
        TextView t=new TextView(this);
        t.setText(message);t.setTextSize(size);t.setTextColor(color);
        t.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        t.setIncludeFontPadding(false);
        return t;
    }
    private GradientDrawable bg(int color,int stroke,int radius){
        GradientDrawable d=new GradientDrawable();
        d.setColor(color);d.setCornerRadius(px(radius));
        if(stroke!=0)d.setStroke(px(1),stroke);return d;
    }
    private void add(TextView v,int top){
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.topMargin=px(top);root.addView(v,p);
    }
    private Button button(String name, int background, int color, Runnable action) {
        Button b=new Button(this);b.setText(name);b.setAllCaps(false);
        b.setTextSize(13);b.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));
        b.setTextColor(color);b.setBackground(bg(background,INK,10));
        b.setPadding(px(14),px(12),px(14),px(12));
        b.setOnClickListener(v->action.run());
        LinearLayout.LayoutParams l=new LinearLayout.LayoutParams(-1,px(52));
        l.topMargin=px(12);root.addView(b,l);return b;
    }
    private void pin(Class<?> provider){
        AppWidgetManager m=AppWidgetManager.getInstance(this);
        if(m.isRequestPinAppWidgetSupported()){
            boolean requested=m.requestPinAppWidget(new ComponentName(this,provider),null,null);
            if(!requested)Toast.makeText(this,"Use your home screen's Widgets menu",Toast.LENGTH_LONG).show();
        }else Toast.makeText(this,"Long press your home screen → Widgets → Lightbox Widgets",Toast.LENGTH_LONG).show();
    }
    private void openSite(){
        Intent intent=new Intent(this,StudioLauncherActivity.class);
        startActivity(intent);
    }
    private void openSync(){
        startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://lightbox-studio.vercel.app/widgets.html")));
    }
    private void render(){
        ScrollView scroller=new ScrollView(this);scroller.setFillViewport(true);
        root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(px(24),px(32),px(24),px(26));root.setBackgroundColor(PAPER);
        scroller.addView(root);setContentView(scroller);
        add(text("LIGHTBOX / STUDIO",12,INK,true),0);
        add(text("Your home screen.\nYour story.",35,INK,true),27);
        add(text("Three considered home-screen formats. One active project. Pick a size, then keep the scene within reach.",14,MUTED,false),17);
        WidgetState snapshot=WidgetState.read(this);
        TextView selected=text(snapshot.syncedAt==0 ? "NO STORY SYNCED YET" :
            "CURRENT / "+snapshot.title+"\n"+snapshot.scene+"  ·  "+snapshot.words+" WORDS",12,INK,true);
        selected.setPadding(px(18),px(18),px(18),px(18));
        selected.setBackground(bg(LIME,INK,10));add(selected,25);
        add(text("01   /   QUICK RETURN",12,MUTED,true),27);
        button("ADD 2 × 2 WIDGET       ↗",INK,PAPER,()->pin(QuickProvider.class));
        add(text("02   /   CURRENT SCENE",12,MUTED,true),24);
        button("ADD 4 × 2 WIDGET       ↗",INK,PAPER,()->pin(WideProvider.class));
        add(text("03   /   STORY IN PROGRESS",12,MUTED,true),24);
        button("ADD 4 × 4 WIDGET       ↗",INK,PAPER,()->pin(LargeProvider.class));
        add(text("LINK YOUR STORY",12,MUTED,true),26);
        button("SYNC PROJECT FROM LIGHTBOX  ↗",LIME,INK,this::openSync);
        button("OPEN LIGHTBOX STUDIO  ↗",PAPER,INK,this::openSite);
        button("OPEN QUICK CAPTURE  +",PAPER,INK,()->startActivity(new Intent(this,QuickCaptureActivity.class)));
        add(text("Your installed PWA remains untouched. Only selected project metadata is copied into these widgets; screenplay contents stay in Lightbox.",11,MUTED,false),20);
    }
}
