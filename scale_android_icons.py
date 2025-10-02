#!/usr/bin/env python3
"""
Scale up Android app icons to make the RUNSTR logo appear larger in the circular mask.
This script enlarges the logo by 2x while keeping it centered on a transparent background.
"""

from PIL import Image
import os

# Define the mipmap densities and their icon sizes
DENSITIES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

# Scale factor - make logo 2x larger
SCALE_FACTOR = 2.0

def scale_icon(input_path, output_path, canvas_size):
    """
    Scale up an icon to make the logo more prominent.

    Args:
        input_path: Path to the input PNG file
        output_path: Path to save the scaled PNG file
        canvas_size: The target canvas size (e.g., 48, 72, 96, etc.)
    """
    # Open the original icon
    img = Image.open(input_path).convert('RGBA')

    # Calculate the new size for the logo (scaled up by SCALE_FACTOR)
    new_size = int(canvas_size * SCALE_FACTOR)

    # Resize the logo to be larger
    img_scaled = img.resize((new_size, new_size), Image.Resampling.LANCZOS)

    # Create a new transparent canvas at the original size
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))

    # Calculate position to center the scaled logo (it will extend beyond edges)
    offset = (canvas_size - new_size) // 2

    # Paste the scaled logo onto the canvas (centered, will be cropped by edges)
    canvas.paste(img_scaled, (offset, offset), img_scaled)

    # Save the result
    canvas.save(output_path, 'PNG', optimize=True)
    print(f"✓ Scaled {os.path.basename(input_path)} - {canvas_size}x{canvas_size}px")

def main():
    # Base path to Android resources
    base_path = 'android/app/src/main/res'

    print("🔧 Scaling Android app icons to make RUNSTR logo larger...\n")

    # Process each density
    for density, size in DENSITIES.items():
        mipmap_dir = os.path.join(base_path, f'mipmap-{density}')

        # Process both regular and round icons
        for icon_name in ['ic_launcher.png', 'ic_launcher_round.png']:
            icon_path = os.path.join(mipmap_dir, icon_name)

            if os.path.exists(icon_path):
                scale_icon(icon_path, icon_path, size)
            else:
                print(f"⚠ Warning: {icon_path} not found, skipping...")

    print("\n✅ All Android icons scaled successfully!")
    print("📱 Rebuild the Android app to see the larger RUNSTR logo.")

if __name__ == '__main__':
    main()
