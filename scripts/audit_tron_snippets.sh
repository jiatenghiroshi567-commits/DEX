#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TRONCONNECT_DIR="${ROOT_DIR}/client/public/tron-connect-test"
APP_DIR="${ROOT_DIR}/client/src"
OUT_DIR="${ROOT_DIR}/reports/security"

mkdir -p "${OUT_DIR}"
TS="$(date +%Y%m%d-%H%M%S)"
REPORT="${OUT_DIR}/tron-snippet-audit-${TS}.md"

HAS_TRONCONNECT_DIR="1"
if [[ ! -d "${TRONCONNECT_DIR}" ]]; then
  HAS_TRONCONNECT_DIR="0"
fi

scan_scope() {
  local label="$1"
  local dir="$2"
  local pattern="$3"
  local limit="${4:-20}"
  local output
  output="$(rg -n --hidden -S --max-columns 220 --max-columns-preview "${pattern}" "${dir}" 2>/dev/null | head -n "${limit}" || true)"
  if [[ -n "${output}" ]]; then
    echo "DETECTED"
  else
    echo "NOT_DETECTED"
  fi
}

emit_matches() {
  local dir="$1"
  local pattern="$2"
  local limit="${3:-20}"
  local output
  output="$(rg -n --hidden -S --max-columns 220 --max-columns-preview "${pattern}" "${dir}" 2>/dev/null | head -n "${limit}" || true)"
  if [[ -n "${output}" ]]; then
    printf '%s\n' '```text' >> "${REPORT}"
    printf '%s\n' "${output}" >> "${REPORT}"
    printf '%s\n\n' '```' >> "${REPORT}"
  else
    printf '%s\n\n' '_No matches found._' >> "${REPORT}"
  fi
}

snippet_section() {
  local snippet_id="$1"
  local title="$2"
  local pattern="$3"
  local notes="$4"

  local tron_status app_status
  if [[ "${HAS_TRONCONNECT_DIR}" == "1" ]]; then
    tron_status="$(scan_scope "tron-connect-test" "${TRONCONNECT_DIR}" "${pattern}")"
  else
    tron_status="NOT_AVAILABLE"
  fi
  app_status="$(scan_scope "client/src" "${APP_DIR}" "${pattern}")"

  printf '%s\n' "## ${snippet_id} - ${title}" >> "${REPORT}"
  printf '%s\n' "" >> "${REPORT}"
  printf '%s\n' "- Pattern: \`${pattern}\`" >> "${REPORT}"
  printf '%s\n' "- tron-connect-test: **${tron_status}**" >> "${REPORT}"
  printf '%s\n' "- client/src: **${app_status}**" >> "${REPORT}"
  printf '%s\n' "- Note: ${notes}" >> "${REPORT}"
  printf '%s\n\n' "" >> "${REPORT}"

  printf '%s\n' "### Matches in tron-connect-test" >> "${REPORT}"
  if [[ "${HAS_TRONCONNECT_DIR}" == "1" ]]; then
    emit_matches "${TRONCONNECT_DIR}" "${pattern}"
  else
    printf '%s\n\n' '_Directory not present (merged into app code)._' >> "${REPORT}"
  fi
  printf '%s\n' "### Matches in client/src" >> "${REPORT}"
  emit_matches "${APP_DIR}" "${pattern}"
}

cat > "${REPORT}" <<EOF
# TRON Snippet Audit Report

- Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
- Project root: \`${ROOT_DIR}\`
- tron-connect test path: \`${TRONCONNECT_DIR}\`
- tron-connect directory present: \`${HAS_TRONCONNECT_DIR}\`
- app path: \`${APP_DIR}\`

This report checks whether indicators from snippet files 03 to 07 appear in the local integration.

EOF

snippet_section \
  "03" \
  "tron_signTransaction methods" \
  "tron_signTransaction|tron_signMessage" \
  "WalletConnect(TRON) signature methods are expected in normal TRON connection flows."

snippet_section \
  "04" \
  "WalletConnect session flow indicators" \
  "requiredNamespaces|session_delete|approval\\(|wcConnectTron|walletconnect" \
  "Presence indicates WalletConnect flow wiring, not automatically malicious."

snippet_section \
  "05" \
  "Max uint or excessive amount constants" \
  "MAX_UINT|MaxUint|0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff|100000000000" \
  "Large constants need manual review when tied to approve() calls."

snippet_section \
  "06" \
  "Spender/approve call indicators" \
  "spender|approve\\(address,uint256\\)|approve\\(|triggerSmartContract" \
  "approve() usage can be legitimate but must never use hidden spender/amount values."

snippet_section \
  "07" \
  "Hardcoded TRON addresses (including USDT contract)" \
  "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t|T[1-9A-HJ-NP-Za-km-z]{33}" \
  "Hardcoded addresses should be allowlisted and justified."

printf '%s\n' "Report generated: ${REPORT}"
