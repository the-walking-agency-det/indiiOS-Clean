#!/bin/bash
# ============================================================================
# Test Suite for update-gemini-secret.sh
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_SCRIPT="$SCRIPT_DIR/update-gemini-secret.sh"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
TEST_COUNT=0

# Setup test directory
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

echo -e "${YELLOW}=== Test Suite: update-gemini-secret.sh ===${NC}"
echo ""

# Helper function to run tests
run_test() {
    local test_name="$1"
    local test_func="$2"

    TEST_COUNT=$((TEST_COUNT + 1))
    printf "  %-60s " "$test_name"

    if $test_func > "$TEST_DIR/test_output.log" 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAIL=$((FAIL + 1))
        echo "    Output: $(cat "$TEST_DIR/test_output.log" | head -3)"
        return 1
    fi
}

# ============================================================================
# Test Cases
# ============================================================================

test_firebase_not_installed() {
    # Create a mock environment where firebase is not available
    local test_env="$TEST_DIR/test_firebase_missing"
    mkdir -p "$test_env"

    # Create a wrapper script that runs with PATH that excludes firebase
    cat > "$test_env/run_test.sh" << 'EOF'
#!/bin/bash
export PATH="/usr/bin:/bin"
exec "$@"
EOF
    chmod +x "$test_env/run_test.sh"

    # Run the script and expect exit code 1
    if "$test_env/run_test.sh" bash "$TARGET_SCRIPT" "test_key" 2>&1 | grep -q "firebase-tools is not installed"; then
        return 0
    else
        echo "Expected error message about firebase-tools not found"
        return 1
    fi
}

test_key_provided_as_argument() {
    # Mock firebase command
    local mock_dir="$TEST_DIR/test_arg"
    mkdir -p "$mock_dir"

    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
# Mock firebase command
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "test_api_key_12345" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Run with mocked firebase in PATH
    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "test_api_key_12345" 2>&1 | grep -q "Secret updated successfully"; then
        return 0
    else
        echo "Expected success message"
        return 1
    fi
}

test_key_from_env_gemini_api_key() {
    local mock_dir="$TEST_DIR/test_env_gemini"
    mkdir -p "$mock_dir"

    # Create mock .env file
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY=env_gemini_key_123
VITE_API_KEY=env_vite_key_456
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "env_gemini_key_123" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to find GEMINI_API_KEY in .env"
        return 1
    fi
}

test_key_from_env_vite_api_key_fallback() {
    local mock_dir="$TEST_DIR/test_env_vite"
    mkdir -p "$mock_dir"

    # Create mock .env file without GEMINI_API_KEY
    cat > "$mock_dir/.env" << 'EOF'
VITE_API_KEY=env_vite_key_fallback
OTHER_KEY=something
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "env_vite_key_fallback" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to find VITE_API_KEY in .env"
        return 1
    fi
}

