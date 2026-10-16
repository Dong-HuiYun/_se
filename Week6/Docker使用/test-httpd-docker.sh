#!/usr/bin/bash

if test $UID -ne 0
then
  echo "change to root first"
  exit
fi

for i in {1..3}
do
  docker run -d --name web$i -p 808$i:80 httpd
done