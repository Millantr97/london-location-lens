#!/bin/bash
# usage: ./deploy.sh <token>
set -e
cd /tmp/lens
git config user.email "agent@instinct.com"; git config user.name "Instinct Agent"
git add -A
git commit -m "Revenue model, 102 segments, units layer, rent estimates, preset color fix" | tail -1
git push "https://x-access-token:$1@github.com/Millantr97/london-location-lens.git" main
