# Subway Surfers Stability & Graphics Quick Fixes

If your game feels glitchy or looks blurry/pixelated, try these steps in order:

1. **Close background apps** to free memory and reduce stutter.
2. **Restart the device** to clear temporary resource pressure.
3. **Update GPU/system drivers or OS** so rendering bugs are patched.
4. **Clear game cache** from OS settings (not full data reset unless needed).
5. **Turn off battery saver while gaming** to avoid forced frame drops.
6. **Prefer stable frame rate over max quality** on weaker devices.
7. **Remove old logs/crash dumps** if storage is tight:
   ```bash
   ./scripts/cleanup-logs.sh .
   ```

## Notes

- This repository includes `scripts/cleanup-logs.sh` to remove common `*.log` and `*.dmp` files.
- Deleting logs can recover storage and reduce clutter, but it does not directly fix engine bugs.
