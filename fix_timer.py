import os

path = r"C:/Users/User/.gemini/antigravity/scratch/interpretation-platform/components/room/[id]/page.tsx"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Verify we are cutting the right lines
print(f"Line 111 (Index 110): {lines[110]}")
print(f"Line 119 (Index 118): {lines[118]}")
print(f"Line 120 (Index 119): {lines[119]}")

# We want to remove lines 111 to 119 (Indices 110 to 118)
# So we keep lines[:110] and lines[119:]

new_content = lines[:110] + lines[119:]

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_content)

print("File updated successfully.")
