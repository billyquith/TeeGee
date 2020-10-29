#!/bin/env bash

pushd ../src
python3.8 -m http.server --cgi 8000
popd
