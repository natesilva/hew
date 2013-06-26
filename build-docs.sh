#!/bin/sh

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

cd ${DIR}
rm -rf ${DIR}/docs
${DIR}/node_modules/.bin/ndoc .
