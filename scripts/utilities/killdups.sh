#!/bin/bash

# CVPlus Global Code Duplication Analysis and Resolution System
# /killdups - Comprehensive code analysis and DRY principle enforcement
# Author: Gil Klainert
# Generated: 2025-08-28

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMP_DIR="$PROJECT_ROOT/tmp/killdups"
ANALYSIS_FILE="$TEMP_DIR/duplication_analysis.json"
REPORT_FILE="$TEMP_DIR/killdups_report.md"

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  CVPlus KILLDUPS Analysis System                 ║${NC}"
echo -e "${BLUE}║                   Advanced Code Deduplication                    ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Initialize analysis results
cat > "$ANALYSIS_FILE" <<EOF
{
  "analysis_timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "project_root": "$PROJECT_ROOT",
  "duplicate_code_blocks": [],
  "similar_functionality": [],
  "dry_violations": [],
  "misplaced_code": [],
  "recommendations": [],
  "stats": {
    "total_files_scanned": 0,
    "duplicate_blocks_found": 0,
    "similar_functions_found": 0,
    "dry_violations_found": 0,
    "misplaced_files_found": 0
  }
}
EOF

# Helper function to update analysis stats
update_stats() {
    local field=$1
    local value=$2
    jq --arg field "$field" --arg value "$value" '.stats[$field] = ($value | tonumber)' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"
}

# Helper function to add finding to analysis
add_finding() {
    local category=$1
    local finding_json=$2
    jq --arg category "$category" --argjson finding "$finding_json" '.[$category] += [$finding]' "$ANALYSIS_FILE" > "$TEMP_DIR/temp.json" && mv "$TEMP_DIR/temp.json" "$ANALYSIS_FILE"
}

echo -e "${YELLOW}[PHASE 1]${NC} Scanning codebase structure..."

# Define file patterns to include/exclude
INCLUDE_PATTERNS=("*.ts" "*.tsx" "*.js" "*.jsx" "*.vue" "*.py" "*.go" "*.rs" "*.java" "*.cpp" "*.hpp" "*.c" "*.h")
EXCLUDE_DIRS=("node_modules" "dist" "build" "lib" ".git" "coverage" "__pycache__" ".next" ".nuxt" "logs" "tmp")

# Find all relevant source files
echo -e "${BLUE}→${NC} Discovering source files..."
SOURCE_FILES=()

for pattern in "${INCLUDE_PATTERNS[@]}"; do
    while IFS= read -r -d $'\0' file; do
        # Skip excluded directories
        skip=false
        for exclude_dir in "${EXCLUDE_DIRS[@]}"; do
            if [[ "$file" == *"/$exclude_dir/"* ]] || [[ "$file" == *"$exclude_dir"* ]]; then
                skip=true
                break
            fi
        done
        
        if [[ "$skip" == false ]]; then
            SOURCE_FILES+=("$file")
        fi
    done < <(find "$PROJECT_ROOT" -name "$pattern" -type f -print0 2>/dev/null)
done

TOTAL_FILES=${#SOURCE_FILES[@]}
update_stats "total_files_scanned" "$TOTAL_FILES"

echo -e "${GREEN}✓${NC} Found $TOTAL_FILES source files to analyze"

# Phase 1: Duplicate Code Detection
echo -e "\n${YELLOW}[PHASE 2]${NC} Detecting duplicate code blocks..."

DUPLICATE_COUNT=0

# Create temporary file for duplicate detection
DUPLICATE_HASHES="$TEMP_DIR/code_hashes.txt"
> "$DUPLICATE_HASHES"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo -e "${BLUE}→${NC} Analyzing $(basename "$file")..."
        
        # Extract functions and significant code blocks (simplified approach)
        # This uses a basic approach - in production, you'd want AST-based analysis
        awk '
        BEGIN { 
            in_function = 0
            block_content = ""
            line_start = 0
        }
        /^[[:space:]]*(function|const.*=|class|interface|type|export)/ {
            if (in_function && block_content != "") {
                # Output previous block
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR-1
            }
            in_function = 1
            block_content = $0
            line_start = NR
            next
        }
        in_function {
            block_content = block_content "\n" $0
            # End function on closing brace at start of line or specific patterns
            if (/^[[:space:]]*}[[:space:]]*$/ || /^[[:space:]]*};[[:space:]]*$/) {
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR
                in_function = 0
                block_content = ""
                line_start = 0
            }
        }
        END {
            if (in_function && block_content != "") {
                printf "%s|%s|%d|%d\n", FILENAME, block_content, line_start, NR
            }
        }
        ' "$file" >> "$TEMP_DIR/blocks_temp.txt" 2>/dev/null || true
    fi
