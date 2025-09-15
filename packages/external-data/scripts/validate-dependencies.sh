#!/bin/bash

# External Data Module - Dependency Validation Script
# Author: Gil Klainert
# Validates that external-data module maintains proper dependency isolation

set -e

echo "🔍 Validating External Data module dependencies..."

# Define Layer 0 (allowed) and Layer 1+ (forbidden) dependencies
LAYER_0_ALLOWED="@cvplus/logging"
LAYER_1_FORBIDDEN="@cvplus/core @cvplus/auth @cvplus/cv-processing @cvplus/multimedia @cvplus/analytics @cvplus/premium @cvplus/workflow @cvplus/i18n @cvplus/admin @cvplus/public-profiles @cvplus/recommendations @cvplus/payments @cvplus/shell"

# Check for forbidden dependencies in source files
echo "📁 Scanning source files for forbidden dependencies..."

FORBIDDEN_FOUND=false

for forbidden in $LAYER_1_FORBIDDEN; do
    if grep -r "from ['\"]$forbidden" src/ 2>/dev/null; then
        echo "❌ FORBIDDEN: Found import from $forbidden in source files"
        FORBIDDEN_FOUND=true
    fi
    if grep -r "import.*['\"]$forbidden" src/ 2>/dev/null; then
        echo "❌ FORBIDDEN: Found import from $forbidden in source files"
        FORBIDDEN_FOUND=true
    fi
done

# Check package.json dependencies
echo "📦 Checking package.json dependencies..."

if grep -q "\"@cvplus/" package.json | grep -v "@cvplus/logging"; then
    echo "❌ FORBIDDEN: Found @cvplus dependencies other than logging in package.json"
    grep "\"@cvplus/" package.json | grep -v "@cvplus/logging"
    FORBIDDEN_FOUND=true
fi

if [ "$FORBIDDEN_FOUND" = true ]; then
    echo ""
    echo "💥 DEPENDENCY VALIDATION FAILED!"
    echo "External Data module must only depend on Layer 0 modules (@cvplus/logging)"
    echo "Found forbidden dependencies on same-layer or higher-layer modules."
    exit 1
fi

echo ""
echo "✅ DEPENDENCY VALIDATION PASSED!"
echo "External Data module maintains proper dependency isolation."
echo "📊 Summary:"
echo "   - ✅ No forbidden @cvplus/* dependencies found"
echo "   - ✅ Only external libraries and Layer 0 dependencies"
echo "   - ✅ Proper architectural layer compliance"