package com.lightbox.widgets;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;

public final class WidgetState {
    private static final String FILE = "lightbox.widget.snapshot.v1";
    public final String title, draft, scene, heading, projectId, nodeId;
    public final int words, target;
    public final long syncedAt;

    WidgetState(String title, String draft, String scene, String heading,
                String projectId, String nodeId, int words, int target, long syncedAt) {
        this.title = title; this.draft = draft; this.scene = scene;
        this.heading = heading; this.projectId = projectId; this.nodeId = nodeId;
        this.words = words; this.target = target; this.syncedAt = syncedAt;
    }

    public static WidgetState read(Context context) {
        SharedPreferences p = context.getSharedPreferences(FILE, Context.MODE_PRIVATE);
        return new WidgetState(p.getString("title", "YOUR NEXT STORY"),
            p.getString("draft", "WORK IN PROGRESS"), p.getString("scene", "--"),
            p.getString("heading", "Open Lightbox to begin."),
            p.getString("project", ""), p.getString("node", ""),
            p.getInt("words", 0), p.getInt("target", 0), p.getLong("synced", 0));
    }

    static String shortText(String s, int max) {
        if (s == null) return "";
        s = s.replaceAll("[\\p{Cntrl}\\n\\r]+", " ").trim();
        return s.length() > max ? s.substring(0, max).trim() : s;
    }

    public static boolean accept(Context context, Uri uri) {
        if (uri == null || !"lightboxwidget".equals(uri.getScheme()) || !"sync".equals(uri.getHost())) return false;
        String title = shortText(uri.getQueryParameter("title"), 72);
        if (title.isEmpty()) return false;
        String scene = shortText(uri.getQueryParameter("scene"), 6);
        String heading = shortText(uri.getQueryParameter("heading"), 110);
        String draft = shortText(uri.getQueryParameter("draft"), 40);
        String project = shortText(uri.getQueryParameter("project"), 90);
        String node = shortText(uri.getQueryParameter("node"), 90);
        int words = safeNumber(uri.getQueryParameter("words"));
        int target = safeNumber(uri.getQueryParameter("target"));
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).edit()
            .putString("title", title).putString("scene", scene.isEmpty() ? "--" : scene)
            .putString("heading", heading.isEmpty() ? "Continue your story." : heading)
            .putString("draft", draft.isEmpty() ? "WORK IN PROGRESS" : draft)
            .putString("project", project).putString("node", node)
            .putInt("words", words).putInt("target", target)
            .putLong("synced", System.currentTimeMillis()).apply();
        refreshAll(context);
        return true;
    }

    private static int safeNumber(String s) {
        try { return Math.max(0, Math.min(2_000_000, Integer.parseInt(s))); }
        catch (Exception ignored) { return 0; }
    }


    /** Android 15+ picker previews reuse the ACTUAL interactive widget layout.
     * No generated artwork or decorative screenshots.
     */
    public static void publishPreviews(Context context) {
        if(android.os.Build.VERSION.SDK_INT<35) return;
        SharedPreferences p=context.getSharedPreferences(FILE,Context.MODE_PRIVATE);
        long now=System.currentTimeMillis();
        long then=p.getLong("previewsUpdatedAt",0);
        if(now-then < 60L*60*1000) return;
        AppWidgetManager manager=AppWidgetManager.getInstance(context);
        Class<?>[] types={QuickProvider.class,WideProvider.class,LargeProvider.class};
        int successful=0;
        for(int kind=0;kind<types.length;kind++) {
            try {
                boolean ok=manager.setWidgetPreview(
                    new ComponentName(context,types[kind]),
                    android.appwidget.AppWidgetProviderInfo.WIDGET_CATEGORY_HOME_SCREEN,
                    WidgetBaseProvider.views(context,0,kind,false));
                if(ok) successful++;
            } catch(RuntimeException ignored) {
                // Some Android launchers do not implement generated previews.
                // The same real layout is also set as the XML previewLayout.
            }
        }
        if(successful>0) p.edit().putLong("previewsUpdatedAt",now).apply();
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        Class<?>[] receivers = {QuickProvider.class, WideProvider.class, LargeProvider.class};
        int[] styles = {0, 1, 2};
        for (int j = 0; j < receivers.length; j++) {
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, receivers[j]));
            for (int id : ids) WidgetBaseProvider.updateOne(context, manager, id, styles[j]);
        }
    }
}
