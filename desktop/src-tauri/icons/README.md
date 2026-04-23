# Icons

Drop your app icons in this directory. Tauri expects:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png`
- `icon.ico` (Windows)
- `icon.icns` (macOS — optional if Windows-only)
- `icon.png` (tray icon)

You can generate the full set from a single 1024×1024 PNG by running:

```powershell
pnpm tauri icon path/to/source-icon.png
```

The placeholder generation step is also done automatically the first time
you run `pnpm tauri build` if these files don't exist.
