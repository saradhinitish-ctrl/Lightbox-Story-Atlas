package com.lightbox.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Intent;
import android.os.Bundle;
import android.widget.*;

public final class WidgetHubActivity extends PaperActivity {
    private LinearLayout page;
    private TextView placement;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state); receive(getIntent());
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent); setIntent(intent); receive(intent);
    }
    private void receive(Intent intent) {
        boolean synced=WidgetState.accept(this,intent.getData());
        render(); WidgetState.publishPreviews(this);
        if(synced) Toast.makeText(this,"Story synced",Toast.LENGTH_SHORT).show();
    }
    private void pin(Class<?> provider) {
        AppWidgetManager host=AppWidgetManager.getInstance(this);
        boolean requested=false;
        try {
            requested=host.isRequestPinAppWidgetSupported() &&
                host.requestPinAppWidget(new ComponentName(this,provider),null,null);
        } catch(IllegalStateException | SecurityException unavailable) {
            // The launcher may change while this page is open.
        }
        placement.setText(requested?"Confirm placement on your home screen. If no prompt appears, use the home screen’s Widgets picker.":"Hold an empty area on your home screen, choose Widgets, then find Lightbox Studio.");
    }
    private void entry(String size,String title,String description,Class<?> type) {
        int kind = type == QuickProvider.class ? 0 : type == WideProvider.class ? 1 : 2;
        LinearLayout sample = column();
        sample.setGravity(android.view.Gravity.CENTER);
        sample.setPadding(dp(12),dp(12),dp(12),dp(12));
        android.graphics.drawable.GradientDrawable mat = new android.graphics.drawable.GradientDrawable();
        mat.setColor(0xffe1dfd6);
        mat.setCornerRadius(dp(18));
        sample.setBackground(mat);
        android.view.View widget = WidgetBaseProvider.views(this,0,kind,false).apply(this,sample);
        sample.setImportantForAccessibility(android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        sample.addView(widget,new LinearLayout.LayoutParams(kind == 0 ? dp(152) : -1,dp(kind == 2 ? 260 : 140)));
        add(page,sample,20);
        LinearLayout line=row();add(page,line,10);
        LinearLayout copy=column();flex(line,copy);
        add(copy,folio(size+"   /   HOME SCREEN"),0);
        add(copy,text(title,25,INK,"serif"),2);
        Button pinButton=button("Add  +",true,()->pin(type));
        pinButton.setContentDescription("Add "+title+" widget");line.addView(pinButton);
        add(page,text(description,14,SUB,"sans-serif"),3);
    }
    private void render() {
        ScrollView scroll=new ScrollView(this); page=column();
        page.setPadding(dp(24),dp(20),dp(24),dp(24));scroll.addView(page);
        LinearLayout header=row();add(page,header,0);flex(header,folio("LIGHTBOX / STUDIO"));header.addView(button("Done",false,this::finish));
        rule(page,5);add(page,text("Widget collection",38,INK,"serif"),14);
        entry("2 × 2","Quick Capture","A blank note, one tap away.",QuickProvider.class);
        entry("4 × 2","Scene Desk","Your scene and a manual session timer.",WideProvider.class);
        entry("4 × 4","Director’s Desk","Your draft, writing progress and latest idea.",LargeProvider.class);
        placement=text("Add a widget here, or find Lightbox Studio in your home screen’s Widgets picker.",14,SUB,"sans-serif");
        placement.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);
        add(page,placement,18);rule(page,22);
        WidgetState s=WidgetState.read(this);
        add(page,folio("LINKED STORY"),18);
        add(page,text(s.syncedAt==0?"No story linked":s.title,23,INK,"serif"),6);
        add(page,text("Scene and word totals refresh when you sync. Notes and session controls update on this device.",14,SUB,"sans-serif"),5);
        add(page,button("Sync a story",true,()->{
            Intent i=new Intent(this,StudioLauncherActivity.class);
            i.putExtra(StudioLauncherActivity.EXTRA_OPEN_SYNC,true);
            i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);startActivity(i);
        }),14);
        add(page,button("Open notebook",false,()->startActivity(new Intent(this,QuickCaptureActivity.class)
            .putExtra(QuickCaptureActivity.ARCHIVE,true))),4);
        install(scroll);
    }
}
