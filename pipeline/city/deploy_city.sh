#!/bin/bash
# usage: ./deploy_city.sh <token> "commit message"
set -e
cd /home/sandbox/london-location-lens
git config user.email "agent@instinct.com"; git config user.name "Instinct Agent"
git add -A
git commit -m "$2" | tail -1
git push "https://x-access-token:$1@github.com/Millantr97/london-location-lens.git" main
