#!/bin/bash
# ============================================
# Deploy TCN Coffee Management to VPS
# Run this script from your local machine
# ============================================

VPS_IP="36.50.26.99"
VPS_USER="root"
VPS_PORT="22"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "============================================"
echo "  Deploying to VPS: ${VPS_IP}"
echo "  Project: ${PROJECT_DIR}"
echo "============================================"
echo ""

# Step 1: Upload files to VPS
echo "[1/3] Uploading files to VPS..."
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP} "mkdir -p /tmp/deploy/dist"

# Upload built frontend
scp -P ${VPS_PORT} -r "${PROJECT_DIR}/dist/"* ${VPS_USER}@${VPS_IP}:/tmp/deploy/dist/

# Upload deploy configs
scp -P ${VPS_PORT} "${PROJECT_DIR}/deploy/pocketbase.service" ${VPS_USER}@${VPS_IP}:/tmp/deploy/
scp -P ${VPS_PORT} "${PROJECT_DIR}/deploy/nginx.conf" ${VPS_USER}@${VPS_IP}:/tmp/deploy/
scp -P ${VPS_PORT} "${PROJECT_DIR}/deploy/setup-vps.sh" ${VPS_USER}@${VPS_IP}:/tmp/deploy/
scp -P ${VPS_PORT} "${PROJECT_DIR}/pb_schema.json" ${VPS_USER}@${VPS_IP}:/tmp/deploy/

echo ""
echo "[2/3] Files uploaded. Running setup script on VPS..."

# Step 2: Run setup script on VPS
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP} "chmod +x /tmp/deploy/setup-vps.sh && bash /tmp/deploy/setup-vps.sh"

echo ""
echo "[3/3] Cleaning up temp files on VPS..."
ssh -p ${VPS_PORT} ${VPS_USER}@${VPS_IP} "rm -rf /tmp/deploy"

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "============================================"