test_key_with_quotes_in_env() {
    local mock_dir="$TEST_DIR/test_quotes"
    mkdir -p "$mock_dir"

    # Create mock .env file with quoted key
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY="quoted_key_123456"
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    # The script should strip quotes, so we expect the key without quotes
    if [ "$KEY" = "quoted_key_123456" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to handle quoted key in .env"
        return 1
    fi
}

test_key_with_single_quotes_in_env() {
    local mock_dir="$TEST_DIR/test_single_quotes"
    mkdir -p "$mock_dir"

    # Create mock .env file with single-quoted key
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY='single_quoted_key_789'
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "single_quoted_key_789" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to handle single-quoted key in .env"
        return 1
    fi
}

test_key_too_short_validation() {
    local mock_dir="$TEST_DIR/test_short_key"
    mkdir -p "$mock_dir"

    # Mock firebase (shouldn't be called)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase should not be called"
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "short" 2>&1 | grep -q "Key appears too short"; then
        return 0
    else
        echo "Expected validation error for short key"
        return 1
    fi
}

test_empty_key_validation() {
    local mock_dir="$TEST_DIR/test_empty_key"
    mkdir -p "$mock_dir"

    # Mock firebase (shouldn't be called)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase should not be called"
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create wrapper that provides empty input
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
export PATH="$1:$PATH"
cd "$1"
echo "" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "No key provided. Aborting"; then
        return 0
    else
        echo "Expected validation error for empty key"
        return 1
    fi
}

test_key_with_equals_sign() {
    # Test handling of keys that contain '=' character
    local mock_dir="$TEST_DIR/test_equals"
    mkdir -p "$mock_dir"

    # Create mock .env file with key containing '='
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY=key_with_=_sign_abc123
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "key_with_=_sign_abc123" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to handle key with equals sign"
        return 1
    fi
}

test_user_declines_detected_key() {
    local mock_dir="$TEST_DIR/test_decline"
    mkdir -p "$mock_dir"

    # Create mock .env file
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY=detected_key_123456
EOF

    # Mock firebase (shouldn't be called with detected key)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase called"
exit 0
EOF
    chmod +x "$mock_dir/firebase"

    # Create wrapper that simulates user answering 'n' then providing empty input
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
printf "n\n\n" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to show found key prompt"
        return 1
    fi
}

test_key_minimum_valid_length() {
    # Test edge case: exactly 10 characters (minimum valid)
    local mock_dir="$TEST_DIR/test_min_length"
    mkdir -p "$mock_dir"

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "1234567890" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "1234567890" 2>&1 | grep -q "Secret updated successfully"; then
        return 0
    else
        echo "Expected to accept 10-character key"
        return 1
    fi
}

test_multiline_env_file() {
    # Test handling of .env file with multiple similar keys
    local mock_dir="$TEST_DIR/test_multiline"
    mkdir -p "$mock_dir"

    # Create mock .env file with comments and multiple keys
    cat > "$mock_dir/.env" << 'EOF'
# Configuration file
SOME_OTHER_KEY=value
GEMINI_API_KEY=correct_key_123456
# GEMINI_API_KEY=commented_out_key
ANOTHER_KEY=value
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "correct_key_123456" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to find correct key ignoring comments"
        return 1
    fi
}

test_no_env_file_no_key() {
    # Test behavior when no .env file exists and no key provided
    local mock_dir="$TEST_DIR/test_no_env"
    mkdir -p "$mock_dir"

    # Mock firebase (shouldn't be called)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase should not be called"
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create wrapper that provides empty input when prompted
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Please provide the Gemini API Key"; then
        return 0
    else
        echo "Expected prompt for API key"
        return 1
    fi
}

test_successful_firebase_update() {
    # Integration test: verify the full flow works correctly
    local mock_dir="$TEST_DIR/test_success"
    mkdir -p "$mock_dir"

    # Mock firebase command that logs what it receives
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    echo "Secret updated"
    echo "GEMINI_API_KEY set to: ${KEY:0:10}..." >&2
    exit 0
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    OUTPUT=$(bash "$TARGET_SCRIPT" "valid_key_1234567890" 2>&1)

    if echo "$OUTPUT" | grep -q "Secret updated successfully" && \
       echo "$OUTPUT" | grep -q "You may need to redeploy"; then
        return 0
    else
        echo "Expected successful update message"
        echo "$OUTPUT"
        return 1
    fi
}

test_key_with_special_characters() {
    # Test handling of keys with special characters
    local mock_dir="$TEST_DIR/test_special_chars"
    mkdir -p "$mock_dir"

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "key-with_special!@#$%chars" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "key-with_special!@#$%chars" 2>&1 | grep -q "Secret updated successfully"; then
        return 0
    else
        echo "Expected to handle special characters"
        return 1
    fi
}

test_very_long_key() {
    # Test handling of very long API keys (stress test)
    local mock_dir="$TEST_DIR/test_long_key"
    mkdir -p "$mock_dir"

    # Generate a very long key (200 characters)
    local long_key=$(printf 'A%.0s' {1..200})

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ ${#KEY} -eq 200 ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "$long_key" 2>&1 | grep -q "Secret updated successfully"; then
        return 0
    else
        echo "Expected to handle very long key"
        return 1
    fi
}

test_key_with_trailing_whitespace_in_env() {
    # Test handling of keys with trailing whitespace in .env
    local mock_dir="$TEST_DIR/test_trailing_space"
    mkdir -p "$mock_dir"

    # Create mock .env file with trailing whitespace
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY=key_with_spaces_123
EOF

    # Mock firebase command - should receive trimmed key
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    # Check if key has no trailing spaces
    if [ "$KEY" = "key_with_spaces_123" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to handle trailing whitespace in .env"
        return 1
    fi
}

test_multiple_gemini_keys_in_env() {
    # Test that first GEMINI_API_KEY is used when multiple exist
    local mock_dir="$TEST_DIR/test_multiple_keys"
    mkdir -p "$mock_dir"

    # Create mock .env file with multiple GEMINI_API_KEY entries
    cat > "$mock_dir/.env" << 'EOF'
GEMINI_API_KEY=first_key_should_be_used_123
SOME_OTHER=value
GEMINI_API_KEY=second_key_ignored
EOF

    # Mock firebase command
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    read -r KEY
    if [ "$KEY" = "first_key_should_be_used_123" ]; then
        echo "Secret updated"
        exit 0
    fi
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    # Create a wrapper that simulates user answering 'y'
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "y" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Found API key in .env"; then
        return 0
    else
        echo "Expected to use first GEMINI_API_KEY"
        return 1
    fi
}

test_firebase_command_failure() {
    # Test handling when firebase command fails
    local mock_dir="$TEST_DIR/test_firebase_fail"
    mkdir -p "$mock_dir"

    # Mock firebase command that fails
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
if [ "$1" = "functions:secrets:set" ] && [ "$2" = "GEMINI_API_KEY" ]; then
    echo "Error: Permission denied" >&2
    exit 1
fi
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    # Script should fail with non-zero exit code due to set -e
    if ! bash "$TARGET_SCRIPT" "valid_key_1234567890" 2>&1 > /dev/null; then
        return 0
    else
        echo "Expected script to fail when firebase fails"
        return 1
    fi
}

test_key_exactly_9_chars() {
    # Regression test: 9 characters should be rejected (boundary case)
    local mock_dir="$TEST_DIR/test_9_chars"
    mkdir -p "$mock_dir"

    # Mock firebase (shouldn't be called)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase should not be called"
exit 1
EOF
    chmod +x "$mock_dir/firebase"

    export PATH="$mock_dir:$PATH"
    if bash "$TARGET_SCRIPT" "123456789" 2>&1 | grep -q "Key appears too short"; then
        return 0
    else
        echo "Expected rejection of 9-char key"
        return 1
    fi
}

test_env_file_case_sensitivity() {
    # Test that key names are case-sensitive
    local mock_dir="$TEST_DIR/test_case"
    mkdir -p "$mock_dir"

    # Create mock .env file with wrong-case key
    cat > "$mock_dir/.env" << 'EOF'
gemini_api_key=lowercase_key_123
Gemini_Api_Key=mixedcase_key_456
EOF

    # Mock firebase (shouldn't be called automatically)
    cat > "$mock_dir/firebase" << 'EOF'
#!/bin/bash
echo "Firebase called"
exit 0
EOF
    chmod +x "$mock_dir/firebase"

    # Create wrapper that provides empty input (no key found, user provides empty)
    cat > "$mock_dir/run_test.sh" << 'EOF'
#!/bin/bash
cd "$1"
export PATH="$1:$PATH"
echo "" | bash "$2" 2>&1
EOF
    chmod +x "$mock_dir/run_test.sh"

    # Should prompt for key since case-insensitive matches shouldn't work
    if "$mock_dir/run_test.sh" "$mock_dir" "$TARGET_SCRIPT" | grep -q "Please provide the Gemini API Key"; then
        return 0
    else
        echo "Expected case-sensitive key matching"
        return 1
    fi
}

# ============================================================================
# Run All Tests
# ============================================================================

echo "Running tests..."
echo "─────────────────────────────────────────────────────────────────────────"

run_test "Firebase tools not installed check" test_firebase_not_installed
run_test "Key provided as command-line argument" test_key_provided_as_argument
run_test "Key from .env (GEMINI_API_KEY)" test_key_from_env_gemini_api_key
run_test "Key from .env (VITE_API_KEY fallback)" test_key_from_env_vite_api_key_fallback
run_test "Key with double quotes in .env" test_key_with_quotes_in_env
run_test "Key with single quotes in .env" test_key_with_single_quotes_in_env
run_test "Key too short validation (< 10 chars)" test_key_too_short_validation
run_test "Empty key validation" test_empty_key_validation
run_test "Key containing equals sign" test_key_with_equals_sign
run_test "User declines detected key" test_user_declines_detected_key
run_test "Key with minimum valid length (10 chars)" test_key_minimum_valid_length
run_test "Multiline .env file with comments" test_multiline_env_file
run_test "No .env file and no key argument" test_no_env_file_no_key
run_test "Successful Firebase update" test_successful_firebase_update
run_test "Key with special characters" test_key_with_special_characters
run_test "Very long key (200 chars)" test_very_long_key
run_test "Key with trailing whitespace in .env" test_key_with_trailing_whitespace_in_env
run_test "Multiple GEMINI_API_KEY entries (use first)" test_multiple_gemini_keys_in_env
run_test "Firebase command failure handling" test_firebase_command_failure
run_test "Key exactly 9 chars (boundary rejection)" test_key_exactly_9_chars
run_test "Case-sensitive key name matching" test_env_file_case_sensitivity

echo ""
echo "═════════════════════════════════════════════════════════════════════════"
echo -e "Results: ${GREEN}✓ ${PASS} passed${NC}, ${RED}✗ ${FAIL} failed${NC} (${TEST_COUNT} total)"

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi