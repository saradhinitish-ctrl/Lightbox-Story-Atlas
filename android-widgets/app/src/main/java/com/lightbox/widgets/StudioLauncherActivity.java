package com.lightbox.widgets;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Reliable native Lightbox launcher. The previous TWA-only activity could hand
 * control to the chosen browser and immediately disappear on some devices.
 * A native shell remains open even if the website or browser fails to load.
 *
 * This WebView intentionally has its own site storage. Do not claim that projects
 * in Chrome magically migrate into it: export/import a backup when switching.
 */
public final class StudioLauncherActivity extends Activity {
    public static final String EXTRA_OPEN_SYNC = "com.lightbox.widgets.OPEN_SYNC";
    private static final String STUDIO = "https://lightbox-studio.vercel.app/";
    private static final String HOST = "lightbox-studio.vercel.app";
    private static final int PICK_FILE = 712;
    private static final int PAPER = Color.rgb(239,237,230);
    private static final int INK = Color.rgb(24,25,22);
    private static final int LIME = Color.rgb(198,255,0);

    private LinearLayout shell;
    private WebView web;
    private LinearLayout failure;
    private ValueCallback<Uri[]> fileCallback;

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private TextView label(String value, int size, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(INK);
        t.setGravity(Gravity.CENTER_VERTICAL);
        t.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        return t;
    }

    private Button action(String text, boolean accent, Runnable callback) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setText(text);
        b.setTextSize(12);
        b.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        b.setTextColor(INK);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(accent ? LIME : PAPER));
        b.setMinHeight(dp(44));
        b.setOnClickListener(v -> callback.run());
        return b;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(PAPER);
        getWindow().setNavigationBarColor(PAPER);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        shell = new LinearLayout(this);
        shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(PAPER);
        // Android 15+ enforces edge-to-edge on new targets. Protect all controls.
        shell.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                shell.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                shell.setPadding(0, insets.getSystemWindowInsetTop(), 0, insets.getSystemWindowInsetBottom());
            }
            return insets;
        });

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(12), dp(4), dp(8), dp(4));
        toolbar.setBackgroundColor(PAPER);
        TextView title = label("LIGHTBOX / STUDIO", 13, true);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
        Button chrome = action("CHROME", false, this::openInChrome);
        toolbar.addView(chrome, new LinearLayout.LayoutParams(dp(86), dp(46)));
        Button widgets = action("WIDGETS", true, this::openWidgets);
        toolbar.addView(widgets, new LinearLayout.LayoutParams(dp(92), dp(46)));
        shell.addView(toolbar, new LinearLayout.LayoutParams(-1, dp(58)));

        View line = new View(this);
        line.setBackgroundColor(INK);
        shell.addView(line, new LinearLayout.LayoutParams(-1, dp(2)));

        web = new WebView(this);
        web.setBackgroundColor(PAPER);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        if (android.os.Build.VERSION.SDK_INT >= 26) settings.setSafeBrowsingEnabled(true);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return handleNavigation(request.getUrl().toString());
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileCallback = null;
                    return false;
                }
            }
        });
        shell.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));

        failure = new LinearLayout(this);
        failure.setOrientation(LinearLayout.VERTICAL);
        failure.setGravity(Gravity.CENTER);
        failure.setPadding(dp(24), dp(40), dp(24), dp(40));
        failure.setVisibility(View.GONE);
        TextView warning = label("Lightbox couldn't load the studio.\nCheck your internet connection, or open your existing browser workspace.", 17, false);
        failure.addView(warning, new LinearLayout.LayoutParams(-1, -2));
        failure.addView(action("RETRY STUDIO", true, () -> {
            failure.setVisibility(View.GONE);
            web.setVisibility(View.VISIBLE);
            web.loadUrl(STUDIO);
        }), new LinearLayout.LayoutParams(-1, dp(60)));
        failure.addView(action("OPEN IN CHROME", false, this::openInChrome),
            new LinearLayout.LayoutParams(-1, dp(60)));
        shell.addView(failure, new LinearLayout.LayoutParams(-1, 0, 1));

        setContentView(shell);
        web.loadUrl(getIntent().getBooleanExtra(EXTRA_OPEN_SYNC,false)
                    ? STUDIO+"widgets.html" : STUDIO);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if(web!=null && intent.getBooleanExtra(EXTRA_OPEN_SYNC,false)) {
            web.loadUrl(STUDIO+"widgets.html");
        }
    }

    /** Handle only our explicit, user-clicked native widget actions. */
    private boolean handleNavigation(String target) {
        if (target.startsWith("intent://")) {
            try {
                Intent parsed = Intent.parseUri(target, Intent.URI_INTENT_SCHEME);
                Uri data = parsed.getData();
                return handleWidgetUri(data);
            } catch (Exception ignored) {
                Toast.makeText(this, "Unable to open that widget action", Toast.LENGTH_SHORT).show();
                return true;
            }
        }
        Uri uri = Uri.parse(target);
        if ("lightboxwidget".equals(uri.getScheme())) return handleWidgetUri(uri);
        String scheme = uri.getScheme();
        if ("https".equals(scheme) && HOST.equalsIgnoreCase(uri.getHost())) return false;
        if ("https".equals(scheme) || "http".equals(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
            } catch (ActivityNotFoundException e) {
                Toast.makeText(this, "No browser available to open this link", Toast.LENGTH_LONG).show();
            }
            return true;
        }
        return "intent".equals(scheme);
    }

    private boolean handleWidgetUri(Uri uri) {
        if (uri == null || !"lightboxwidget".equals(uri.getScheme())) return true;
        if ("manager".equals(uri.getHost())) {
            openWidgets();
        } else if ("sync".equals(uri.getHost())) {
            boolean synced = WidgetState.accept(this, uri);
            if (synced) {
                Toast.makeText(this, "Story synced to Android widgets", Toast.LENGTH_SHORT).show();
                openWidgets();
            } else {
                Toast.makeText(this, "Select a story before syncing", Toast.LENGTH_SHORT).show();
            }
        }
        return true;
    }

    private void showError() {
        web.setVisibility(View.GONE);
        failure.setVisibility(View.VISIBLE);
    }

    private void openWidgets() {
        startActivity(new Intent(this, WidgetHubActivity.class));
    }

    private void openInChrome() {
        try {
            Intent browse = new Intent(Intent.ACTION_VIEW, Uri.parse(STUDIO));
            browse.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(browse);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "No browser is installed", Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        }
    }

    @Override public void onBackPressed() {
        if (web != null && web.getVisibility() == View.VISIBLE && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (web != null) {
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
