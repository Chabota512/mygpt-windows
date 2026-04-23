My_GPT 4 Students — App Icons
==============================

This folder contains every size you'll ever need to set the app icon
on Windows, on the desktop, in the taskbar, in the browser tab, and
inside the app itself.

----------------------------------------------------------------------
WHAT'S IN THIS FOLDER
----------------------------------------------------------------------

  MyGPT.ico       <-- The main Windows icon. Use this everywhere on
                       Windows: desktop shortcut, taskbar, start menu,
                       PyInstaller (--icon MyGPT.ico). Contains every
                       size in one file: 16, 24, 32, 48, 64, 128, 256.
                       Background outside the circle is transparent.

  MyGPT.png       <-- 512x512 master PNG, transparent background.
                       Use for documentation, websites, the app's own
                       UI logo, README screenshots, etc.

  icon_16.png     - Notification tray, very small UI
  icon_24.png     - Toolbar
  icon_32.png     - Windows Explorer "small icons"
  icon_48.png     - Windows Explorer "medium icons" (most common)
  icon_64.png     - Windows Explorer "large icons" / browser favicon
  icon_128.png    - Windows Explorer "extra large icons" / macOS dock
  icon_256.png    - Hi-DPI Explorer view
  icon_512.png    - macOS, web preview, in-app logo
  icon_1024.png   - Master / app store / future-proof
  source.png      - Original 1024x1024 file (rectangular, no crop)
  source_round.png- Original cropped to a transparent circle


----------------------------------------------------------------------
PART 1 — USE IT FOR THE DESKTOP SHORTCUT (WINDOWS)
----------------------------------------------------------------------

The friendliest setup for non-technical users. Once done, double-clicking
the icon on the desktop opens the app with the proper graduation-cap
icon.

Step 1. Make sure the whole "app-icons" folder is copied along with the
        rest of the app onto the target PC (or onto your USB drive next
        to the app folder).

Step 2. Right-click your desktop -> New -> Shortcut.

Step 3. For "Type the location of the item", browse to whatever launches
        My_GPT on this PC. For example:
            C:\Path\to\MyGPT\start.bat
        or  C:\Path\to\MyGPT\python-backend\main.py
        Click Next.

Step 4. Type a name -- "My_GPT 4 Students" -- and click Finish.

Step 5. Right-click the new shortcut -> Properties.

Step 6. Click the "Change Icon..." button. (If a dialog says "no icons
        available", just click OK to dismiss it.)

Step 7. Click "Browse..." and navigate to:
            <your-app-folder>\app-icons\MyGPT.ico

Step 8. Pick MyGPT.ico, click Open, then OK, then OK again.

Done! The desktop, taskbar, and start menu will all show the new icon.


----------------------------------------------------------------------
PART 2 — USE IT INSIDE THE APP (BROWSER TAB + IN-APP LOGO)
----------------------------------------------------------------------

This is already wired up. The React app now uses the icon in two places:

  * Browser tab (favicon) -- /favicon.png and /favicon.ico
  * Big logo on the welcome screen and welcome card -- /app-icon.png

The icon files for the app are kept in:
    artifacts/mockup-sandbox/public/
        app-icon.png    (512x512, used in the app's UI)
        favicon.png     (64x64, browser tab)
        favicon.ico     (multi-size .ico, browser tab fallback)

If you ever change the icon design, just re-run the icon export step
below and those three files get refreshed automatically.


----------------------------------------------------------------------
PART 3 — USE IT WHEN BUNDLING WITH PYINSTALLER (.exe)
----------------------------------------------------------------------

If you turn the Python backend into a single .exe so non-technical
users don't have to install Python, point PyInstaller at the .ico file:

    pip install pyinstaller
    pyinstaller --onefile --icon app-icons\MyGPT.ico ^
                --name "MyGPT" python-backend\main.py

The resulting MyGPT.exe will already wear the icon -- no shortcut
trickery needed. You can put MyGPT.exe on the desktop directly.


----------------------------------------------------------------------
PART 4 — USE IT WITH ELECTRON / TAURI (IF YOU EVER WRAP IT)
----------------------------------------------------------------------

  * Electron (electron-builder):
        "build": {
            "win":   { "icon": "app-icons/MyGPT.ico" },
            "mac":   { "icon": "app-icons/icon_1024.png" },
            "linux": { "icon": "app-icons/icon_512.png" }
        }

  * Tauri (tauri.conf.json):
        "bundle": {
            "icon": [
                "app-icons/icon_32.png",
                "app-icons/icon_128.png",
                "app-icons/icon_256.png",
                "app-icons/icon_512.png",
                "app-icons/MyGPT.ico"
            ]
        }


----------------------------------------------------------------------
PART 5 — RE-EXPORTING THE ICONS (FOR ME, IF I CHANGE THE DESIGN)
----------------------------------------------------------------------

If you ever swap source.png for a new design, run this in the project
root to regenerate every size, the .ico, and the in-app copies:

    cd app-icons
    for s in 16 24 32 48 64 128 256 512 1024; do
        magick source_round.png -resize ${s}x${s} -background none icon_${s}.png
    done
    magick icon_16.png icon_24.png icon_32.png icon_48.png ^
           icon_64.png icon_128.png icon_256.png MyGPT.ico
    cp icon_512.png MyGPT.png
    cp icon_512.png ../artifacts/mockup-sandbox/public/app-icon.png
    cp icon_64.png  ../artifacts/mockup-sandbox/public/favicon.png
    cp MyGPT.ico    ../artifacts/mockup-sandbox/public/favicon.ico

Done!
