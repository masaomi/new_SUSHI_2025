#!/bin/bash
# Version = '20250626-142805'

set -e

HOST=`hostname`

USER=`whoami`
ROOT_DIR=${USER:0:4}_test_new_sushi_`date +"%Y%m%d"`
#SETUP_DIR='sushi_setup_script'
#COMMON_SUSHI_DIR=/misc/fgcz01/sushi/new_SUSHI_2025

#module load Dev/Ruby/3.3.7
#module load Dev/node/22.16.0

git clone git@github.com:masaomi/new_SUSHI_2025 $ROOT_DIR
cd $ROOT_DIR/backend
bundle config set --local path 'vendor/bundle'
bundle config build.mysql2 --with-ldflags="-L$(brew --prefix zstd)/lib" --with-cppflags="-I$(brew --prefix zstd)/include" --with-opt-dir="$(brew --prefix mysql)"
bundle install
#cp -r $COMMON_SUSHI_DIR/backend/vendor .
#cp -r $COMMON_SUSHI_DIR/backend/db/csv_data db/
RAILS_ENV=development bundle exec rails db:create
RAILS_ENV=development bundle exec rails db:migrate
#RAILS_ENV=development bundle exec rails runner db/import_from_csv.rb

bundle exec rspec

cd ../frontend

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

nvm use
# expected v22.16.0 (npm v10.9.2)
npm install
#cp -r $COMMON_SUSHI_DIR/frontend/node_modules .

npm test

echo ""
echo "To start your test-new-SUSHI instance"
echo " $ cd $ROOT_DIR"
echo " $ bash start-dev.sh"
echo "or"
echo " $ bash start-dev.sh 4051 4050"
echo " # bash start-dev.sh (frontend port) (backend port)"
echo ""
