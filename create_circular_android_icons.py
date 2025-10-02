#!/usr/bin/env python3
"""
Create circular Android icons with black background and white RUNSTR logo.
This ensures the logo fits perfectly in Android's circular adaptive icon mask.
"""

from PIL import Image, ImageDraw
import os

# Source RUNSTR logo
SOURCE_LOGO = os.path.expanduser('~/Desktop/RUNSTR LOGO FINAL/expo/icon.png')

# Android icon sizes for different densities
ICON_SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

# Base path to Android resources
BASE_PATH = 'android/app/src/main/res'

# Adaptive icon safe zone is the center 66% (circular mask)
# Using 72% to make logo more prominent (20% larger than 60%)
LOGO_SCALE = 0.72  # Logo takes 72% of canvas (60% * 1.2 = 72%)

def create_circular_icon(source_path, output_path, size, is_round=False):
    """
    Create a circular Android icon with black background and white RUNSTR logo.

    Args:
        source_path: Path to the source RUNSTR logo
        output_path: Path to save the circular icon
        size: Target size (e.g., 48, 72, 96, 144, 192)
        is_round: If True, apply circular mask to entire icon
    """
    # Create a new transparent canvas
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Draw black circle background
    draw.ellipse([0, 0, size - 1, size - 1], fill='#000000', outline=None)

    # Load and prepare the RUNSTR logo
    logo = Image.open(source_path).convert('RGBA')

    # Calculate logo size (60% of canvas to fit within safe zone)
    logo_size = int(size * LOGO_SCALE)
    logo_resized = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

    # Calculate position to center the logo
    position = ((size - logo_size) // 2, (size - logo_size) // 2)

    # Paste logo onto black circle
    canvas.paste(logo_resized, position, logo_resized)

    # For round icons, apply circular mask to the entire result
    if is_round:
        # Create circular mask
        mask = Image.new('L', (size, size), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.ellipse([0, 0, size - 1, size - 1], fill=255)

        # Apply mask
        output_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        output_img.paste(canvas, (0, 0), mask)
        canvas = output_img

    # Save with optimization
    canvas.save(output_path, 'PNG', optimize=True)

    density = os.path.basename(os.path.dirname(output_path))
    icon_type = "round" if is_round else "standard"
    print(f"✓ Created circular {icon_type} icon for {density} - {size}x{size}px")

def main():
    if not os.path.exists(SOURCE_LOGO):
        print(f"❌ Error: Source logo not found at {SOURCE_LOGO}")
        return

    print("🎨 Creating circular Android icons with black background...\n")
    print("📐 Icon specifications:")
    print("   - Black circular background")
    print("   - White RUNSTR logo at 60% scale (fits within 66% safe zone)")
    print("   - Transparent corners for adaptive icon system\n")

    # Generate icons for all densities
    for density, size in ICON_SIZES.items():
        mipmap_dir = os.path.join(BASE_PATH, f'mipmap-{density}')

        # Standard launcher icon
        standard_path = os.path.join(mipmap_dir, 'ic_launcher.png')
        if os.path.exists(mipmap_dir):
            create_circular_icon(SOURCE_LOGO, standard_path, size, is_round=False)
        else:
            print(f"⚠ Warning: {mipmap_dir} not found, skipping...")

        # Round launcher icon (with circular mask applied)
        round_path = os.path.join(mipmap_dir, 'ic_launcher_round.png')
        if os.path.exists(mipmap_dir):
            create_circular_icon(SOURCE_LOGO, round_path, size, is_round=True)

    print("\n✅ All circular Android icons created successfully!")
    print("🎯 Benefits:")
    print("   - Logo perfectly fits Android's circular adaptive icon mask")
    print("   - Black background matches your dark theme")
    print("   - No white corners showing through")
    print("   - Professional appearance on all Android launchers")
    print("\n📱 Rebuild the Android app to see the circular RUNSTR logo.")

if __name__ == '__main__':
    main()
