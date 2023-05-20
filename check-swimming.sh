#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

source "${SCRIPT_DIR}/.env"

node "${SCRIPT_DIR}/index.js" 2>&1 | ts "[%Y-%m-%d %H:%M:%S]" | tee -a "${SCRIPT_DIR}/log"
