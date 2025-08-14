#!/bin/bash

# Smart Deploy - Simple wrapper for the Intelligent Firebase Deployment System
# This integrates with existing deployment scripts while providing enhanced functionality

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_usage() {
    echo -e "${BLUE}Smart Deploy - Intelligent Firebase Deployment${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -f, --full          Run full intelligent deployment (default)"
    echo "  -q, --quick         Quick deployment (skip some validations)"
    echo "  -t, --test          Test mode (validate only, no deployment)"
    echo "  -b, --batch-only    Deploy functions in batches only"
    echo "  -r, --report        Generate report only (requires previous deployment log)"
    echo "  --skip-validation   Skip pre-deployment validation"
    echo "  --skip-health       Skip health checks"
    echo "  --force             Force deployment even with warnings"
    echo ""
    echo "Examples:"
    echo "  $0                  # Full intelligent deployment"
    echo "  $0 --quick          # Quick deployment with minimal validation"
    echo "  $0 --test           # Test and validate without deploying"
    echo "  $0 --batch-only     # Deploy functions in batches only"
}

# Parse command line arguments
DEPLOYMENT_MODE="full"
SKIP_VALIDATION=false
SKIP_HEALTH=false
FORCE_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -f|--full)
            DEPLOYMENT_MODE="full"
            shift
            ;;
        -q|--quick)
            DEPLOYMENT_MODE="quick"
            shift
            ;;
        -t|--test)
            DEPLOYMENT_MODE="test"
            shift
            ;;
        -b|--batch-only)
            DEPLOYMENT_MODE="batch-only"
            shift
            ;;
        -r|--report)
            DEPLOYMENT_MODE="report-only"
            shift
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-health)
            SKIP_HEALTH=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment logic
main() {
    echo -e "${BLUE}🚀 Smart Deploy - CVPlus Intelligent Deployment${NC}"
    echo -e "Mode: ${YELLOW}$DEPLOYMENT_MODE${NC}"
    echo -e "Project: $PROJECT_ROOT"
    echo ""
    
    case $DEPLOYMENT_MODE in
        "full")
            run_full_deployment
            ;;
        "quick")
            run_quick_deployment
            ;;
        "test")
            run_test_mode
            ;;
        "batch-only")
            run_batch_only_deployment
            ;;
        "report-only")
            run_report_only
            ;;
        *)
            echo "Invalid deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac
}

run_full_deployment() {
    echo -e "${GREEN}Running full intelligent deployment...${NC}"
    
    # Check if intelligent deploy script exists
    if [[ -f "$SCRIPT_DIR/intelligent-deploy.sh" ]]; then
        exec "$SCRIPT_DIR/intelligent-deploy.sh"
    else
        echo "⚠️  Intelligent deploy script not found, falling back to existing deployment"
        fallback_to_existing_deployment
    fi
}

run_quick_deployment() {
    echo -e "${GREEN}Running quick deployment...${NC}"
    
    # Quick mode: skip extensive validation, run faster deployment
    if [[ $SKIP_VALIDATION == false ]]; then
        echo "🔍 Running basic validation..."
        node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config" || {
            echo "❌ Basic validation failed"
            exit 1
        }
    fi
    
    echo "🚀 Running deployment..."
    node "$SCRIPT_DIR/modules/deployment-engine.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config" || {
        echo "❌ Deployment failed"
        exit 1
    }
    
    if [[ $SKIP_HEALTH == false ]]; then
        echo "🏥 Running basic health checks..."
        node "$SCRIPT_DIR/modules/health-checker.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config" || {
            echo "⚠️  Some health checks failed, but deployment completed"
        }
    fi
    
    echo -e "${GREEN}✅ Quick deployment completed${NC}"
}

run_test_mode() {
    echo -e "${GREEN}Running test mode (validation only)...${NC}"
    
    echo "🔍 Pre-deployment validation..."
    node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    
    echo "📊 Quota analysis..."
    node "$SCRIPT_DIR/modules/quota-manager.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    
    echo -e "${GREEN}✅ Test mode completed - no deployment performed${NC}"
}

