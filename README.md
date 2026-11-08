<div align="center">

<img width="96" alt="mcloud logo" src="docs/logo.jpg" />

# mcloud

**A [Spicetify](https://spicetify.app) theme that makes Spotify look like Apple Music on the Mac.**

<img width="880" alt="mcloud in Spotify: the Apple Music sidebar, an album grid and the floating player" src="docs/screenshot.png" />

</div>

## Install

You need [Spicetify](https://spicetify.app/docs/getting-started) first. Then either pick **mcloud** in the Spicetify Marketplace, or run:

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/mcloudHQ/mcloud/main/install.sh | sh
```

**Windows** (PowerShell, *not* as administrator)

```powershell
iwr -useb https://raw.githubusercontent.com/mcloudHQ/mcloud/main/install.ps1 | iex
```

Run the same command again to update, or after a Spotify update removes the theme.

## Features

- **Apple Music layout:** a glass sidebar with your pinned and recent playlists, a library with cover art, and Liquid Glass on the player, toolbar and menus.
- **Floating player:** artwork, a scrolling title and Apple's progress bar with rolling time digits.
- **Now Playing panel:** artwork (animated covers from Apple Music or Spotify Canvas), lyrics and Playing Next beside the page.
- **Redrawn pages:** artist pages tinted with the artist's colour, search results, Home cards, mix covers and album pages in Apple Music's style.
- **Light and dark mode**, nine accent colours, Turkish and English.
- **Spicy Lyrics** works from the player and the Now Playing panel, if you have it installed.
- **Lightweight:** no downloads besides Spotify's own artwork; background work stops while the window is hidden.

<p align="center"><img width="880" alt="An artist page in mcloud: full-width photo, name and play button, Latest Release and Top Songs, the window tinted pink by the photo" src="docs/artist.png" /></p>

## Settings

Open them from **your profile (bottom left) → mcloud**, or with <kbd>⌘</kbd><kbd>⌥</kbd><kbd>,</kbd> (<kbd>Ctrl</kbd><kbd>Alt</kbd><kbd>,</kbd> on Windows). Home, albums and playlists also have a **View Options** menu on <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd><kbd>J</kbd>). Most Apple Music looks can be switched back to Spotify’s own.

## Uninstall

```sh
curl -fsSL https://raw.githubusercontent.com/mcloudHQ/mcloud/main/install.sh | sh -s -- --uninstall
```

```powershell
& ([scriptblock]::Create((iwr -useb https://raw.githubusercontent.com/mcloudHQ/mcloud/main/install.ps1))) -Uninstall
```

This brings back the theme you had before. To install a specific version, add `--ref <tag>` (`-Ref <tag>` on Windows).

<details>
<summary><b>Manual install</b></summary>

Copy `theme.js`, `user.css` and `color.ini` into `~/.config/spicetify/Themes/AppleMusicMac/` (Windows: `%APPDATA%\spicetify\Themes\AppleMusicMac\`), then run:

```sh
spicetify config current_theme AppleMusicMac color_scheme Dark inject_css 1 inject_theme_js 1
spicetify apply
```

</details>

<details>
<summary><b>Troubleshooting</b></summary>

- **The theme is gone after a Spotify update:** run the install command again.
- **"Permission denied" on Linux:** the script prints the `chmod` commands Spicetify needs. The Snap version of Spotify does not work with Spicetify.
- **Windows:** use Spotify from [spotify.com](https://www.spotify.com/download/windows/), not the Microsoft Store, and don't run PowerShell as administrator.

</details>

Built on macOS with Spotify 1.3.6 and Spicetify 2.46. If something looks wrong, please [open an issue](https://github.com/mcloudHQ/mcloud/issues) with your Spotify and Spicetify versions.

## License and thanks

[MIT](LICENSE). The embedded Inter typeface is under the [SIL Open Font License](licenses/Inter-OFL.txt).

Thanks to the Spicetify community, to [emribilemir](https://github.com/emribilemir) and [f0rknturkoglu](https://github.com/f0rknturkoglu) for their contributions, and to [m8tec](https://github.com/m8tec) for [Apple Music Animated Artworks](https://github.com/m8tec/apple-music-animated-artworks), which brings Apple's animated covers to mcloud. The glass is built on [Liquid Glass research](https://github.com/emribilemir/liquid-glass-research).

Not affiliated with Apple or Spotify.
