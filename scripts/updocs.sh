#!/bin/env bash

DOCDIR=./doctmp

[ -d $DOCDIR-src ] && rm -rf $DOCDIR-src
[ -d $DOCDIR-doc ] && rm -rf $DOCDIR-doc
mkdir $DOCDIR-src
mkdir $DOCDIR-doc

git clone https://github.com/billyquith/TeeGee.git -b main $DOCDIR-src --depth=1
git clone https://github.com/billyquith/TeeGee.git -b gh-pages $DOCDIR-doc --depth=1

cp -r $DOCDIR-src/src/* $DOCDIR-doc

pushd $DOCDIR-doc
git add --all --verbose
git status
if [[ "$1" == "-d" ]]; then exit 0; fi

read -p "Commit message: " MESSAGE
git commit -m "${MESSAGE:-"Update docs"}"
git push
popd

[ -d $DOCDIR-src ] && rm -rf $DOCDIR-src
[ -d $DOCDIR-doc ] && rm -rf $DOCDIR-doc

