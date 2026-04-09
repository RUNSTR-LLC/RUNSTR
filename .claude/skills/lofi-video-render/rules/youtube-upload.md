# YouTube Upload - Night Grind Radio

## Upload Command
```bash
cd ~/Desktop/lofi-channel && npm run upload "Video Title Here"
```

The upload script (`src/scripts/upload-youtube.ts`) accepts the title as `process.argv[2]`.

## Title Format
```
[Hook/Theme] | Dark Lo-fi for [Activity] | Night Grind Radio
```

### Examples
- "Escape the Permanent Underclass | Dark Lo-fi for the Grind | Night Grind Radio"
- "No Days Off | Dark Classical Lo-fi | Night Grind Radio"
- "Built Different | Dark Lo-fi Beats to Lock In | Night Grind Radio"

## Description Template
```
[Hook sentence about the video theme]

Dark classical lo-fi beats for deep focus, late-night coding, studying, and building in silence.

Tracklist:
0:00 Track Name - DarkMolty
3:38 Next Track - DarkMolty
...

All beats produced by DarkMolty
Artwork generated with AI (Caravaggio/Rembrandt chiaroscuro style)

Subscribe for more dark lo-fi: [channel link]

#lofi #darklofi #studymusic #darkacademia #focusmusic #nightgrindradio #lofihiphop #studybeats
```

## Upload Settings
- **Privacy**: Unlisted (for review), then set to Public
- **Category**: Music (10)
- **Thumbnail**: Set from `thumbnails/` after upload

## SEO Tags
Include these tags for discoverability:
```
lofi, dark lofi, study music, dark academia, focus music, night grind radio,
lofi hip hop, study beats, coding music, late night study, dark classical lofi,
concentration music, deep focus, ambient study, lo-fi beats
```

## Post-Upload Checklist
1. Verify upload succeeded (get YouTube URL)
2. Set custom thumbnail via YouTube Studio or API
3. Review video plays correctly (spot check beginning, middle, end)
4. Add to "Night Grind Radio" playlist
5. Change privacy from Unlisted to Public when ready
