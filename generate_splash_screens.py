#!/usr/bin/env python3
"""
Generate Android splash screen logos from the RUNSTR logo at multiple densities.
Replaces the old white "R" with the full RUNSTR logo.
"""

from PIL import Image
import os

# Source RUNSTR logo
SOURCE_LOGO = os.path.expanduser('~/Desktop/RUNSTR LOGO FINAL/expo/splash-icon.png')

# Android splash screen sizes for different densities
SPLASH_SIZES = {
    'mdpi': 300,
    'hdpi': 450,
    'xhdpi': 600,
    'xxhdpi': 900,
    'xxxhdpi': 1200
}

# Base path to Android resources
BASE_PATH = 'android/app/src/main/res'

def generate_splash_logo(source_path, output_path, size):
    """
    Generate a splash screen logo at the specified size.

    Args:
        source_path: Path to the source RUNSTR logo
        output_path: Path to save the resized splash logo
        size: Target size (square, e.g., 300, 450, 600, etc.)
    """
    # Open source logo
    img = Image.open(source_path)

    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Resize to target size with high-quality resampling
    img_resized = img.resize((size, size), Image.Resampling.LANCZOS)

    # Save with optimization
    img_resized.save(output_path, 'PNG', optimize=True)

    density = os.path.basename(os.path.dirname(output_path))
    print(f"✓ Generated splash logo for {density} - {size}x{size}px")

def main():
    if not os.path.exists(SOURCE_LOGO):
        print(f"❌ Error: Source logo not found at {SOURCE_LOGO}")
        return

    print("🎨 Generating Android splash screen logos from RUNSTR logo...\n")

    # Generate for both regular and dark mode
    for density, size in SPLASH_SIZES.items():
        # Regular mode
        regular_dir = os.path.join(BASE_PATH, f'drawable-{density}')
        regular_path = os.path.join(regular_dir, 'splashscreen_logo.png')

        if os.path.exists(regular_dir):
            generate_splash_logo(SOURCE_LOGO, regular_path, size)
        else:
            print(f"⚠ Warning: {regular_dir} not found, skipping...")

        # Dark mode
        dark_dir = os.path.join(BASE_PATH, f'drawable-night-{density}')
        dark_path = os.path.join(dark_dir, 'splashscreen_logo.png')

        if os.path.exists(dark_dir):
            generate_splash_logo(SOURCE_LOGO, dark_path, size)
        else:
            print(f"⚠ Warning: {dark_dir} not found, skipping...")

    print("\n✅ All splash screen logos generated successfully!")
    print("🚀 The splash screen will now show the full RUNSTR logo on a black background.")
    print("📱 Rebuild the Android app to see the updated splash screen.")

if __name__ == '__main__':
    main()