run_batch_only_deployment() {
    echo -e "${GREEN}Running batch-only function deployment...${NC}"
    
    # Quick validation
    echo "🔍 Basic validation..."
    node "$SCRIPT_DIR/modules/pre-deployment-validator.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config" || {
        echo "❌ Validation failed"
        exit 1
    }
    
    # Deploy only functions using existing batch script if available
    if [[ -f "$SCRIPT_DIR/deploy-batch.sh" ]]; then
        echo "📦 Using existing batch deployment..."
        exec "$SCRIPT_DIR/deploy-batch.sh"
    else
        echo "📦 Using intelligent batch deployment..."
        node "$SCRIPT_DIR/modules/deployment-engine.js" "$PROJECT_ROOT" "$SCRIPT_DIR/config"
    fi
}

run_report_only() {
    echo -e "${GREEN}Generating deployment report only...${NC}"
    
    # Find the most recent log file
    LOGS_DIR="$PROJECT_ROOT/logs/deployment"
    
    if [[ -d "$LOGS_DIR" ]]; then
        LATEST_LOG=$(find "$LOGS_DIR" -name "intelligent-deploy-*.log" -type f -exec ls -t {} + | head -n1)
        
        if [[ -n "$LATEST_LOG" ]]; then
            REPORT_FILE="$LOGS_DIR/deployment-report-$(date +%Y%m%d-%H%M%S).json"
            echo "📊 Generating report from: $LATEST_LOG"
            
            node "$SCRIPT_DIR/modules/deployment-reporter.js" "$PROJECT_ROOT" "$LATEST_LOG" "$REPORT_FILE"
            
            echo -e "${GREEN}✅ Report generated: $REPORT_FILE${NC}"
        else
            echo "❌ No deployment log files found in $LOGS_DIR"
            exit 1
        fi
    else
        echo "❌ Logs directory not found: $LOGS_DIR"
        exit 1
    fi
}

fallback_to_existing_deployment() {
    echo -e "${YELLOW}📦 Using existing deployment scripts...${NC}"
    
    # Look for existing deployment scripts in order of preference
    local existing_scripts=(
        "$SCRIPT_DIR/deploy-critical.sh"
        "$SCRIPT_DIR/strategic-deploy.sh"
        "$SCRIPT_DIR/deploy-all-functions.sh"
    )
    
    for script in "${existing_scripts[@]}"; do
        if [[ -f "$script" && -x "$script" ]]; then
            echo "🔄 Executing: $script"
            exec "$script"
        fi
    done
    
    # Final fallback to basic Firebase deployment
    echo "🔄 Falling back to basic Firebase deployment..."
    cd "$PROJECT_ROOT"
    
    # Build frontend
    echo "🔨 Building frontend..."
    cd "$PROJECT_ROOT/frontend" && npm run build
    
    # Build functions
    echo "⚡ Building functions..."
    cd "$PROJECT_ROOT/functions" && npm run build
    
    # Deploy everything
    echo "🚀 Deploying to Firebase..."
    cd "$PROJECT_ROOT" && firebase deploy
    
    echo -e "${GREEN}✅ Basic deployment completed${NC}"
}

# Check prerequisites
check_prerequisites() {
    # Check if Node.js is available
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is required but not found"
        exit 1
    fi
    
    # Check if Firebase CLI is available
    if ! command -v firebase &> /dev/null; then
        echo "❌ Firebase CLI is required but not found"
        echo "Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    # Check if we're in a Firebase project
    if [[ ! -f "$PROJECT_ROOT/firebase.json" ]]; then
        echo "❌ Not a Firebase project (firebase.json not found)"
        exit 1
    fi
    
    # Make sure we're logged into Firebase
    if ! firebase login:list &> /dev/null; then
        echo "❌ Not logged into Firebase"
        echo "Login with: firebase login"
        exit 1
    fi
}

# Run prerequisites check
check_prerequisites

# Execute main function
main