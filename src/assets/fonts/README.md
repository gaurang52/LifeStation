# LifeStation Brand Fonts

**Tagline font (per brand guidelines):** Open Sans - Regular

1. Download [Open Sans](https://fonts.google.com/specimen/Open+Sans) from Google Fonts.
2. Add `OpenSans-Regular.ttf` to this folder.
3. Link the font:
   - **iOS:** Add the font file to the Xcode project and add `OpenSans-Regular.ttf` to the `UIAppFonts` array in `ios/Lifestation/Info.plist`.
   - **Android:** Copy the font to `android/app/src/main/assets/fonts/` and rebuild.

The Welcome screen tagline "MEDICAL ALERT SYSTEMS" uses `fontFamily: 'OpenSans-Regular'` when linked.
