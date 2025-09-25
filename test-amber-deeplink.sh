#!/bin/bash

# Test script for verifying Amber deep link configuration
echo "🔍 Testing RUNSTR deep link configuration for Amber callbacks..."
echo ""

# Test if the app can handle the callback URL
echo "Testing: runstrproject://amber-callback"
adb shell am start -W -a android.intent.action.VIEW -d "runstrproject://amber-callback?test=1&id=test123"

echo ""
echo "✅ If your app opened, deep links are configured correctly!"
echo "❌ If you got an error, deep links need to be fixed in AndroidManifest.xml"
echo ""
echo "Next steps to test Amber login:"
echo "1. Make sure Amber is installed on the device"
echo "2. Open Amber and create/import a key if you haven't already"
echo "3. Try logging in with Amber in RUNSTR"
echo "4. Watch the Metro logs for [DEBUG] messages to see the flow"