done

# Process blocks for duplicate detection
if [[ -f "$TEMP_DIR/blocks_temp.txt" ]]; then
    while IFS='|' read -r filepath content start_line end_line; do
        if [[ -n "$content" ]]; then
            # Normalize content (remove whitespace variations)
            normalized=$(echo "$content" | tr -d ' \t\n\r' | tr '[:upper:]' '[:lower:]')
            
            # Create hash of normalized content
            hash=$(echo -n "$normalized" | sha256sum | cut -d' ' -f1)
            
            # Check for minimum content length (avoid trivial matches)
            if [[ ${#normalized} -gt 50 ]]; then
                echo "$hash|$filepath|$start_line|$end_line|$normalized" >> "$DUPLICATE_HASHES"
            fi
        fi
    done < "$TEMP_DIR/blocks_temp.txt"
    
    # Find duplicates by hash
    sort "$DUPLICATE_HASHES" | uniq -d -f0 > "$TEMP_DIR/duplicates.txt" || true
    
    # Process duplicates and add to analysis
    current_hash=""
    duplicate_group=()
    
    while IFS='|' read -r hash filepath start_line end_line content; do
        if [[ -n "$hash" ]]; then
            if [[ "$hash" != "$current_hash" ]]; then
                # Process previous group if it has duplicates
                if [[ ${#duplicate_group[@]} -gt 1 ]]; then
                    DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
                    
                    # Create JSON for duplicate finding
                    group_json=$(printf '%s' "${duplicate_group[@]}" | jq -R -s 'split("\n") | map(select(length > 0) | split("|")) | map({file: .[0], start_line: (.[1] | tonumber), end_line: (.[2] | tonumber), content_hash: .[3]})')
                    
                    duplicate_finding=$(jq -n --argjson group "$group_json" --arg hash "$current_hash" '{
                        type: "exact_duplicate",
                        hash: $hash,
                        locations: $group,
                        severity: "high",
                        description: "Exact duplicate code found across multiple files"
                    }')
                    
                    add_finding "duplicate_code_blocks" "$duplicate_finding"
                fi
                
                # Start new group
                current_hash="$hash"
                duplicate_group=("$filepath|$start_line|$end_line|$hash")
            else
                duplicate_group+=("$filepath|$start_line|$end_line|$hash")
            fi
        fi
    done < "$TEMP_DIR/duplicates.txt"
    
    # Process final group
    if [[ ${#duplicate_group[@]} -gt 1 ]]; then
        DUPLICATE_COUNT=$((DUPLICATE_COUNT + 1))
        
        group_json=$(printf '%s' "${duplicate_group[@]}" | jq -R -s 'split("\n") | map(select(length > 0) | split("|")) | map({file: .[0], start_line: (.[1] | tonumber), end_line: (.[2] | tonumber), content_hash: .[3]})')
        
        duplicate_finding=$(jq -n --argjson group "$group_json" --arg hash "$current_hash" '{
            type: "exact_duplicate",
            hash: $hash,
            locations: $group,
            severity: "high",
            description: "Exact duplicate code found across multiple files"
        }')
        
        add_finding "duplicate_code_blocks" "$duplicate_finding"
    fi
fi

update_stats "duplicate_blocks_found" "$DUPLICATE_COUNT"
echo -e "${GREEN}✓${NC} Found $DUPLICATE_COUNT duplicate code blocks"

# Phase 3: Similar Functionality Detection
echo -e "\n${YELLOW}[PHASE 3]${NC} Detecting similar functionality patterns..."

SIMILAR_COUNT=0

# Look for similar function names and patterns
FUNCTION_PATTERNS="$TEMP_DIR/function_patterns.txt"
> "$FUNCTION_PATTERNS"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Extract function signatures and method names
        grep -n -E "(function|const.*=.*=>|class.*{|interface|type.*=)" "$file" 2>/dev/null | while IFS=: read -r line_num content; do
            # Extract function/method name
            name=$(echo "$content" | sed -E 's/.*\b(function|const|class|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*).*/\2/' | tr '[:upper:]' '[:lower:]')
            if [[ -n "$name" && "$name" != "$content" ]]; then
                echo "$name|$file|$line_num|$content" >> "$FUNCTION_PATTERNS"
            fi
        done
    fi
done

# Find similar function names (using fuzzy matching)
if [[ -f "$FUNCTION_PATTERNS" ]]; then
    sort "$FUNCTION_PATTERNS" | while IFS='|' read -r name1 file1 line1 content1; do
        if [[ -n "$name1" ]]; then
            # Look for similar names (basic similarity check)
            while IFS='|' read -r name2 file2 line2 content2; do
                if [[ "$file1" != "$file2" && -n "$name2" ]]; then
                    # Check for similarity (this is a simplified approach)
                    if [[ ${#name1} -gt 3 && ${#name2} -gt 3 ]]; then
                        # Basic similarity check: shared prefix/suffix or Levenshtein-like
                        prefix_len=0
                        min_len=$((${#name1} < ${#name2} ? ${#name1} : ${#name2}))
                        
                        for ((i=0; i<min_len; i++)); do
                            if [[ "${name1:$i:1}" == "${name2:$i:1}" ]]; then
                                prefix_len=$((prefix_len + 1))
                            else
                                break
                            fi
                        done
                        
                        # If significant prefix match or similar length/content
                        if [[ $prefix_len -gt 2 ]] || [[ "$name1" == *"$name2"* ]] || [[ "$name2" == *"$name1"* ]]; then
                            SIMILAR_COUNT=$((SIMILAR_COUNT + 1))
                            
                            similar_finding=$(jq -n --arg name1 "$name1" --arg file1 "$file1" --arg line1 "$line1" --arg name2 "$name2" --arg file2 "$file2" --arg line2 "$line2" '{
                                type: "similar_functionality",
                                pattern: "similar_naming",
                                locations: [
                                    {file: $file1, line: ($line1 | tonumber), function_name: $name1},
                                    {file: $file2, line: ($line2 | tonumber), function_name: $name2}
                                ],
                                severity: "medium",
                                description: "Similar function names suggest potentially duplicate functionality"
                            }')
                            
                            add_finding "similar_functionality" "$similar_finding"
                            
                            # Break to avoid too many matches for same pair
                            break
                        fi
                    fi
                fi
            done < "$FUNCTION_PATTERNS"
        fi
    done | head -20  # Limit output to avoid overwhelming results
fi

update_stats "similar_functions_found" "$SIMILAR_COUNT"
echo -e "${GREEN}✓${NC} Found $SIMILAR_COUNT potentially similar functionality patterns"

# Phase 4: DRY Principle Violation Detection
echo -e "\n${YELLOW}[PHASE 4]${NC} Detecting DRY principle violations..."

DRY_VIOLATIONS=0

# Look for repeated string literals, magic numbers, and patterns
DRY_PATTERNS="$TEMP_DIR/dry_patterns.txt"
> "$DRY_PATTERNS"

for file in "${SOURCE_FILES[@]}"; do
    if [[ -f "$file" ]]; then
        # Extract string literals and constants
        grep -n -oE '("([^"\\]|\\.)*"|'"'"'([^'"'"'\\]|\\.)*'"'"'|const\s+[A-Z_]+\s*=|[0-9]+\.[0-9]+|[0-9]{4,})' "$file" 2>/dev/null | while IFS=: read -r line_num pattern; do
            if [[ ${#pattern} -gt 8 ]]; then  # Only consider substantial patterns
                echo "$pattern|$file|$line_num" >> "$DRY_PATTERNS"
            fi
        done
    fi
done

# Find repeated patterns
if [[ -f "$DRY_PATTERNS" ]]; then
    sort "$DRY_PATTERNS" | uniq -c | while read -r count pattern_info; do
        if [[ $count -gt 2 ]]; then  # Pattern appears more than twice
            DRY_VIOLATIONS=$((DRY_VIOLATIONS + 1))
            
            pattern=$(echo "$pattern_info" | cut -d'|' -f1)
            
            # Find all locations of this pattern
            locations_json=$(grep -F "$pattern|" "$DRY_PATTERNS" | head -10 | while IFS='|' read -r pat file line; do
                jq -n --arg file "$file" --arg line "$line" '{file: $file, line: ($line | tonumber)}'
            done | jq -s .)
            
            dry_finding=$(jq -n --arg pattern "$pattern" --arg count "$count" --argjson locations "$locations_json" '{
                type: "dry_violation",
                pattern: $pattern,
                occurrences: ($count | tonumber),
                locations: $locations,
                severity: (if ($count | tonumber) > 5 then "high" else "medium" end),
                description: "Repeated literal/constant violates DRY principle"
            }')
            
            add_finding "dry_violations" "$dry_finding"
        fi
    done
fi

update_stats "dry_violations_found" "$DRY_VIOLATIONS"
echo -e "${GREEN}✓${NC} Found $DRY_VIOLATIONS DRY principle violations"

# Phase 5: Root to Submodule Migration Detection
echo -e "\n${YELLOW}[PHASE 5]${NC} Detecting code that should be moved to submodules..."

MISPLACED_COUNT=0

# Define submodule categories and their indicators
declare -A SUBMODULE_INDICATORS=(
    ["auth"]="auth|login|signin|signup|token|session|permission|user|credential"
    ["core"]="constant|util|helper|type|interface|enum|common"
    ["i18n"]="translation|locale|language|i18n|intl"
    ["multimedia"]="media|audio|video|image|upload|storage|cdn"
    ["premium"]="premium|subscription|billing|payment|stripe|paypal"
    ["public-profiles"]="profile|portfolio|public|share|networking"
    ["recommendations"]="recommend|suggest|ai|ml|llm|claude|analysis"
    ["admin"]="admin|dashboard|manage|control|monitor|stats"
    ["analytics"]="analytic|metric|track|event|report|insight"
    ["cv-processing"]="cv|resume|pdf|document|process|parse|generate"
)

# Check files in root directories (frontend, functions) for submodule-specific content
for file in "${SOURCE_FILES[@]}"; do
    if [[ "$file" == *"/frontend/"* ]] || [[ "$file" == *"/functions/"* ]]; then
        # Skip if already in packages directory
        if [[ "$file" != *"/packages/"* ]]; then
            file_content=$(cat "$file" 2>/dev/null || echo "")
            file_lower=$(echo "$file_content" | tr '[:upper:]' '[:lower:]')
            
            for module in "${!SUBMODULE_INDICATORS[@]}"; do
                indicators="${SUBMODULE_INDICATORS[$module]}"
                
                # Check if file contains module-specific keywords
                if echo "$file_lower" | grep -qE "($indicators)"; then
                    MISPLACED_COUNT=$((MISPLACED_COUNT + 1))
                    
                    misplaced_finding=$(jq -n --arg file "$file" --arg module "$module" --arg indicators "$indicators" '{
                        type: "misplaced_code",
                        file: $file,
                        suggested_module: $module,
                        confidence: "medium",
                        indicators: $indicators,
                        severity: "medium",
                        description: "Code appears to belong in specific submodule based on functionality"
                    }')
                    
                    add_finding "misplaced_code" "$misplaced_finding"
                    break  # Only suggest one module per file
                fi
            done
        fi
    fi
done

update_stats "misplaced_files_found" "$MISPLACED_COUNT"
echo -e "${GREEN}✓${NC} Found $MISPLACED_COUNT files that may need relocation"

# Generate comprehensive report
echo -e "\n${YELLOW}[PHASE 6]${NC} Generating comprehensive analysis report..."

cat > "$REPORT_FILE" <<EOF
# CVPlus Code Duplication Analysis Report
**Generated**: $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Author**: Gil Klainert  
**Tool**: /killdups - Advanced Code Deduplication System

## Executive Summary

This report analyzes the CVPlus codebase for code duplication, DRY principle violations, and architectural misalignments across the main repository and all submodules.

### Analysis Statistics
- **Total Files Scanned**: $TOTAL_FILES
- **Duplicate Code Blocks Found**: $DUPLICATE_COUNT
- **Similar Functionality Patterns**: $SIMILAR_COUNT  
- **DRY Principle Violations**: $DRY_VIOLATIONS
- **Misplaced Files**: $MISPLACED_COUNT

## Detailed Findings

EOF

# Add detailed findings from JSON
echo "### 1. Duplicate Code Blocks" >> "$REPORT_FILE"
jq -r '.duplicate_code_blocks[] | "- **" + .type + "** (" + .severity + "): " + .description + "\n  Locations: " + (.locations | map(.file + ":" + (.start_line | tostring)) | join(", "))' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No duplicate code blocks found." >> "$REPORT_FILE"

echo -e "\n### 2. Similar Functionality Patterns" >> "$REPORT_FILE"
jq -r '.similar_functionality[] | "- **" + .pattern + "** (" + .severity + "): " + .description + "\n  Functions: " + (.locations | map(.function_name + " in " + .file) | join(", "))' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No similar functionality patterns found." >> "$REPORT_FILE"

echo -e "\n### 3. DRY Principle Violations" >> "$REPORT_FILE"
jq -r '.dry_violations[] | "- **Pattern**: `" + .pattern + "` (" + (.occurrences | tostring) + " occurrences)\n  **Severity**: " + .severity + "\n  **Description**: " + .description' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No DRY violations found." >> "$REPORT_FILE"

echo -e "\n### 4. Misplaced Code" >> "$REPORT_FILE"
jq -r '.misplaced_code[] | "- **File**: " + .file + "\n  **Suggested Module**: " + .suggested_module + "\n  **Confidence**: " + .confidence + "\n  **Description**: " + .description' "$ANALYSIS_FILE" >> "$REPORT_FILE" 2>/dev/null || echo "No misplaced code found." >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

## Next Steps

This analysis has identified potential areas for code deduplication and architectural improvements. The recommended approach is:

1. **Review High-Severity Issues First**: Focus on duplicate code blocks and high-occurrence DRY violations
2. **Plan Refactoring Strategy**: Use the orchestrator subagent to create a comprehensive refactoring plan
3. **Execute with Specialists**: Deploy appropriate submodule specialist agents for implementation
4. **Validate Changes**: Ensure all modifications maintain functionality and improve maintainability

## Orchestrator Integration

To proceed with automated fixes, run:
\`\`\`bash
$SCRIPT_DIR/killdups.sh --execute-plan
\`\`\`

This will engage the orchestrator subagent to create a detailed remediation plan and coordinate specialist subagents for implementation.

---
*Generated by CVPlus KILLDUPS v1.0*
EOF

echo -e "${GREEN}✓${NC} Analysis complete! Report saved to: $REPORT_FILE"
echo -e "${BLUE}→${NC} Analysis data saved to: $ANALYSIS_FILE"

# Display summary
echo -e "\n${PURPLE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                         ANALYSIS SUMMARY                        ║${NC}"
echo -e "${PURPLE}╠══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${PURPLE}║${NC} Files Scanned:        ${GREEN}$TOTAL_FILES${NC}"
echo -e "${PURPLE}║${NC} Duplicate Blocks:     ${YELLOW}$DUPLICATE_COUNT${NC}"
echo -e "${PURPLE}║${NC} Similar Functions:    ${YELLOW}$SIMILAR_COUNT${NC}"
echo -e "${PURPLE}║${NC} DRY Violations:       ${YELLOW}$DRY_VIOLATIONS${NC}"
echo -e "${PURPLE}║${NC} Misplaced Files:      ${YELLOW}$MISPLACED_COUNT${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════════╝${NC}"

# Check if execution is requested
if [[ "${1:-}" == "--execute-plan" ]]; then
    echo -e "\n${YELLOW}[PHASE 7]${NC} Engaging orchestrator subagent for plan generation..."
    
    # Generate execution plan using the orchestrator
    node "$SCRIPT_DIR/killdups-orchestrator.js" "${2:-}"
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✓${NC} Execution plan generated successfully"
        
        # Check if auto-approval is requested
        if [[ "${2:-}" == "--auto-approve" ]]; then
            echo -e "\n${YELLOW}[PHASE 8]${NC} Auto-approved - Executing with subagent coordination..."
            node "$SCRIPT_DIR/killdups-subagent-executor.js"
            
            if [[ $? -eq 0 ]]; then
                echo -e "${GREEN}✓${NC} KILLDUPS execution completed successfully!"
            else
                echo -e "${RED}✗${NC} Subagent execution failed. Check logs for details."
            fi
        else
            echo -e "\n${BLUE}→${NC} Review the execution plan above"
            echo -e "${YELLOW}→${NC} To proceed with subagent execution, run:"
            echo -e "   ${GREEN}node $SCRIPT_DIR/killdups-subagent-executor.js${NC}"
        fi
    else
        echo -e "${RED}✗${NC} Failed to generate execution plan"
    fi
else
    echo -e "\n${BLUE}→${NC} To proceed with automated remediation, run:"
    echo -e "   ${GREEN}$0 --execute-plan${NC}"
    echo -e "   ${GREEN}$0 --execute-plan --auto-approve${NC} (for automatic execution)"
fi

echo -e "\n${GREEN}✓${NC} KILLDUPS analysis completed successfully!"